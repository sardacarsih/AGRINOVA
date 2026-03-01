// Package master contains master data GraphQL types.
package master

import (
	"bytes"
	"fmt"
	"io"
	"strconv"
	"time"
)

// ============================================================================
// COMPANY
// ============================================================================

// Company represents a palm oil company entity.
type Company struct {
	ID          string        `json:"id" gorm:"primaryKey;type:uuid"` // Simplified for test compatibility
	Name        string        `json:"name" gorm:"column:name"`
	CompanyCode string        `json:"companyCode" gorm:"column:company_code"`
	Description *string       `json:"description,omitempty" gorm:"column:description"`
	LogoURL     *string       `json:"logoUrl,omitempty" gorm:"column:logo_url"`
	Address     *string       `json:"address,omitempty" gorm:"column:address"`
	Phone       *string       `json:"phone,omitempty" gorm:"column:phone"`
	Status      CompanyStatus `json:"status" gorm:"column:status;type:varchar(50)"`
	IsActive    bool          `json:"isActive" gorm:"column:is_active;default:true"`
	Estates     []*Estate     `json:"estates" gorm:"foreignKey:CompanyID"`
	CreatedAt   time.Time     `json:"createdAt" gorm:"column:created_at;autoCreateTime"`
	UpdatedAt   time.Time     `json:"updatedAt" gorm:"column:updated_at;autoUpdateTime"`
}

// TableName specifies the table name for GORM
func (Company) TableName() string {
	return "companies"
}

// CompanyPaginationResponse represents a paginated list of companies.
type CompanyPaginationResponse struct {
	Data       []*Company  `json:"data"`
	Pagination *Pagination `json:"pagination"`
}

// Pagination metadata for list responses.
type Pagination struct {
	Page  int32 `json:"page"`
	Limit int32 `json:"limit"`
	Total int32 `json:"total"`
	Pages int32 `json:"pages"`
}

// CreateCompanyInput for creating companies.
type CreateCompanyInput struct {
	Name        string         `json:"name"`
	CompanyCode string         `json:"companyCode"`
	Description *string        `json:"description,omitempty"`
	LogoURL     *string        `json:"logoUrl,omitempty"`
	Address     *string        `json:"address,omitempty"`
	Phone       *string        `json:"phone,omitempty"`
	Status      *CompanyStatus `json:"status,omitempty"`
	IsActive    *bool          `json:"isActive,omitempty"`
}

// UpdateCompanyInput for updating companies.
type UpdateCompanyInput struct {
	ID          string         `json:"id"`
	Name        *string        `json:"name,omitempty"`
	CompanyCode *string        `json:"companyCode,omitempty"`
	Description *string        `json:"description,omitempty"`
	LogoURL     *string        `json:"logoUrl,omitempty"`
	Address     *string        `json:"address,omitempty"`
	Phone       *string        `json:"phone,omitempty"`
	Status      *CompanyStatus `json:"status,omitempty"`
	IsActive    *bool          `json:"isActive,omitempty"`
}

// CompanyStatus enum.
type CompanyStatus string

const (
	CompanyStatusActive    CompanyStatus = "ACTIVE"
	CompanyStatusInactive  CompanyStatus = "INACTIVE"
	CompanyStatusSuspended CompanyStatus = "SUSPENDED"
)

var AllCompanyStatus = []CompanyStatus{
	CompanyStatusActive,
	CompanyStatusInactive,
	CompanyStatusSuspended,
}

func (e CompanyStatus) IsValid() bool {
	switch e {
	case CompanyStatusActive, CompanyStatusInactive, CompanyStatusSuspended:
		return true
	}
	return false
}

func (e CompanyStatus) String() string {
	return string(e)
}

func (e *CompanyStatus) UnmarshalGQL(v any) error {
	str, ok := v.(string)
	if !ok {
		return fmt.Errorf("enums must be strings")
	}
	*e = CompanyStatus(str)
	if !e.IsValid() {
		return fmt.Errorf("%s is not a valid CompanyStatus", str)
	}
	return nil
}

