package services

import (
	"encoding/json"
	"fmt"
	"log"
	"sync"
	"time"

	"github.com/google/uuid"
	"github.com/gorilla/websocket"

	"agrinovagraphql/server/internal/websocket/models"
)

// ConnectionManager manages all WebSocket connections and channels
type ConnectionManager struct {
	clients        map[string]*models.Client
	channels       map[models.ChannelType]map[string]*models.Client
	clientsByUser  map[string]map[string]*models.Client
	clientsByRole  map[string]map[string]*models.Client
	clientsByCompany map[string]map[string]*models.Client
	mutex          sync.RWMutex
	hub            chan *models.EventBroadcast
}

// NewConnectionManager creates a new connection manager
func NewConnectionManager() *ConnectionManager {
	cm := &ConnectionManager{
		clients:          make(map[string]*models.Client),
		channels:         make(map[models.ChannelType]map[string]*models.Client),
		clientsByUser:    make(map[string]map[string]*models.Client),
		clientsByRole:    make(map[string]map[string]*models.Client),
		clientsByCompany: make(map[string]map[string]*models.Client),
		hub:              make(chan *models.EventBroadcast, 1000),
	}

	// Initialize channels
	channelTypes := []models.ChannelType{
		models.ChannelWebDashboard,
		models.ChannelMobile,
		models.ChannelSatpam,
		models.ChannelMandor,
		models.ChannelAsisten,
		models.ChannelManager,
		models.ChannelAreaManager,
		models.ChannelCompanyAdmin,
		models.ChannelSuperAdmin,
		models.ChannelGateCheck,
		models.ChannelHarvest,
		models.ChannelSystem,
		models.ChannelPKS,
	}

	for _, channelType := range channelTypes {
		cm.channels[channelType] = make(map[string]*models.Client)
	}

	// Start the broadcast hub
	go cm.runHub()

	return cm
}

// AddClient adds a new client to the connection manager
func (cm *ConnectionManager) AddClient(userID, username, role, companyID string, conn *websocket.Conn) *models.Client {
	cm.mutex.Lock()
	defer cm.mutex.Unlock()

	clientID := uuid.New().String()
	client := models.NewClient(clientID, userID, username, role, companyID, conn)

	// Add to main clients map
	cm.clients[clientID] = client

	// Add to user index
	if cm.clientsByUser[userID] == nil {
		cm.clientsByUser[userID] = make(map[string]*models.Client)
	}
	cm.clientsByUser[userID][clientID] = client

	// Add to role index
	if cm.clientsByRole[role] == nil {
		cm.clientsByRole[role] = make(map[string]*models.Client)
	}
	cm.clientsByRole[role][clientID] = client

	// Add to company index
	if cm.clientsByCompany[companyID] == nil {
		cm.clientsByCompany[companyID] = make(map[string]*models.Client)
	}
	cm.clientsByCompany[companyID][clientID] = client

	// Subscribe to appropriate channels based on role
	cm.subscribeToRoleChannels(client)

	log.Printf("Client connected: %s (User: %s, Role: %s, Company: %s)", clientID, username, role, companyID)

	return client
}

// RemoveClient removes a client from the connection manager
func (cm *ConnectionManager) RemoveClient(clientID string) {
	cm.mutex.Lock()
	defer cm.mutex.Unlock()

	client, exists := cm.clients[clientID]
	if !exists {
		return
	}

	// Remove from channels
	for channel := range client.Channels {
		if cm.channels[channel] != nil {
			delete(cm.channels[channel], clientID)
		}
	}

	// Remove from user index
	if cm.clientsByUser[client.UserID] != nil {
		delete(cm.clientsByUser[client.UserID], clientID)
		if len(cm.clientsByUser[client.UserID]) == 0 {
			delete(cm.clientsByUser, client.UserID)
		}
	}

	// Remove from role index
	if cm.clientsByRole[client.Role] != nil {
		delete(cm.clientsByRole[client.Role], clientID)
		if len(cm.clientsByRole[client.Role]) == 0 {
			delete(cm.clientsByRole, client.Role)
		}
	}

	// Remove from company index
	if cm.clientsByCompany[client.CompanyID] != nil {
		delete(cm.clientsByCompany[client.CompanyID], clientID)
		if len(cm.clientsByCompany[client.CompanyID]) == 0 {
			delete(cm.clientsByCompany, client.CompanyID)
		}
	}

	// Close send channel
	close(client.SendChannel)

	// Remove from main clients map
	delete(cm.clients, clientID)

	log.Printf("Client disconnected: %s (User: %s)", clientID, client.Username)
}

