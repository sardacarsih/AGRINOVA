package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type Employee struct {
	ID         string    `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id"`
	NIK        string    `gorm:"type:varchar(50);not null;index:idx_employee_nik_company,unique" json:"nik"`
	Name       string    `gorm:"type:varchar(100);not null" json:"name"`
	Role       string    `gorm:"type:varchar(50);not null" json:"role"` // HARVESTER, DRIVER, SECURITY
	CompanyID  string    `gorm:"type:uuid;not null;index:idx_employee_nik_company,unique" json:"companyId"`
	DivisionID *string   `gorm:"type:uuid;index:idx_employee_division" json:"divisionId,omitempty"`
	PhotoURL   string    `gorm:"type:text" json:"photoUrl"`
	IsActive   bool      `gorm:"default:true" json:"isActive"`
	CreatedAt  time.Time `json:"createdAt"`
	UpdatedAt  time.Time `json:"updatedAt"`
}

func (e *Employee) BeforeCreate(tx *gorm.DB) (err error) {
	if e.ID == "" {
		e.ID = uuid.New().String()
	}
	return
}