func (e CompanyStatus) MarshalGQL(w io.Writer) {
	fmt.Fprint(w, strconv.Quote(e.String()))
}

func (e *CompanyStatus) UnmarshalJSON(b []byte) error {
	s, err := strconv.Unquote(string(b))
	if err != nil {
		return err
	}
	return e.UnmarshalGQL(s)
}

func (e CompanyStatus) MarshalJSON() ([]byte, error) {
	var buf bytes.Buffer
	e.MarshalGQL(&buf)
	return buf.Bytes(), nil
}

// ============================================================================
// ESTATE
// ============================================================================

// Estate represents a plantation estate.
type Estate struct {
	ID        string      `json:"id" gorm:"primaryKey;column:id;type:uuid;default:gen_random_uuid()"`
	Name      string      `json:"name" gorm:"column:name"`
	Code      string      `json:"code" gorm:"column:code"`
	Location  *string     `json:"location,omitempty" gorm:"column:location"`
	LuasHa    *float64    `json:"luasHa,omitempty" gorm:"column:area_ha"`
	CompanyID string      `json:"companyId" gorm:"column:company_id;type:uuid"`
	Company   *Company    `json:"company" gorm:"foreignKey:CompanyID;references:ID"`
	Divisions []*Division `json:"divisions" gorm:"foreignKey:EstateID"`
	CreatedAt time.Time   `json:"createdAt" gorm:"column:created_at;autoCreateTime"`
	UpdatedAt time.Time   `json:"updatedAt" gorm:"column:updated_at;autoUpdateTime"`
}

// TableName specifies the table name for GORM
func (Estate) TableName() string {
	return "estates"
}

// CreateEstateInput for creating estates.
type CreateEstateInput struct {
	Name      string   `json:"name"`
	Code      string   `json:"code"`
	Location  *string  `json:"location,omitempty"`
	LuasHa    *float64 `json:"luasHa,omitempty"`
	CompanyID string   `json:"companyId"`
}

// UpdateEstateInput for updating estates.
type UpdateEstateInput struct {
	ID       string   `json:"id"`
	Name     *string  `json:"name,omitempty"`
	Code     *string  `json:"code,omitempty"`
	Location *string  `json:"location,omitempty"`
	LuasHa   *float64 `json:"luasHa,omitempty"`
}

// ============================================================================
// DIVISION
// ============================================================================

// Division represents a division within an estate.
type Division struct {
	ID        string    `json:"id" gorm:"primaryKey;column:id;type:uuid;default:gen_random_uuid()"`
	Name      string    `json:"name" gorm:"column:name"`
	Code      string    `json:"code" gorm:"column:code"`
	EstateID  string    `json:"estateId" gorm:"column:estate_id;type:uuid"`
	Estate    *Estate   `json:"estate" gorm:"foreignKey:EstateID;references:ID"`
	Blocks    []*Block  `json:"blocks" gorm:"foreignKey:DivisionID"`
	CreatedAt time.Time `json:"createdAt" gorm:"column:created_at;autoCreateTime"`
	UpdatedAt time.Time `json:"updatedAt" gorm:"column:updated_at;autoUpdateTime"`
}

// TableName specifies the table name for GORM
func (Division) TableName() string {
	return "divisions"
}

// LandType represents a master data classification for land/tariff dimension.
type LandType struct {
	ID          string    `json:"id" gorm:"primaryKey;column:id;type:uuid;default:gen_random_uuid()"`
	Code        string    `json:"code" gorm:"column:code;type:varchar(50);uniqueIndex;not null"`
	Name        string    `json:"name" gorm:"column:name;type:varchar(100);not null"`
	Description *string   `json:"description,omitempty" gorm:"column:description;type:text"`
	IsActive    bool      `json:"isActive" gorm:"column:is_active;default:true"`
	CreatedAt   time.Time `json:"createdAt" gorm:"column:created_at;autoCreateTime"`
	UpdatedAt   time.Time `json:"updatedAt" gorm:"column:updated_at;autoUpdateTime"`
}