// GetClient returns a client by ID
func (cm *ConnectionManager) GetClient(clientID string) (*models.Client, bool) {
	cm.mutex.RLock()
	defer cm.mutex.RUnlock()
	
	client, exists := cm.clients[clientID]
	return client, exists
}

// GetClientsByUser returns all clients for a specific user
func (cm *ConnectionManager) GetClientsByUser(userID string) []*models.Client {
	cm.mutex.RLock()
	defer cm.mutex.RUnlock()

	clients := make([]*models.Client, 0)
	if userClients, exists := cm.clientsByUser[userID]; exists {
		for _, client := range userClients {
			clients = append(clients, client)
		}
	}
	return clients
}

// GetClientsByRole returns all clients with a specific role
func (cm *ConnectionManager) GetClientsByRole(role string) []*models.Client {
	cm.mutex.RLock()
	defer cm.mutex.RUnlock()

	clients := make([]*models.Client, 0)
	if roleClients, exists := cm.clientsByRole[role]; exists {
		for _, client := range roleClients {
			clients = append(clients, client)
		}
	}
	return clients
}

// GetClientsByCompany returns all clients from a specific company
func (cm *ConnectionManager) GetClientsByCompany(companyID string) []*models.Client {
	cm.mutex.RLock()
	defer cm.mutex.RUnlock()

	clients := make([]*models.Client, 0)
	if companyClients, exists := cm.clientsByCompany[companyID]; exists {
		for _, client := range companyClients {
			clients = append(clients, client)
		}
	}
	return clients
}

// GetClientsByChannel returns all clients subscribed to a specific channel
func (cm *ConnectionManager) GetClientsByChannel(channel models.ChannelType) []*models.Client {
	cm.mutex.RLock()
	defer cm.mutex.RUnlock()

	clients := make([]*models.Client, 0)
	if channelClients, exists := cm.channels[channel]; exists {
		for _, client := range channelClients {
			clients = append(clients, client)
		}
	}
	return clients
}

// SubscribeToChannel subscribes a client to a specific channel
func (cm *ConnectionManager) SubscribeToChannel(clientID string, channel models.ChannelType) error {
	cm.mutex.Lock()
	defer cm.mutex.Unlock()

	client, exists := cm.clients[clientID]
	if !exists {
		return fmt.Errorf("client not found: %s", clientID)
	}

	// Add to channel
	if cm.channels[channel] == nil {
		cm.channels[channel] = make(map[string]*models.Client)
	}
	cm.channels[channel][clientID] = client

	// Update client
	client.AddChannel(channel)

	log.Printf("Client %s subscribed to channel %s", clientID, channel)
	return nil
}

// UnsubscribeFromChannel unsubscribes a client from a specific channel
func (cm *ConnectionManager) UnsubscribeFromChannel(clientID string, channel models.ChannelType) error {
	cm.mutex.Lock()
	defer cm.mutex.Unlock()

	client, exists := cm.clients[clientID]
	if !exists {
		return fmt.Errorf("client not found: %s", clientID)
	}

	// Remove from channel
	if cm.channels[channel] != nil {
		delete(cm.channels[channel], clientID)
	}

	// Update client
	client.RemoveChannel(channel)

	log.Printf("Client %s unsubscribed from channel %s", clientID, channel)
	return nil
}

