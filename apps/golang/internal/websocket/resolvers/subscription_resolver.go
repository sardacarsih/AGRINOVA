package resolvers

import (
	"context"
	"log"

	"agrinovagraphql/server/internal/graphql/domain/mandor"
	"agrinovagraphql/server/internal/graphql/domain/master"
	"agrinovagraphql/server/internal/websocket/models"
	"agrinovagraphql/server/internal/websocket/services"
)

// SubscriptionResolver handles GraphQL subscriptions for real-time updates
type SubscriptionResolver struct {
	wsHandler *services.WebSocketHandler
}

// NewSubscriptionResolver creates a new subscription resolver
func NewSubscriptionResolver(wsHandler *services.WebSocketHandler) *SubscriptionResolver {
	return &SubscriptionResolver{
		wsHandler: wsHandler,
	}
}

// HarvestRecordCreated handles subscription for newly created harvest records
func (r *SubscriptionResolver) HarvestRecordCreated(ctx context.Context) (<-chan *mandor.HarvestRecord, error) {
	log.Println("Setting up subscription for harvest record created events")
	harvestChan := make(chan *mandor.HarvestRecord, 1)
	go func() {
		<-ctx.Done()
		close(harvestChan)
		log.Println("Harvest record created subscription closed")
	}()
	return harvestChan, nil
}

// HarvestRecordApproved handles subscription for approved harvest records
func (r *SubscriptionResolver) HarvestRecordApproved(ctx context.Context) (<-chan *mandor.HarvestRecord, error) {
	log.Println("Setting up subscription for harvest record approved events")
	approvedChan := make(chan *mandor.HarvestRecord, 1)
	go func() {
		<-ctx.Done()
		close(approvedChan)
		log.Println("Harvest record approved subscription closed")
	}()
	return approvedChan, nil
}

// HarvestRecordRejected handles subscription for rejected harvest records
func (r *SubscriptionResolver) HarvestRecordRejected(ctx context.Context) (<-chan *mandor.HarvestRecord, error) {
	log.Println("Setting up subscription for harvest record rejected events")
	rejectedChan := make(chan *mandor.HarvestRecord, 1)
	go func() {
		<-ctx.Done()
		close(rejectedChan)
		log.Println("Harvest record rejected subscription closed")
	}()
	return rejectedChan, nil
}

// CompanyCreated handles subscription for newly created companies
func (r *SubscriptionResolver) CompanyCreated(ctx context.Context) (<-chan *master.Company, error) {
	log.Println("Setting up subscription for company created events")
	companyChan := make(chan *master.Company, 1)
	go func() {
		<-ctx.Done()
		close(companyChan)
		log.Println("Company created subscription closed")
	}()
	return companyChan, nil
}

// CompanyUpdated handles subscription for updated companies
func (r *SubscriptionResolver) CompanyUpdated(ctx context.Context) (<-chan *master.Company, error) {
	log.Println("Setting up subscription for company updated events")
	companyChan := make(chan *master.Company, 1)
	go func() {
		<-ctx.Done()
		close(companyChan)
		log.Println("Company updated subscription closed")
	}()
	return companyChan, nil
}

// CompanyDeleted handles subscription for deleted companies
func (r *SubscriptionResolver) CompanyDeleted(ctx context.Context) (<-chan string, error) {
	log.Println("Setting up subscription for company deleted events")
	deletedChan := make(chan string, 1)
	go func() {
		<-ctx.Done()
		close(deletedChan)
		log.Println("Company deleted subscription closed")
	}()
	return deletedChan, nil
}

// CompanyStatusChanged handles subscription for company status change events
func (r *SubscriptionResolver) CompanyStatusChanged(ctx context.Context) (<-chan *master.Company, error) {
	log.Println("Setting up subscription for company status changed events")
	companyChan := make(chan *master.Company, 1)
	go func() {
		<-ctx.Done()
		close(companyChan)
		log.Println("Company status changed subscription closed")
	}()
	return companyChan, nil
}