// TableName specifies the table name for GORM.
func (LandType) TableName() string {
	return "land_types"
}

// CreateLandTypeInput for creating land types.
type CreateLandTypeInput struct {
	Code        string  `json:"code"`
	Name        string  `json:"name"`
	Description *string `json:"description,omitempty"`
	IsActive    *bool   `json:"isActive,omitempty"`
}

// UpdateLandTypeInput for updating land types.
type UpdateLandTypeInput struct {
	ID          string  `json:"id"`
	Code        *string `json:"code,omitempty"`
	Name        *string `json:"name,omitempty"`
	Description *string `json:"description,omitempty"`
	IsActive    *bool   `json:"isActive,omitempty"`
}

// CreateDivisionInput for creating divisions.
type CreateDivisionInput struct {
	Name     string `json:"name"`
	Code     string `json:"code"`
	EstateID string `json:"estateId"`
}

// UpdateDivisionInput for updating divisions.
type UpdateDivisionInput struct {
	ID   string  `json:"id"`
	Name *string `json:"name,omitempty"`
	Code *string `json:"code,omitempty"`
}

// TarifBlok represents master treatment data used by blocks.
type TarifBlok struct {
	ID           string    `json:"id" gorm:"primaryKey;column:id;type:uuid;default:gen_random_uuid()"`
	CompanyID    string    `json:"companyId" gorm:"column:company_id;type:uuid;not null;index;uniqueIndex:uq_tarif_blok_company_perlakuan,priority:1"`
	Company      *Company  `json:"company,omitempty" gorm:"foreignKey:CompanyID;references:ID"`
	Perlakuan    string    `json:"perlakuan" gorm:"column:perlakuan;type:varchar(100);not null;uniqueIndex:uq_tarif_blok_company_perlakuan,priority:2"`
	Keterangan   *string   `json:"keterangan,omitempty" gorm:"column:keterangan;type:text"`
	LandTypeID   *string   `json:"landTypeId,omitempty" gorm:"column:land_type_id;type:uuid;index:idx_tarif_blok_land_type_id"`
	LandType     *LandType `json:"landType,omitempty" gorm:"foreignKey:LandTypeID;references:ID"`
	TarifCode    *string   `json:"tarifCode,omitempty" gorm:"column:tarif_code;type:varchar(20);index:idx_tarif_blok_code"`
	SchemeType   *string   `json:"schemeType,omitempty" gorm:"column:scheme_type;type:varchar(30);index:idx_tarif_blok_scheme"`
	BJRMinKg     *float64  `json:"bjrMinKg,omitempty" gorm:"column:bjr_min_kg;type:numeric(10,2)"`
	BJRMaxKg     *float64  `json:"bjrMaxKg,omitempty" gorm:"column:bjr_max_kg;type:numeric(10,2)"`
	TargetLebih  *float64  `json:"targetLebihKg,omitempty" gorm:"column:target_lebih_kg;type:numeric(14,2)"`
	SortOrder    *int32    `json:"sortOrder,omitempty" gorm:"column:sort_order"`
	Basis        *float64  `json:"basis,omitempty" gorm:"column:basis;type:numeric(14,2)"`
	TarifUpah    *float64  `json:"tarifUpah,omitempty" gorm:"column:tarif_upah;type:numeric(14,2)"`
	Premi        *float64  `json:"premi,omitempty" gorm:"column:premi;type:numeric(14,2)"`
	TarifPremi1  *float64  `json:"tarifPremi1,omitempty" gorm:"column:tarif_premi1;type:numeric(14,2)"`
	TarifPremi2  *float64  `json:"tarifPremi2,omitempty" gorm:"column:tarif_premi2;type:numeric(14,2)"`
	TarifLibur   *float64  `json:"tarifLibur,omitempty" gorm:"column:tarif_libur;type:numeric(14,2)"`
	TarifLebaran *float64  `json:"tarifLebaran,omitempty" gorm:"column:tarif_lebaran;type:numeric(14,2)"`
	IsActive     bool      `json:"isActive" gorm:"column:is_active;default:true"`
	Blocks       []*Block  `json:"blocks" gorm:"foreignKey:TarifBlokID"`
	CreatedAt    time.Time `json:"createdAt" gorm:"column:created_at;autoCreateTime"`
	UpdatedAt    time.Time `json:"updatedAt" gorm:"column:updated_at;autoUpdateTime"`
}