// Broadcast sends a message to all clients in specified channels
func (cm *ConnectionManager) Broadcast(event *models.EventBroadcast) {
	select {
	case cm.hub <- event:
	default:
		log.Println("Hub channel full, dropping message")
	}
}

// BroadcastToChannel sends a message to all clients in a specific channel
func (cm *ConnectionManager) BroadcastToChannel(channel models.ChannelType, event string, data interface{}) {
	broadcast := &models.EventBroadcast{
		Event:    event,
		Data:     data,
		Channels: []models.ChannelType{channel},
	}
	cm.Broadcast(broadcast)
}

// BroadcastToUser sends a message to all connections of a specific user
func (cm *ConnectionManager) BroadcastToUser(userID string, event string, data interface{}) {
	broadcast := &models.EventBroadcast{
		Event:   event,
		Data:    data,
		UserIDs: []string{userID},
	}
	cm.Broadcast(broadcast)
}

// BroadcastToRole sends a message to all clients with a specific role
func (cm *ConnectionManager) BroadcastToRole(role string, event string, data interface{}) {
	broadcast := &models.EventBroadcast{
		Event: event,
		Data:  data,
		Roles: []string{role},
	}
	cm.Broadcast(broadcast)
}

// BroadcastToCompany sends a message to all clients from a specific company
func (cm *ConnectionManager) BroadcastToCompany(companyID string, event string, data interface{}) {
	broadcast := &models.EventBroadcast{
		Event:      event,
		Data:       data,
		CompanyIDs: []string{companyID},
	}
	cm.Broadcast(broadcast)
}

// GetStatistics returns current connection statistics
func (cm *ConnectionManager) GetStatistics() models.ClientStatistics {
	cm.mutex.RLock()
	defer cm.mutex.RUnlock()

	stats := models.ClientStatistics{
		TotalConnections:     len(cm.clients),
		ActiveConnections:    len(cm.clients),
		ConnectionsByRole:    make(map[string]int),
		ConnectionsByChannel: make(map[models.ChannelType]int),
		ConnectionsByCompany: make(map[string]int),
		LastUpdated:         time.Now(),
	}

	// Count by role
	for role, clients := range cm.clientsByRole {
		stats.ConnectionsByRole[role] = len(clients)
	}

	// Count by channel
	for channel, clients := range cm.channels {
		stats.ConnectionsByChannel[channel] = len(clients)
	}

	// Count by company
	for companyID, clients := range cm.clientsByCompany {
		stats.ConnectionsByCompany[companyID] = len(clients)
	}

	return stats
}

// GetAllConnections returns information about all current connections
func (cm *ConnectionManager) GetAllConnections() []models.ConnectionInfo {
	cm.mutex.RLock()
	defer cm.mutex.RUnlock()

	connections := make([]models.ConnectionInfo, 0, len(cm.clients))
	for _, client := range cm.clients {
		connections = append(connections, client.GetConnectionInfo())
	}

	return connections
}