// GateCheckCreated handles subscription for gate check records (stub - type not in schema)
func (r *SubscriptionResolver) GateCheckCreated(ctx context.Context) (<-chan interface{}, error) {
	log.Println("Setting up subscription for gate check created events")
	gateCheckChan := make(chan interface{}, 1)
	go func() {
		<-ctx.Done()
		close(gateCheckChan)
	}()
	return gateCheckChan, nil
}

// GateCheckCompleted handles subscription for completed gate check records (stub)
func (r *SubscriptionResolver) GateCheckCompleted(ctx context.Context) (<-chan interface{}, error) {
	log.Println("Setting up subscription for gate check completed events")
	completedChan := make(chan interface{}, 1)
	go func() {
		<-ctx.Done()
		close(completedChan)
	}()
	return completedChan, nil
}

// TriggerHarvestCreated sends a harvest created event to all subscribers
func (r *SubscriptionResolver) TriggerHarvestCreated(record *mandor.HarvestRecord) {
	r.wsHandler.BroadcastToChannel(models.ChannelHarvest, "harvestRecordCreated", record)
	r.wsHandler.BroadcastToRole("ASISTEN", "harvestRecordCreated", record)
	r.wsHandler.BroadcastToRole("MANAGER", "harvestRecordCreated", record)
	r.wsHandler.BroadcastToRole("AREA_MANAGER", "harvestRecordCreated", record)
	log.Printf("Triggered harvest created event for record ID: %s", record.ID)
}

// TriggerHarvestApproved sends a harvest approved event
func (r *SubscriptionResolver) TriggerHarvestApproved(record *mandor.HarvestRecord) {
	r.wsHandler.BroadcastToChannel(models.ChannelHarvest, "harvestRecordApproved", record)
	if record.Mandor != nil {
		r.wsHandler.BroadcastToUser(record.Mandor.ID, "harvestRecordApproved", record)
	}
	r.wsHandler.BroadcastToRole("MANAGER", "harvestRecordApproved", record)
	r.wsHandler.BroadcastToRole("AREA_MANAGER", "harvestRecordApproved", record)
	log.Printf("Triggered harvest approved event for record ID: %s", record.ID)
}

// TriggerHarvestRejected sends a harvest rejected event
func (r *SubscriptionResolver) TriggerHarvestRejected(record *mandor.HarvestRecord) {
	r.wsHandler.BroadcastToChannel(models.ChannelHarvest, "harvestRecordRejected", record)
	if record.Mandor != nil {
		r.wsHandler.BroadcastToUser(record.Mandor.ID, "harvestRecordRejected", record)
	}
	log.Printf("Triggered harvest rejected event for record ID: %s", record.ID)
}

// TriggerGateCheckCreated sends a gate check created event (uses interface{})
func (r *SubscriptionResolver) TriggerGateCheckCreated(record interface{}) {
	r.wsHandler.BroadcastToChannel(models.ChannelGateCheck, "gateCheckCreated", record)
	r.wsHandler.BroadcastToRole("SATPAM", "gateCheckCreated", record)
	r.wsHandler.BroadcastToRole("MANAGER", "gateCheckCreated", record)
	log.Println("Triggered gate check created event")
}

// TriggerGateCheckCompleted sends a gate check completed event (uses interface{})
func (r *SubscriptionResolver) TriggerGateCheckCompleted(record interface{}) {
	r.wsHandler.BroadcastToChannel(models.ChannelGateCheck, "gateCheckCompleted", record)
	r.wsHandler.BroadcastToRole("MANAGER", "gateCheckCompleted", record)
	log.Println("Triggered gate check completed event")
}