// TableName specifies the table name for GORM.
func (TarifBlok) TableName() string {
	return "tarif_blok"
}

// ============================================================================
// BLOCK
// ============================================================================

// Block represents a plantation block within a division.
type Block struct {
	ID           string     `json:"id" gorm:"primaryKey;column:id;type:uuid;default:gen_random_uuid()"`
	BlockCode    string     `json:"blockCode" gorm:"column:block_code"`
	Name         string     `json:"name" gorm:"column:name"`
	LuasHa       *float64   `json:"luasHa,omitempty" gorm:"column:area_ha"`
	CropType     *string    `json:"cropType,omitempty" gorm:"column:crop_type"`
	PlantingYear *int32     `json:"plantingYear,omitempty" gorm:"column:planting_year"`
	Status       string     `json:"status" gorm:"column:status;type:varchar(10);default:INTI"`
	ISTM         string     `json:"istm" gorm:"column:istm;type:char(1);default:N"`
	Perlakuan    *string    `json:"perlakuan,omitempty" gorm:"column:perlakuan"`
	LandTypeID   *string    `json:"landTypeId,omitempty" gorm:"column:land_type_id;type:uuid;index:idx_blocks_land_type_id"`
	LandType     *LandType  `json:"landType,omitempty" gorm:"foreignKey:LandTypeID;references:ID"`
	TarifBlokID  *string    `json:"tarifBlokId,omitempty" gorm:"column:tarif_blok_id;type:uuid"`
	TarifBlok    *TarifBlok `json:"tarifBlok,omitempty" gorm:"foreignKey:TarifBlokID;references:ID;constraint:false"`
	DivisionID   string     `json:"divisionId" gorm:"column:division_id;type:uuid"`
	Division     *Division  `json:"division" gorm:"foreignKey:DivisionID;references:ID"`
	IsActive     bool       `json:"isActive" gorm:"column:is_active;default:true"`
	CreatedAt    time.Time  `json:"createdAt" gorm:"column:created_at;autoCreateTime"`
	UpdatedAt    time.Time  `json:"updatedAt" gorm:"column:updated_at;autoUpdateTime"`
}

// TableName specifies the table name for GORM
func (Block) TableName() string {
	return "blocks"
}

// CreateBlockInput for creating blocks.
type CreateBlockInput struct {
	BlockCode    string   `json:"blockCode"`
	Name         string   `json:"name"`
	LuasHa       *float64 `json:"luasHa,omitempty"`
	CropType     *string  `json:"cropType,omitempty"`
	PlantingYear *int32   `json:"plantingYear,omitempty"`
	Status       *string  `json:"status,omitempty"`
	ISTM         *string  `json:"istm,omitempty"`
	LandTypeID   *string  `json:"landTypeId,omitempty"`
	TarifBlokID  *string  `json:"tarifBlokId,omitempty"`
	DivisionID   string   `json:"divisionId"`
}

// UpdateBlockInput for updating blocks.
type UpdateBlockInput struct {
	ID           string   `json:"id"`
	BlockCode    *string  `json:"blockCode,omitempty"`
	Name         *string  `json:"name,omitempty"`
	LuasHa       *float64 `json:"luasHa,omitempty"`
	CropType     *string  `json:"cropType,omitempty"`
	PlantingYear *int32   `json:"plantingYear,omitempty"`
	Status       *string  `json:"status,omitempty"`
	ISTM         *string  `json:"istm,omitempty"`
	LandTypeID   *string  `json:"landTypeId,omitempty"`
	TarifBlokID  *string  `json:"tarifBlokId,omitempty"`
}

