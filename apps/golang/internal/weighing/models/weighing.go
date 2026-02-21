package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type WeighingRecord struct {
	ID            string    `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id"`
	TicketNumber  string    `gorm:"type:varchar(50);not null;uniqueIndex" json:"ticketNumber"`
	VehicleNumber string    `gorm:"type:varchar(20);not null" json:"vehicleNumber"`
	DriverName    string    `gorm:"type:varchar(100)" json:"driverName"`
	VendorName    string    `gorm:"type:varchar(100)" json:"vendorName"`
	GrossWeight   float64   `gorm:"type:decimal(10,2);not null" json:"grossWeight"`
	TareWeight    float64   `gorm:"type:decimal(10,2);not null" json:"tareWeight"`
	NetWeight     float64   `gorm:"type:decimal(10,2);not null" json:"netWeight"`
	CargoType     string    `gorm:"type:varchar(50)" json:"cargoType"`
	CompanyID     string    `gorm:"type:uuid;not null;index" json:"companyId"`
	WeighingTime  time.Time `gorm:"not null" json:"weighingTime"`
	CreatedAt     time.Time `json:"createdAt"`
	UpdatedAt     time.Time `json:"updatedAt"`
}

func (w *WeighingRecord) BeforeCreate(tx *gorm.DB) (err error) {
	if w.ID == "" {
		w.ID = uuid.New().String()
	}
	return
}
