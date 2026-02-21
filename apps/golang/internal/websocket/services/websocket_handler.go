package services

import (
	"context"
	"encoding/json"
	"log"
	"net/http"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/gorilla/websocket"

	mobileDomain "agrinovagraphql/server/internal/auth/features/mobile/domain"
	authServices "agrinovagraphql/server/internal/auth/services"
	"agrinovagraphql/server/internal/websocket/models"
)

// WebSocketHandler handles WebSocket connections and authentication
type WebSocketHandler struct {
	connectionManager *ConnectionManager
	tokenService      mobileDomain.TokenService
	userService       *authServices.UserService
	upgrader          websocket.Upgrader
}

// NewWebSocketHandler creates a new WebSocket handler
func NewWebSocketHandler(
	connectionManager *ConnectionManager,
	tokenService mobileDomain.TokenService,
	userService *authServices.UserService,
) *WebSocketHandler {
	return &WebSocketHandler{
		connectionManager: connectionManager,
		tokenService:      tokenService,
		userService:       userService,
		upgrader: websocket.Upgrader{
			CheckOrigin: func(r *http.Request) bool {
				// In production, implement proper origin checking
				return true
			},
			ReadBufferSize:  1024,
			WriteBufferSize: 1024,
		},
	}
}

// HandleWebSocket handles WebSocket upgrade and connection
func (h *WebSocketHandler) HandleWebSocket(c *gin.Context) {
	conn, err := h.upgrader.Upgrade(c.Writer, c.Request, nil)
	if err != nil {
		log.Printf("Failed to upgrade WebSocket connection: %v", err)
		return
	}

	// Create anonymous client initially
	client := h.connectionManager.AddClient("", "anonymous", "anonymous", "", conn)

	// Start handling messages
	go h.handleClientMessages(client)
	go h.handleClientSending(client)
}

// ... methods ...

// handleAuthentication processes authentication message
func (h *WebSocketHandler) handleAuthentication(client *models.Client, message *models.WebSocketMessage) bool {
	authData, ok := message.Data.(map[string]interface{})
	if !ok {
		log.Printf("Invalid auth data format from client %s", client.ID)
		return false
	}

	token, ok := authData["token"].(string)
	if !ok || token == "" {
		log.Printf("Missing token in auth data from client %s", client.ID)
		return false
	}

	// Remove Bearer prefix if present
	token = strings.TrimPrefix(token, "Bearer ")

	// Validate JWT token
	claims, err := h.tokenService.ValidateAccessToken(context.Background(), token)
	if err != nil {
		log.Printf("Invalid JWT token from client %s: %v", client.ID, err)
		return false
	}

	// Get user information
	user, err := h.userService.GetUserByID(claims.UserID)
	if err != nil {
		log.Printf("Failed to get user %s for client %s: %v", claims.UserID, client.ID, err)
		return false
	}

	// Update client information
	client.UserID = user.ID
	client.Username = user.Username
	client.Role = string(user.Role)
	client.Username = user.Username
	client.Role = string(user.Role)

	// Get company assignment
	assignments, err := h.userService.GetUserCompanyAssignments(user.ID)
	if err == nil && len(assignments) > 0 {
		client.CompanyID = assignments[0].CompanyID
	}
	client.SetStatus(models.ConnectionConnected)

	// Add platform information if provided
	if platform, ok := authData["platform"].(string); ok {
		client.Metadata["platform"] = platform
	}
	if deviceID, ok := authData["deviceId"].(string); ok {
		client.Metadata["deviceId"] = deviceID
	}

	log.Printf("Client %s authenticated successfully (User: %s, Role: %s)",
		client.ID, client.Username, client.Role)

	return true
}

// handleClientMessages handles incoming messages from a client
func (h *WebSocketHandler) handleClientMessages(client *models.Client) {
	defer func() {
		if r := recover(); r != nil {
			log.Printf("Panic in handleClientMessages for client %s: %v", client.ID, r)
		}
	}()

	for {
		client.Connection.SetReadDeadline(time.Now().Add(60 * time.Second))
		_, messageBytes, err := client.Connection.ReadMessage()
		if err != nil {
			if websocket.IsUnexpectedCloseError(err, websocket.CloseGoingAway, websocket.CloseAbnormalClosure) {
				log.Printf("WebSocket error for client %s: %v", client.ID, err)
			}
			break
		}

		var message models.WebSocketMessage
		if err := json.Unmarshal(messageBytes, &message); err != nil {
			log.Printf("Failed to unmarshal message from client %s: %v", client.ID, err)
			h.sendError(client, "Invalid message format")
			continue
		}

		// Update last seen
		client.UpdateLastSeen()

		// Handle different message types
		switch message.Type {
		case models.MessageTypeHeartbeat:
			h.handleHeartbeat(client, &message)
		case models.MessageTypeSubscription:
			h.handleSubscription(client, &message)
		default:
			log.Printf("Unknown message type from client %s: %s", client.ID, message.Type)
		}
	}
}

// handleClientSending handles outgoing messages to a client
func (h *WebSocketHandler) handleClientSending(client *models.Client) {
	defer func() {
		if r := recover(); r != nil {
			log.Printf("Panic in handleClientSending for client %s: %v", client.ID, r)
		}
	}()

	ticker := time.NewTicker(54 * time.Second)
	defer ticker.Stop()

	for {
		select {
		case message, ok := <-client.SendChannel:
			client.Connection.SetWriteDeadline(time.Now().Add(10 * time.Second))
			if !ok {
				client.Connection.WriteMessage(websocket.CloseMessage, []byte{})
				return
			}

			if err := client.Connection.WriteMessage(websocket.TextMessage, message); err != nil {
				log.Printf("Failed to write message to client %s: %v", client.ID, err)
				return
			}

		case <-ticker.C:
			client.Connection.SetWriteDeadline(time.Now().Add(10 * time.Second))
			if err := client.Connection.WriteMessage(websocket.PingMessage, nil); err != nil {
				log.Printf("Failed to send ping to client %s: %v", client.ID, err)
				return
			}
		}
	}
}

