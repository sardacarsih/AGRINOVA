package services

import (
	"log"
	"time"

	"gorm.io/gorm"

	"agrinovagraphql/server/internal/graphql/domain/mandor"
	"agrinovagraphql/server/internal/websocket/models"
)

// EventBroadcaster handles database event broadcasting for real-time updates
type EventBroadcaster struct {
	db        *gorm.DB
	wsHandler *WebSocketHandler
}

// NewEventBroadcaster creates a new event broadcaster
func NewEventBroadcaster(
	db *gorm.DB,
	wsHandler *WebSocketHandler,
) *EventBroadcaster {
	return &EventBroadcaster{
		db:        db,
		wsHandler: wsHandler,
	}
}

// Harvest Event Broadcasting

// OnHarvestRecordCreated broadcasts when a new harvest record is created
func (eb *EventBroadcaster) OnHarvestRecordCreated(record *mandor.HarvestRecord) {
	log.Printf("Broadcasting harvest record created event: %s", record.ID)
	eb.wsHandler.BroadcastToChannel(models.ChannelHarvest, "harvestRecordCreated", record)
	eb.wsHandler.BroadcastToRole("ASISTEN", "harvestRecordCreated", record)
	eb.wsHandler.BroadcastToRole("MANAGER", "harvestRecordCreated", record)
	eb.wsHandler.BroadcastToRole("AREA_MANAGER", "harvestRecordCreated", record)
}

// OnHarvestRecordApproved broadcasts when a harvest record is approved
func (eb *EventBroadcaster) OnHarvestRecordApproved(record *mandor.HarvestRecord) {
	log.Printf("Broadcasting harvest record approved event: %s", record.ID)
	eb.wsHandler.BroadcastToChannel(models.ChannelHarvest, "harvestRecordApproved", record)
	if record.Mandor != nil {
		eb.wsHandler.BroadcastToUser(record.Mandor.ID, "harvestRecordApproved", record)
	}
	eb.wsHandler.BroadcastToRole("MANAGER", "harvestRecordApproved", record)
	eb.wsHandler.BroadcastToRole("AREA_MANAGER", "harvestRecordApproved", record)
}

// OnHarvestRecordRejected broadcasts when a harvest record is rejected
func (eb *EventBroadcaster) OnHarvestRecordRejected(record *mandor.HarvestRecord) {
	log.Printf("Broadcasting harvest record rejected event: %s", record.ID)
	eb.wsHandler.BroadcastToChannel(models.ChannelHarvest, "harvestRecordRejected", record)
}

// Gate Check Event Broadcasting (stub - GateCheckRecord type not in current schema)

// OnGateCheckCreated broadcasts when a new gate check record is created
func (eb *EventBroadcaster) OnGateCheckCreated(record interface{}) {
	log.Printf("Broadcasting gate check created event")
	eb.wsHandler.BroadcastToChannel(models.ChannelGateCheck, "gateCheckCreated", record)
}

// OnGateCheckCompleted broadcasts when a gate check is completed
func (eb *EventBroadcaster) OnGateCheckCompleted(record interface{}) {
	log.Printf("Broadcasting gate check completed event")
	eb.wsHandler.BroadcastToChannel(models.ChannelGateCheck, "gateCheckCompleted", record)
}

// OnSystemAlert broadcasts system alerts to appropriate roles
func (eb *EventBroadcaster) OnSystemAlert(alertType, message string, severity string, data interface{}) {
	log.Printf("Broadcasting system alert: %s - %s", alertType, message)

	alertData := map[string]interface{}{
		"type":      alertType,
		"message":   message,
		"severity":  severity,
		"data":      data,
		"timestamp": time.Now(),
	}

	eb.wsHandler.BroadcastToChannel(models.ChannelSystem, "systemAlert", alertData)

	switch severity {
	case "critical":
		eb.wsHandler.BroadcastToRole("SUPER_ADMIN", "critical_alert", alertData)
	case "high":
		eb.wsHandler.BroadcastToRole("COMPANY_ADMIN", "high_severity_alert", alertData)
	case "medium":
		eb.wsHandler.BroadcastToRole("MANAGER", "management_alert", alertData)
	}
}

// OnUserStatusChange broadcasts user status changes
func (eb *EventBroadcaster) OnUserStatusChange(userID, status string, metadata map[string]interface{}) {
	log.Printf("Broadcasting user status change: %s -> %s", userID, status)

	statusData := map[string]interface{}{
		"userId":    userID,
		"status":    status,
		"metadata":  metadata,
		"timestamp": time.Now(),
	}

	eb.wsHandler.BroadcastToUser(userID, "userStatusChange", statusData)
	eb.wsHandler.BroadcastToRole("COMPANY_ADMIN", "userStatusChange", statusData)
	eb.wsHandler.BroadcastToRole("SUPER_ADMIN", "userStatusChange", statusData)
}

// OnCompanyUpdate broadcasts company-wide updates
func (eb *EventBroadcaster) OnCompanyUpdate(companyID, updateType, message string, data interface{}) {
	log.Printf("Broadcasting company update for %s: %s", companyID, updateType)

	updateData := map[string]interface{}{
		"companyId": companyID,
		"type":      updateType,
		"message":   message,
		"data":      data,
		"timestamp": time.Now(),
	}

	eb.wsHandler.BroadcastToCompany(companyID, "companyUpdate", updateData)
}

// OnPKSDataReceived broadcasts when PKS data is received
func (eb *EventBroadcaster) OnPKSDataReceived(pksData interface{}) {
	log.Printf("Broadcasting PKS data received event")
	eb.wsHandler.BroadcastToChannel(models.ChannelPKS, "pksDataReceived", pksData)
	eb.wsHandler.BroadcastToRole("MANAGER", "pksDataReceived", pksData)
	eb.wsHandler.BroadcastToRole("AREA_MANAGER", "pksDataReceived", pksData)
}