// TriggerSystemAlert sends a system alert
func (r *SubscriptionResolver) TriggerSystemAlert(alertType, message string, data interface{}) {
	alertData := map[string]interface{}{"type": alertType, "message": message, "data": data}
	r.wsHandler.BroadcastToChannel(models.ChannelSystem, "systemAlert", alertData)
	r.wsHandler.BroadcastToRole("COMPANY_ADMIN", "systemAlert", alertData)
	r.wsHandler.BroadcastToRole("SUPER_ADMIN", "systemAlert", alertData)
	log.Printf("Triggered system alert: %s - %s", alertType, message)
}

// TriggerUserNotification sends a notification to a specific user
func (r *SubscriptionResolver) TriggerUserNotification(userID, notificationType, message string, data interface{}) {
	notificationData := map[string]interface{}{"type": notificationType, "message": message, "data": data}
	r.wsHandler.BroadcastToUser(userID, "userNotification", notificationData)
	log.Printf("Triggered user notification for user %s: %s", userID, notificationType)
}

// TriggerCompanyUpdate sends a company-wide update
func (r *SubscriptionResolver) TriggerCompanyUpdate(companyID, updateType, message string, data interface{}) {
	updateData := map[string]interface{}{"type": updateType, "message": message, "data": data}
	r.wsHandler.BroadcastToCompany(companyID, "companyUpdate", updateData)
	log.Printf("Triggered company update for company %s: %s", companyID, updateType)
}

// TriggerRoleBasedAlert sends an alert to all users with a specific role
func (r *SubscriptionResolver) TriggerRoleBasedAlert(role, alertType, message string, data interface{}) {
	alertData := map[string]interface{}{"type": alertType, "message": message, "data": data}
	r.wsHandler.BroadcastToRole(role, "roleAlert", alertData)
	log.Printf("Triggered role-based alert for role %s: %s", role, alertType)
}

// TriggerCompanyCreated sends a company created event to all subscribers
func (r *SubscriptionResolver) TriggerCompanyCreated(company *master.Company) {
	r.wsHandler.BroadcastToChannel(models.ChannelSystem, "companyCreated", company)
	r.wsHandler.BroadcastToRole("SUPER_ADMIN", "companyCreated", company)
	r.wsHandler.BroadcastToRole("AREA_MANAGER", "companyCreated", company)
	log.Printf("Triggered company created event for company ID: %s", company.ID)
}

// TriggerCompanyUpdated sends a company updated event to all subscribers
func (r *SubscriptionResolver) TriggerCompanyUpdated(company *master.Company) {
	r.wsHandler.BroadcastToChannel(models.ChannelSystem, "companyUpdated", company)
	r.wsHandler.BroadcastToRole("SUPER_ADMIN", "companyUpdated", company)
	r.wsHandler.BroadcastToRole("AREA_MANAGER", "companyUpdated", company)
	r.wsHandler.BroadcastToRole("COMPANY_ADMIN", "companyUpdated", company)
	log.Printf("Triggered company updated event for company ID: %s", company.ID)
}

// TriggerCompanyDeleted sends a company deleted event to all subscribers
func (r *SubscriptionResolver) TriggerCompanyDeleted(companyID string) {
	r.wsHandler.BroadcastToChannel(models.ChannelSystem, "companyDeleted", companyID)
	r.wsHandler.BroadcastToRole("SUPER_ADMIN", "companyDeleted", companyID)
	log.Printf("Triggered company deleted event for company ID: %s", companyID)
}

// TriggerCompanyStatusChanged sends a company status changed event to all subscribers
func (r *SubscriptionResolver) TriggerCompanyStatusChanged(company *master.Company) {
	r.wsHandler.BroadcastToChannel(models.ChannelSystem, "companyStatusChanged", company)
	r.wsHandler.BroadcastToRole("SUPER_ADMIN", "companyStatusChanged", company)
	r.wsHandler.BroadcastToRole("AREA_MANAGER", "companyStatusChanged", company)
	r.wsHandler.BroadcastToRole("COMPANY_ADMIN", "companyStatusChanged", company)
	log.Printf("Triggered company status changed event for company ID: %s", company.ID)
}