// subscribeToRoleChannels automatically subscribes a client to appropriate channels based on their role
func (cm *ConnectionManager) subscribeToRoleChannels(client *models.Client) {
	// All users get web dashboard channel
	cm.channels[models.ChannelWebDashboard][client.ID] = client
	client.AddChannel(models.ChannelWebDashboard)

	// Role-specific channels
	switch client.Role {
	case "SATPAM":
		cm.channels[models.ChannelSatpam][client.ID] = client
		cm.channels[models.ChannelGateCheck][client.ID] = client
		client.AddChannel(models.ChannelSatpam)
		client.AddChannel(models.ChannelGateCheck)
	case "MANDOR":
		cm.channels[models.ChannelMandor][client.ID] = client
		cm.channels[models.ChannelHarvest][client.ID] = client
		client.AddChannel(models.ChannelMandor)
		client.AddChannel(models.ChannelHarvest)
	case "ASISTEN":
		cm.channels[models.ChannelAsisten][client.ID] = client
		cm.channels[models.ChannelHarvest][client.ID] = client
		client.AddChannel(models.ChannelAsisten)
		client.AddChannel(models.ChannelHarvest)
	case "MANAGER":
		cm.channels[models.ChannelManager][client.ID] = client
		cm.channels[models.ChannelHarvest][client.ID] = client
		cm.channels[models.ChannelSystem][client.ID] = client
		client.AddChannel(models.ChannelManager)
		client.AddChannel(models.ChannelHarvest)
		client.AddChannel(models.ChannelSystem)
	case "AREA_MANAGER":
		cm.channels[models.ChannelAreaManager][client.ID] = client
		cm.channels[models.ChannelHarvest][client.ID] = client
		cm.channels[models.ChannelSystem][client.ID] = client
		cm.channels[models.ChannelGateCheck][client.ID] = client
		client.AddChannel(models.ChannelAreaManager)
		client.AddChannel(models.ChannelHarvest)
		client.AddChannel(models.ChannelSystem)
		client.AddChannel(models.ChannelGateCheck)
	case "COMPANY_ADMIN":
		cm.channels[models.ChannelCompanyAdmin][client.ID] = client
		cm.channels[models.ChannelSystem][client.ID] = client
		client.AddChannel(models.ChannelCompanyAdmin)
		client.AddChannel(models.ChannelSystem)
	case "SUPER_ADMIN":
		// Super admin gets access to all channels
		for channel := range cm.channels {
			cm.channels[channel][client.ID] = client
			client.AddChannel(channel)
		}
	}
}

// runHub handles the broadcast hub
func (cm *ConnectionManager) runHub() {
	for {
		select {
		case broadcast := <-cm.hub:
			cm.processBroadcast(broadcast)
		}
	}
}

// processBroadcast processes a broadcast event and sends messages to appropriate clients
func (cm *ConnectionManager) processBroadcast(broadcast *models.EventBroadcast) {
	cm.mutex.RLock()
	defer cm.mutex.RUnlock()

	targetClients := make(map[string]*models.Client)

	// Collect clients by channels
	for _, channel := range broadcast.Channels {
		if channelClients, exists := cm.channels[channel]; exists {
			for id, client := range channelClients {
				targetClients[id] = client
			}
		}
	}

	// Collect clients by user IDs
	for _, userID := range broadcast.UserIDs {
		if userClients, exists := cm.clientsByUser[userID]; exists {
			for id, client := range userClients {
				targetClients[id] = client
			}
		}
	}

	// Collect clients by roles
	for _, role := range broadcast.Roles {
		if roleClients, exists := cm.clientsByRole[role]; exists {
			for id, client := range roleClients {
				targetClients[id] = client
			}
		}
	}

	// Collect clients by company IDs
	for _, companyID := range broadcast.CompanyIDs {
		if companyClients, exists := cm.clientsByCompany[companyID]; exists {
			for id, client := range companyClients {
				targetClients[id] = client
			}
		}
	}

	// Create WebSocket message
	message := models.WebSocketMessage{
		Type:      models.MessageTypeData,
		Event:     broadcast.Event,
		Data:      broadcast.Data,
		Metadata:  broadcast.Metadata,
		Timestamp: time.Now(),
	}

	// Send message to all target clients
	messageBytes, err := json.Marshal(message)
	if err != nil {
		log.Printf("Failed to marshal broadcast message: %v", err)
		return
	}

	for _, client := range targetClients {
		select {
		case client.SendChannel <- messageBytes:
		default:
			// Client's send channel is full, close the connection
			log.Printf("Client %s send channel full, closing connection", client.ID)
			cm.RemoveClient(client.ID)
		}
	}

	log.Printf("Broadcast sent to %d clients for event: %s", len(targetClients), broadcast.Event)
}