// CreateTarifBlokInput for creating tariff master records.
type CreateTarifBlokInput struct {
	CompanyID    string   `json:"companyId"`
	Perlakuan    string   `json:"perlakuan"`
	Keterangan   *string  `json:"keterangan,omitempty"`
	LandTypeID   *string  `json:"landTypeId,omitempty"`
	TarifCode    *string  `json:"tarifCode,omitempty"`
	SchemeType   *string  `json:"schemeType,omitempty"`
	BJRMinKg     *float64 `json:"bjrMinKg,omitempty"`
	BJRMaxKg     *float64 `json:"bjrMaxKg,omitempty"`
	TargetLebih  *float64 `json:"targetLebihKg,omitempty"`
	SortOrder    *int32   `json:"sortOrder,omitempty"`
	Basis        *float64 `json:"basis,omitempty"`
	TarifUpah    *float64 `json:"tarifUpah,omitempty"`
	Premi        *float64 `json:"premi,omitempty"`
	TarifPremi1  *float64 `json:"tarifPremi1,omitempty"`
	TarifPremi2  *float64 `json:"tarifPremi2,omitempty"`
	TarifLibur   *float64 `json:"tarifLibur,omitempty"`
	TarifLebaran *float64 `json:"tarifLebaran,omitempty"`
	IsActive     *bool    `json:"isActive,omitempty"`
}

// UpdateTarifBlokInput for updating tariff master records.
type UpdateTarifBlokInput struct {
	ID           string   `json:"id"`
	CompanyID    *string  `json:"companyId,omitempty"`
	Perlakuan    *string  `json:"perlakuan,omitempty"`
	Keterangan   *string  `json:"keterangan,omitempty"`
	LandTypeID   *string  `json:"landTypeId,omitempty"`
	TarifCode    *string  `json:"tarifCode,omitempty"`
	SchemeType   *string  `json:"schemeType,omitempty"`
	BJRMinKg     *float64 `json:"bjrMinKg,omitempty"`
	BJRMaxKg     *float64 `json:"bjrMaxKg,omitempty"`
	TargetLebih  *float64 `json:"targetLebihKg,omitempty"`
	SortOrder    *int32   `json:"sortOrder,omitempty"`
	Basis        *float64 `json:"basis,omitempty"`
	TarifUpah    *float64 `json:"tarifUpah,omitempty"`
	Premi        *float64 `json:"premi,omitempty"`
	TarifPremi1  *float64 `json:"tarifPremi1,omitempty"`
	TarifPremi2  *float64 `json:"tarifPremi2,omitempty"`
	TarifLibur   *float64 `json:"tarifLibur,omitempty"`
	TarifLebaran *float64 `json:"tarifLebaran,omitempty"`
	IsActive     *bool    `json:"isActive,omitempty"`
}

// ============================================================================
// VEHICLE
// ============================================================================

// Vehicle represents company-scoped vehicle master data.
type Vehicle struct {
	ID                 string     `json:"id" gorm:"primaryKey;column:id;type:uuid;default:gen_random_uuid()"`
	CompanyID          string     `json:"companyId" gorm:"column:company_id;type:uuid;not null;index;uniqueIndex:uq_vehicle_company_registration_plate,priority:1"`
	RegistrationPlate  string     `json:"registrationPlate" gorm:"column:registration_plate;type:varchar(20);not null;index;uniqueIndex:uq_vehicle_company_registration_plate,priority:2"`
	ChassisNumber      string     `json:"chassisNumber" gorm:"column:chassis_number;type:varchar(100);not null"`
	EngineNumber       string     `json:"engineNumber" gorm:"column:engine_number;type:varchar(100);not null"`
	ManufactureYear    int32      `json:"manufactureYear" gorm:"column:manufacture_year;not null"`
	VehicleCategory    string     `json:"vehicleCategory" gorm:"column:vehicle_category;type:varchar(30);not null;index"`
	Brand              string     `json:"brand" gorm:"column:brand;type:varchar(100);not null"`
	Model              string     `json:"model" gorm:"column:model;type:varchar(100);not null"`
	RegistrationRegion *string    `json:"registrationRegion,omitempty" gorm:"column:registration_region;type:varchar(100)"`
	VehicleType        string     `json:"vehicleType" gorm:"column:vehicle_type;type:varchar(50);not null"`
	AssignedDriverName *string    `json:"assignedDriverName,omitempty" gorm:"column:assigned_driver_name;type:varchar(255)"`
	Notes              *string    `json:"notes,omitempty" gorm:"column:notes;type:text"`
	IsActive           bool       `json:"isActive" gorm:"column:is_active;not null;default:true"`
	Status             string     `json:"status" gorm:"column:status;type:varchar(20);not null;default:'ACTIVE';index"`
	DeactivatedAt      *time.Time `json:"deactivatedAt,omitempty" gorm:"column:deactivated_at"`
	STNKExpiryDate     *time.Time `json:"stnkExpiryDate,omitempty" gorm:"column:stnk_expiry_date;type:date"`
	KIRExpiryDate      *time.Time `json:"kirExpiryDate,omitempty" gorm:"column:kir_expiry_date;type:date"`
	CreatedAt          time.Time  `json:"createdAt" gorm:"column:created_at;autoCreateTime"`
	UpdatedAt          time.Time  `json:"updatedAt" gorm:"column:updated_at;autoUpdateTime"`
}

