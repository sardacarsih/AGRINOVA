package models

import (
	"sync"
	"time"

	"github.com/gorilla/websocket"
)

// ConnectionStatus represents the current status of a WebSocket connection
type ConnectionStatus string

const (
	ConnectionConnected    ConnectionStatus = "CONNECTED"
	ConnectionDisconnected ConnectionStatus = "DISCONNECTED"
	ConnectionReconnecting ConnectionStatus = "RECONNECTING"
	ConnectionError        ConnectionStatus = "ERROR"
)

// ChannelType represents different WebSocket channels for role-based messaging
type ChannelType string

const (
	// Dashboard channels
	ChannelWebDashboard ChannelType = "WEB_DASHBOARD"
	ChannelMobile       ChannelType = "MOBILE"
	
	// Role-specific channels
	ChannelSatpam      ChannelType = "SATPAM"
	ChannelMandor      ChannelType = "MANDOR"
	ChannelAsisten     ChannelType = "ASISTEN"
	ChannelManager     ChannelType = "MANAGER"
	ChannelAreaManager ChannelType = "AREA_MANAGER"
	ChannelCompanyAdmin ChannelType = "COMPANY_ADMIN"
	ChannelSuperAdmin  ChannelType = "SUPER_ADMIN"
	
	// Feature-specific channels
	ChannelGateCheck ChannelType = "GATE_CHECK"
	ChannelHarvest   ChannelType = "HARVEST"
	ChannelSystem    ChannelType = "SYSTEM"
	ChannelPKS       ChannelType = "PKS"
)

// MessageType represents the type of WebSocket message
type MessageType string

const (
	MessageTypeAuth         MessageType = "auth"
	MessageTypeSubscription MessageType = "subscription"
	MessageTypeData         MessageType = "data"
	MessageTypeError        MessageType = "error"
	MessageTypeHeartbeat    MessageType = "heartbeat"
	MessageTypeReconnect    MessageType = "reconnect"
)

// Client represents a connected WebSocket client
type Client struct {
	ID           string                 `json:"id"`
	UserID       string                 `json:"userId"`
	Username     string                 `json:"username"`
	Role         string                 `json:"role"`
	CompanyID    string                 `json:"companyId"`
	Connection   *websocket.Conn        `json:"-"`
	Channels     map[ChannelType]bool   `json:"channels"`
	LastSeen     time.Time              `json:"lastSeen"`
	Status       ConnectionStatus       `json:"status"`
	Subscriptions map[string]bool       `json:"subscriptions"`
	Metadata     map[string]interface{} `json:"metadata"`
	SendChannel  chan []byte            `json:"-"`
	mutex        sync.RWMutex           `json:"-"`
}

// WebSocketMessage represents a WebSocket message structure
type WebSocketMessage struct {
	Type      MessageType            `json:"type"`
	Channel   ChannelType            `json:"channel,omitempty"`
	Event     string                 `json:"event,omitempty"`
	Data      interface{}            `json:"data,omitempty"`
	Metadata  map[string]interface{} `json:"metadata,omitempty"`
	Timestamp time.Time              `json:"timestamp"`
	ClientID  string                 `json:"clientId,omitempty"`
	UserID    string                 `json:"userId,omitempty"`
}

// AuthMessage represents authentication data for WebSocket connection
type AuthMessage struct {
	Token        string            `json:"token"`
	Platform     string            `json:"platform"`
	DeviceID     string            `json:"deviceId,omitempty"`
	Fingerprint  string            `json:"fingerprint,omitempty"`
	ClientInfo   map[string]string `json:"clientInfo,omitempty"`
}

// SubscriptionMessage represents a GraphQL subscription request
type SubscriptionMessage struct {
	ID    string                 `json:"id"`
	Type  string                 `json:"type"`
	Query string                 `json:"query"`
	Variables map[string]interface{} `json:"variables,omitempty"`
}

