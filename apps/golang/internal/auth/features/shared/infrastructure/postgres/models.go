package postgres

import (
	"time"
)

// UserModel represents the GORM model for users table
type UserModel struct {
	ID        string `gorm:"primaryKey;type:uuid"`
	Username  string `gorm:"uniqueIndex;not null"`
	Name      string `gorm:"column:name"`
	Email     *string
	Phone     *string    `gorm:"column:phone"`
	AvatarURL *string    `gorm:"column:avatar_url"`
	Password  string     `gorm:"not null"`
	Role      string     `gorm:"not null"`
	IsActive  bool       `gorm:"column:is_active;default:true"`
	ManagerID *string    `gorm:"column:manager_id;type:uuid;index"`
	CreatedAt time.Time  `gorm:"column:created_at"`
	UpdatedAt time.Time  `gorm:"column:updated_at"`
	DeletedAt *time.Time `gorm:"column:deleted_at;index"`

	// Relations
	Manager             *UserModel                    `gorm:"foreignKey:ManagerID;references:ID"`
	CompanyAssignments  []UserCompanyAssignmentModel  `gorm:"foreignKey:UserID"`
	EstateAssignments   []UserEstateAssignmentModel   `gorm:"foreignKey:UserID"`
	DivisionAssignments []UserDivisionAssignmentModel `gorm:"foreignKey:UserID"`
}

// TableName returns the table name for UserModel
func (UserModel) TableName() string {
	return "users"
}

// CompanyModel represents the GORM model for companies table
type CompanyModel struct {
	ID        string    `gorm:"primaryKey;type:uuid"` // Simplified for test compatibility
	Name      string    `gorm:"column:name;not null"`
	LogoURL   *string   `gorm:"column:logo_url"`
	Status    string    `gorm:"column:status;default:'Active'"`
	Address   *string   `gorm:"column:address"`
	Phone     *string   `gorm:"column:phone"`
	IsActive  bool      `gorm:"column:is_active;default:true;index"`
	CreatedAt time.Time `gorm:"column:created_at"`
	UpdatedAt time.Time `gorm:"column:updated_at"`
}

// TableName returns the table name for CompanyModel
func (CompanyModel) TableName() string {
	return "companies"
}

// EstateModel represents the GORM model for estates table
type EstateModel struct {
	ID        string `gorm:"primaryKey;type:uuid"`
	CompanyID string `gorm:"column:company_id;not null;index"`
	Name      string `gorm:"not null"`
	Code      *string
	Location  *string
	AreaHa    *float64  `gorm:"column:area_ha"`
	IsActive  bool      `gorm:"column:is_active;default:true;index"`
	CreatedAt time.Time `gorm:"column:created_at"`
	UpdatedAt time.Time `gorm:"column:updated_at"`

	// Relations
	Company *CompanyModel `gorm:"foreignKey:CompanyID"`
}

// TableName returns the table name for EstateModel
func (EstateModel) TableName() string {
	return "estates"
}

// DivisionModel represents the GORM model for divisions table
type DivisionModel struct {
	ID        string  `gorm:"primaryKey;type:uuid"`
	CompanyID string  `gorm:"column:company_id;not null;index"` // Denormalized for convenience
	EstateID  *string `gorm:"column:estate_id;index"`
	Name      string  `gorm:"not null"`
	Code      *string
	IsActive  bool      `gorm:"column:is_active;default:true;index"`
	CreatedAt time.Time `gorm:"column:created_at"`
	UpdatedAt time.Time `gorm:"column:updated_at"`

	// Relations
	Company *CompanyModel `gorm:"foreignKey:CompanyID"`
	Estate  *EstateModel  `gorm:"foreignKey:EstateID"`
}

// TableName returns the table name for DivisionModel
func (DivisionModel) TableName() string {
	return "divisions"
}

// UserCompanyAssignmentModel represents Area Manager assignments
type UserCompanyAssignmentModel struct {
	ID         string    `gorm:"primaryKey;type:uuid"`
	UserID     string    `gorm:"column:user_id;not null;index"`
	CompanyID  string    `gorm:"column:company_id;not null;index"`
	IsActive   bool      `gorm:"column:is_active;default:true;index"`
	AssignedBy string    `gorm:"column:assigned_by;type:uuid"`
	AssignedAt time.Time `gorm:"column:assigned_at"`
	CreatedAt  time.Time `gorm:"column:created_at"`
	UpdatedAt  time.Time `gorm:"column:updated_at"`

	// Relations
	Company *CompanyModel `gorm:"foreignKey:CompanyID"`
}

// TableName returns the table name for UserCompanyAssignmentModel
func (UserCompanyAssignmentModel) TableName() string {
	return "user_company_assignments"
}

// UserEstateAssignmentModel represents Manager assignments
type UserEstateAssignmentModel struct {
	ID         string    `gorm:"primaryKey;type:uuid"`
	UserID     string    `gorm:"column:user_id;not null;index"`
	EstateID   string    `gorm:"column:estate_id;not null;index"`
	IsActive   bool      `gorm:"column:is_active;default:true;index"`
	AssignedBy string    `gorm:"column:assigned_by;type:uuid"`
	AssignedAt time.Time `gorm:"column:assigned_at"`
	CreatedAt  time.Time `gorm:"column:created_at"`
	UpdatedAt  time.Time `gorm:"column:updated_at"`

	// Relations
	Estate *EstateModel `gorm:"foreignKey:EstateID"`
}

// TableName returns the table name for UserEstateAssignmentModel
func (UserEstateAssignmentModel) TableName() string {
	return "user_estate_assignments"
}

// UserDivisionAssignmentModel represents Asisten assignments
type UserDivisionAssignmentModel struct {
	ID         string    `gorm:"primaryKey;type:uuid"`
	UserID     string    `gorm:"column:user_id;not null;index"`
	DivisionID string    `gorm:"column:division_id;not null;index"`
	IsActive   bool      `gorm:"column:is_active;default:true;index"`
	AssignedBy string    `gorm:"column:assigned_by;type:uuid"`
	AssignedAt time.Time `gorm:"column:assigned_at"`
	CreatedAt  time.Time `gorm:"column:created_at"`
	UpdatedAt  time.Time `gorm:"column:updated_at"`

	// Relations
	Division *DivisionModel `gorm:"foreignKey:DivisionID"`
}

// TableName returns the table name for UserDivisionAssignmentModel
func (UserDivisionAssignmentModel) TableName() string {
	return "user_division_assignments"
}