// TableName specifies the table name for GORM.
func (Vehicle) TableName() string {
	return "vehicles"
}

// CreateVehicleInput for creating vehicles.
type CreateVehicleInput struct {
	CompanyID          *string    `json:"companyId,omitempty"`
	RegistrationPlate  string     `json:"registrationPlate"`
	ChassisNumber      string     `json:"chassisNumber"`
	EngineNumber       string     `json:"engineNumber"`
	ManufactureYear    int32      `json:"manufactureYear"`
	VehicleCategory    string     `json:"vehicleCategory"`
	Brand              string     `json:"brand"`
	Model              string     `json:"model"`
	RegistrationRegion *string    `json:"registrationRegion,omitempty"`
	VehicleType        string     `json:"vehicleType"`
	AssignedDriverName *string    `json:"assignedDriverName,omitempty"`
	Notes              *string    `json:"notes,omitempty"`
	IsActive           *bool      `json:"isActive,omitempty"`
	Status             *string    `json:"status,omitempty"`
	STNKExpiryDate     *time.Time `json:"stnkExpiryDate,omitempty"`
	KIRExpiryDate      *time.Time `json:"kirExpiryDate,omitempty"`
}

// UpdateVehicleInput for updating vehicles.
type UpdateVehicleInput struct {
	ID                 string     `json:"id"`
	RegistrationPlate  *string    `json:"registrationPlate,omitempty"`
	ChassisNumber      *string    `json:"chassisNumber,omitempty"`
	EngineNumber       *string    `json:"engineNumber,omitempty"`
	ManufactureYear    *int32     `json:"manufactureYear,omitempty"`
	VehicleCategory    *string    `json:"vehicleCategory,omitempty"`
	Brand              *string    `json:"brand,omitempty"`
	Model              *string    `json:"model,omitempty"`
	RegistrationRegion *string    `json:"registrationRegion,omitempty"`
	VehicleType        *string    `json:"vehicleType,omitempty"`
	AssignedDriverName *string    `json:"assignedDriverName,omitempty"`
	Notes              *string    `json:"notes,omitempty"`
	IsActive           *bool      `json:"isActive,omitempty"`
	Status             *string    `json:"status,omitempty"`
	DeactivatedAt      *time.Time `json:"deactivatedAt,omitempty"`
	STNKExpiryDate     *time.Time `json:"stnkExpiryDate,omitempty"`
	KIRExpiryDate      *time.Time `json:"kirExpiryDate,omitempty"`
}