// handleHeartbeat processes heartbeat messages
func (h *WebSocketHandler) handleHeartbeat(client *models.Client, message *models.WebSocketMessage) {
	response := models.WebSocketMessage{
		Type:      models.MessageTypeHeartbeat,
		Timestamp: time.Now(),
		ClientID:  client.ID,
	}

	responseBytes, err := json.Marshal(response)
	if err != nil {
		log.Printf("Failed to marshal heartbeat response for client %s: %v", client.ID, err)
		return
	}

	select {
	case client.SendChannel <- responseBytes:
	default:
		log.Printf("Client %s send channel full for heartbeat", client.ID)
	}
}

// handleSubscription processes GraphQL subscription messages
func (h *WebSocketHandler) handleSubscription(client *models.Client, message *models.WebSocketMessage) {
	subscriptionData, ok := message.Data.(map[string]interface{})
	if !ok {
		h.sendError(client, "Invalid subscription data")
		return
	}

	subscriptionID, ok := subscriptionData["id"].(string)
	if !ok {
		h.sendError(client, "Missing subscription ID")
		return
	}

	subscriptionType, ok := subscriptionData["type"].(string)
	if !ok {
		h.sendError(client, "Missing subscription type")
		return
	}

	switch subscriptionType {
	case "start":
		query, ok := subscriptionData["query"].(string)
		if !ok {
			h.sendError(client, "Missing subscription query")
			return
		}

		// Add subscription to client
		client.Subscriptions[subscriptionID] = true

		log.Printf("Client %s started subscription %s: %s", client.ID, subscriptionID, query)

		// Send acknowledgment
		h.sendSubscriptionAck(client, subscriptionID)

	case "stop":
		delete(client.Subscriptions, subscriptionID)
		log.Printf("Client %s stopped subscription %s", client.ID, subscriptionID)

	default:
		h.sendError(client, "Unknown subscription type: "+subscriptionType)
	}
}

// sendError sends an error message to a client
func (h *WebSocketHandler) sendError(client *models.Client, errorMsg string) {
	message := models.WebSocketMessage{
		Type:      models.MessageTypeError,
		Data:      map[string]string{"error": errorMsg},
		Timestamp: time.Now(),
		ClientID:  client.ID,
	}

	messageBytes, err := json.Marshal(message)
	if err != nil {
		log.Printf("Failed to marshal error message for client %s: %v", client.ID, err)
		return
	}

	select {
	case client.SendChannel <- messageBytes:
	default:
		log.Printf("Client %s send channel full for error message", client.ID)
	}
}

// sendAuthSuccess sends authentication success message to a client
func (h *WebSocketHandler) sendAuthSuccess(client *models.Client) {
	message := models.WebSocketMessage{
		Type: models.MessageTypeAuth,
		Data: map[string]interface{}{
			"success":   true,
			"clientId":  client.ID,
			"userId":    client.UserID,
			"username":  client.Username,
			"role":      client.Role,
			"companyId": client.CompanyID,
			"channels":  client.GetChannels(),
		},
		Timestamp: time.Now(),
		ClientID:  client.ID,
	}

	messageBytes, err := json.Marshal(message)
	if err != nil {
		log.Printf("Failed to marshal auth success message for client %s: %v", client.ID, err)
		return
	}

	select {
	case client.SendChannel <- messageBytes:
	default:
		log.Printf("Client %s send channel full for auth success message", client.ID)
	}
}

// sendSubscriptionAck sends subscription acknowledgment to a client
func (h *WebSocketHandler) sendSubscriptionAck(client *models.Client, subscriptionID string) {
	message := models.WebSocketMessage{
		Type: models.MessageTypeSubscription,
		Data: map[string]interface{}{
			"type": "ack",
			"id":   subscriptionID,
		},
		Timestamp: time.Now(),
		ClientID:  client.ID,
	}

	messageBytes, err := json.Marshal(message)
	if err != nil {
		log.Printf("Failed to marshal subscription ack for client %s: %v", client.ID, err)
		return
	}

	select {
	case client.SendChannel <- messageBytes:
	default:
		log.Printf("Client %s send channel full for subscription ack", client.ID)
	}
}

// GetConnectionStats returns current connection statistics
func (h *WebSocketHandler) GetConnectionStats() models.ClientStatistics {
	return h.connectionManager.GetStatistics()
}

// GetAllConnections returns all current connections
func (h *WebSocketHandler) GetAllConnections() []models.ConnectionInfo {
	return h.connectionManager.GetAllConnections()
}

// BroadcastToChannel broadcasts a message to a specific channel
func (h *WebSocketHandler) BroadcastToChannel(channel models.ChannelType, event string, data interface{}) {
	h.connectionManager.BroadcastToChannel(channel, event, data)
}

// BroadcastToRole broadcasts a message to all clients with a specific role
func (h *WebSocketHandler) BroadcastToRole(role string, event string, data interface{}) {
	h.connectionManager.BroadcastToRole(role, event, data)
}

// BroadcastToUser broadcasts a message to all connections of a specific user
func (h *WebSocketHandler) BroadcastToUser(userID string, event string, data interface{}) {
	h.connectionManager.BroadcastToUser(userID, event, data)
}

// BroadcastToCompany broadcasts a message to all clients from a specific company
func (h *WebSocketHandler) BroadcastToCompany(companyID string, event string, data interface{}) {
	h.connectionManager.BroadcastToCompany(companyID, event, data)
}