// EventBroadcast represents a broadcast event to be sent to clients
type EventBroadcast struct {
	Event     string                 `json:"event"`
	Data      interface{}            `json:"data"`
	Channels  []ChannelType          `json:"channels"`
	UserIDs   []string               `json:"userIds,omitempty"`
	CompanyIDs []string              `json:"companyIds,omitempty"`
	Roles     []string               `json:"roles,omitempty"`
	Metadata  map[string]interface{} `json:"metadata,omitempty"`
}

// ConnectionInfo represents connection information
type ConnectionInfo struct {
	ClientID     string            `json:"clientId"`
	UserID       string            `json:"userId"`
	Username     string            `json:"username"`
	Role         string            `json:"role"`
	CompanyID    string            `json:"companyId"`
	ConnectedAt  time.Time         `json:"connectedAt"`
	LastActivity time.Time         `json:"lastActivity"`
	Status       ConnectionStatus  `json:"status"`
	Channels     []ChannelType     `json:"channels"`
	Metadata     map[string]interface{} `json:"metadata"`
}

// ClientStatistics represents statistics for connected clients
type ClientStatistics struct {
	TotalConnections    int                        `json:"totalConnections"`
	ActiveConnections   int                        `json:"activeConnections"`
	ConnectionsByRole   map[string]int             `json:"connectionsByRole"`
	ConnectionsByChannel map[ChannelType]int       `json:"connectionsByChannel"`
	ConnectionsByCompany map[string]int            `json:"connectionsByCompany"`
	LastUpdated         time.Time                  `json:"lastUpdated"`
}

// NewClient creates a new WebSocket client
func NewClient(id, userID, username, role, companyID string, conn *websocket.Conn) *Client {
	return &Client{
		ID:            id,
		UserID:        userID,
		Username:      username,
		Role:          role,
		CompanyID:     companyID,
		Connection:    conn,
		Channels:      make(map[ChannelType]bool),
		LastSeen:      time.Now(),
		Status:        ConnectionConnected,
		Subscriptions: make(map[string]bool),
		Metadata:      make(map[string]interface{}),
		SendChannel:   make(chan []byte, 256),
	}
}

// AddChannel adds a channel to the client's subscription list
func (c *Client) AddChannel(channel ChannelType) {
	c.mutex.Lock()
	defer c.mutex.Unlock()
	c.Channels[channel] = true
}

// RemoveChannel removes a channel from the client's subscription list
func (c *Client) RemoveChannel(channel ChannelType) {
	c.mutex.Lock()
	defer c.mutex.Unlock()
	delete(c.Channels, channel)
}

// HasChannel checks if the client is subscribed to a specific channel
func (c *Client) HasChannel(channel ChannelType) bool {
	c.mutex.RLock()
	defer c.mutex.RUnlock()
	return c.Channels[channel]
}

// GetChannels returns a list of channels the client is subscribed to
func (c *Client) GetChannels() []ChannelType {
	c.mutex.RLock()
	defer c.mutex.RUnlock()
	
	channels := make([]ChannelType, 0, len(c.Channels))
	for channel := range c.Channels {
		channels = append(channels, channel)
	}
	return channels
}

// UpdateLastSeen updates the client's last seen timestamp
func (c *Client) UpdateLastSeen() {
	c.mutex.Lock()
	defer c.mutex.Unlock()
	c.LastSeen = time.Now()
}

// SetStatus updates the client's connection status
func (c *Client) SetStatus(status ConnectionStatus) {
	c.mutex.Lock()
	defer c.mutex.Unlock()
	c.Status = status
}

// GetConnectionInfo returns connection information for this client
func (c *Client) GetConnectionInfo() ConnectionInfo {
	c.mutex.RLock()
	defer c.mutex.RUnlock()
	
	return ConnectionInfo{
		ClientID:     c.ID,
		UserID:       c.UserID,
		Username:     c.Username,
		Role:         c.Role,
		CompanyID:    c.CompanyID,
		ConnectedAt:  c.LastSeen,
		LastActivity: c.LastSeen,
		Status:       c.Status,
		Channels:     c.GetChannels(),
		Metadata:     c.Metadata,
	}
}