// CreateVehicleTaxInput for creating vehicle tax transactions.
type CreateVehicleTaxInput struct {
	VehicleID        string     `json:"vehicleId"`
	TaxYear          int32      `json:"taxYear"`
	DueDate          time.Time  `json:"dueDate"`
	PKBAmount        float64    `json:"pkbAmount"`
	SWDKLLJAmount    float64    `json:"swdklljAmount"`
	AdminAmount      float64    `json:"adminAmount"`
	PenaltyAmount    float64    `json:"penaltyAmount"`
	TotalAmount      *float64   `json:"totalAmount,omitempty"`
	PaymentDate      *time.Time `json:"paymentDate,omitempty"`
	PaymentMethod    *string    `json:"paymentMethod,omitempty"`
	PaymentReference *string    `json:"paymentReference,omitempty"`
	TaxStatus        *string    `json:"taxStatus,omitempty"`
	Notes            *string    `json:"notes,omitempty"`
}

// UpdateVehicleTaxInput for updating vehicle tax transactions.
type UpdateVehicleTaxInput struct {
	ID               string     `json:"id"`
	TaxYear          *int32     `json:"taxYear,omitempty"`
	DueDate          *time.Time `json:"dueDate,omitempty"`
	PKBAmount        *float64   `json:"pkbAmount,omitempty"`
	SWDKLLJAmount    *float64   `json:"swdklljAmount,omitempty"`
	AdminAmount      *float64   `json:"adminAmount,omitempty"`
	PenaltyAmount    *float64   `json:"penaltyAmount,omitempty"`
	TotalAmount      *float64   `json:"totalAmount,omitempty"`
	PaymentDate      *time.Time `json:"paymentDate,omitempty"`
	PaymentMethod    *string    `json:"paymentMethod,omitempty"`
	PaymentReference *string    `json:"paymentReference,omitempty"`
	TaxStatus        *string    `json:"taxStatus,omitempty"`
	Notes            *string    `json:"notes,omitempty"`
}

// VehicleTax stores annual vehicle tax data.
type VehicleTax struct {
	ID               string     `json:"id" gorm:"primaryKey;column:id;type:uuid;default:gen_random_uuid()"`
	VehicleID        string     `json:"vehicleId" gorm:"column:vehicle_id;type:uuid;not null;index;uniqueIndex:uq_vehicle_tax_year,priority:1"`
	TaxYear          int32      `json:"taxYear" gorm:"column:tax_year;not null;index;uniqueIndex:uq_vehicle_tax_year,priority:2"`
	DueDate          time.Time  `json:"dueDate" gorm:"column:due_date;type:date;not null;index"`
	PKBAmount        float64    `json:"pkbAmount" gorm:"column:pkb_amount;type:numeric(18,2);not null;default:0"`
	SWDKLLJAmount    float64    `json:"swdklljAmount" gorm:"column:swdkllj_amount;type:numeric(18,2);not null;default:0"`
	AdminAmount      float64    `json:"adminAmount" gorm:"column:admin_amount;type:numeric(18,2);not null;default:0"`
	PenaltyAmount    float64    `json:"penaltyAmount" gorm:"column:penalty_amount;type:numeric(18,2);not null;default:0"`
	TotalAmount      float64    `json:"totalAmount" gorm:"column:total_amount;type:numeric(18,2);not null;default:0"`
	PaymentDate      *time.Time `json:"paymentDate,omitempty" gorm:"column:payment_date;type:date"`
	PaymentMethod    *string    `json:"paymentMethod,omitempty" gorm:"column:payment_method;type:varchar(50)"`
	PaymentReference *string    `json:"paymentReference,omitempty" gorm:"column:payment_reference;type:varchar(100)"`
	TaxStatus        string     `json:"taxStatus" gorm:"column:tax_status;type:varchar(20);not null;default:'OPEN';index:idx_vehicle_taxes_status_due,priority:1"`
	Notes            *string    `json:"notes,omitempty" gorm:"column:notes;type:text"`
	CreatedAt        time.Time  `json:"createdAt" gorm:"column:created_at;autoCreateTime"`
	UpdatedAt        time.Time  `json:"updatedAt" gorm:"column:updated_at;autoUpdateTime"`
}

func (VehicleTax) TableName() string {
	return "vehicle_taxes"
}

