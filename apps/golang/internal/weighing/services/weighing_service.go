package services

import (
	"context"
	"fmt"

	"agrinovagraphql/server/internal/graphql/domain/timbangan"
	"agrinovagraphql/server/internal/weighing/models"

	"gorm.io/gorm"
)

type WeighingService struct {
	db *gorm.DB
}

func NewWeighingService(db *gorm.DB) *WeighingService {
	return &WeighingService{
		db: db,
	}
}

func (s *WeighingService) CreateWeighingRecord(ctx context.Context, input timbangan.CreateWeighingRecordInput) (*models.WeighingRecord, error) {
	record := models.WeighingRecord{
		TicketNumber:  input.TicketNumber,
		VehicleNumber: input.VehicleNumber,
		GrossWeight:   input.GrossWeight,
		TareWeight:    input.TareWeight,
		NetWeight:     input.NetWeight,
		WeighingTime:  input.WeighingTime,
		CompanyID:     input.CompanyID,
	}

	if input.DriverName != nil {
		record.DriverName = *input.DriverName
	}
	if input.VendorName != nil {
		record.VendorName = *input.VendorName
	}
	if input.CargoType != nil {
		record.CargoType = *input.CargoType
	}

	if err := s.db.Create(&record).Error; err != nil {
		return nil, fmt.Errorf("failed to create weighing record: %w", err)
	}

	return &record, nil
}

func (s *WeighingService) ListWeighingRecords(ctx context.Context) ([]*models.WeighingRecord, error) {
	var records []*models.WeighingRecord
	if err := s.db.Order("weighing_time desc").Find(&records).Error; err != nil {
		return nil, fmt.Errorf("failed to list weighing records: %w", err)
	}
	return records, nil
}

func (s *WeighingService) GetWeighingRecord(ctx context.Context, id string) (*models.WeighingRecord, error) {
	var record models.WeighingRecord
	if err := s.db.First(&record, "id = ?", id).Error; err != nil {
		return nil, fmt.Errorf("weighing record not found: %w", err)
	}
	return &record, nil
}

func (s *WeighingService) UpdateWeighingRecord(ctx context.Context, id string, input timbangan.UpdateWeighingRecordInput) (*models.WeighingRecord, error) {
	var record models.WeighingRecord

	if err := s.db.First(&record, "id = ?", id).Error; err != nil {
		return nil, fmt.Errorf("weighing record not found: %w", err)
	}

	// Update fields if provided
	if input.TicketNumber != nil {
		record.TicketNumber = *input.TicketNumber
	}
	if input.VehicleNumber != nil {
		record.VehicleNumber = *input.VehicleNumber
	}
	if input.GrossWeight != nil {
		record.GrossWeight = *input.GrossWeight
	}
	if input.TareWeight != nil {
		record.TareWeight = *input.TareWeight
	}
	if input.NetWeight != nil {
		record.NetWeight = *input.NetWeight
	}
	if input.WeighingTime != nil {
		record.WeighingTime = *input.WeighingTime
	}
	if input.DriverName != nil {
		record.DriverName = *input.DriverName
	}
	if input.VendorName != nil {
		record.VendorName = *input.VendorName
	}
	if input.CargoType != nil {
		record.CargoType = *input.CargoType
	}

	if err := s.db.Save(&record).Error; err != nil {
		return nil, fmt.Errorf("failed to update weighing record: %w", err)
	}

	return &record, nil
}