// VehicleTaxDocument stores tax supporting files.
type VehicleTaxDocument struct {
	ID           string    `json:"id" gorm:"primaryKey;column:id;type:uuid;default:gen_random_uuid()"`
	VehicleTaxID string    `json:"vehicleTaxId" gorm:"column:vehicle_tax_id;type:uuid;not null;index"`
	DocumentType string    `json:"documentType" gorm:"column:document_type;type:varchar(30);not null"`
	FilePath     string    `json:"filePath" gorm:"column:file_path;type:text;not null"`
	UploadedBy   *int64    `json:"uploadedBy,omitempty" gorm:"column:uploaded_by;type:bigint"`
	UploadedAt   time.Time `json:"uploadedAt" gorm:"column:uploaded_at;not null;default:now()"`
	CreatedAt    time.Time `json:"createdAt" gorm:"column:created_at;autoCreateTime"`
	UpdatedAt    time.Time `json:"updatedAt" gorm:"column:updated_at;autoUpdateTime"`
}

func (VehicleTaxDocument) TableName() string {
	return "vehicle_tax_documents"
}

// VehicleTaxNotification stores reminder history.
type VehicleTaxNotification struct {
	ID           string    `json:"id" gorm:"primaryKey;column:id;type:uuid;default:gen_random_uuid()"`
	VehicleTaxID string    `json:"vehicleTaxId" gorm:"column:vehicle_tax_id;type:uuid;not null;index"`
	ReminderType string    `json:"reminderType" gorm:"column:reminder_type;type:varchar(20);not null;index:idx_vehicle_tax_notifications_type_sent,priority:1"`
	Channel      string    `json:"channel" gorm:"column:channel;type:varchar(20);not null"`
	SentTo       *string   `json:"sentTo,omitempty" gorm:"column:sent_to;type:text"`
	SentAt       time.Time `json:"sentAt" gorm:"column:sent_at;not null;index:idx_vehicle_tax_notifications_type_sent,priority:2"`
	CreatedAt    time.Time `json:"createdAt" gorm:"column:created_at;autoCreateTime"`
	UpdatedAt    time.Time `json:"updatedAt" gorm:"column:updated_at;autoUpdateTime"`
}

func (VehicleTaxNotification) TableName() string {
	return "vehicle_tax_notifications"
}

// ============================================================================
// EMPLOYEE
// ============================================================================

// Employee represents a field worker.
type Employee struct {
	ID         string    `json:"id"`
	Nik        string    `json:"nik"`
	Name       string    `json:"name"`
	Role       string    `json:"role"`
	CompanyID  string    `json:"companyId"`
	DivisionID *string   `json:"divisionId,omitempty"`
	PhotoURL   *string   `json:"photoUrl,omitempty"`
	IsActive   bool      `json:"isActive"`
	CreatedAt  time.Time `json:"createdAt"`
	UpdatedAt  time.Time `json:"updatedAt"`
}

// CreateEmployeeInput for creating employees.
type CreateEmployeeInput struct {
	Nik        string  `json:"nik"`
	Name       string  `json:"name"`
	Role       string  `json:"role"`
	CompanyID  string  `json:"companyId"`
	DivisionID *string `json:"divisionId,omitempty"`
	PhotoURL   *string `json:"photoUrl,omitempty"`
}

// UpdateEmployeeInput for updating employees.
type UpdateEmployeeInput struct {
	ID         string  `json:"id"`
	Name       *string `json:"name,omitempty"`
	Role       *string `json:"role,omitempty"`
	CompanyID  *string `json:"companyId,omitempty"`
	DivisionID *string `json:"divisionId,omitempty"`
	PhotoURL   *string `json:"photoUrl,omitempty"`
	IsActive   *bool   `json:"isActive,omitempty"`
}

// SyncEmployeeInput for syncing employees from mobile.
type SyncEmployeeInput struct {
	Nik       string  `json:"nik"`
	Name      string  `json:"name"`
	Role      string  `json:"role"`
	CompanyID string  `json:"companyId"`
	PhotoURL  *string `json:"photoUrl,omitempty"`
	IsActive  bool    `json:"isActive"`
}
