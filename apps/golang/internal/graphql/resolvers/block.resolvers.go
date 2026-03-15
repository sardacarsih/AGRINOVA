package resolvers

import (
	"context"
	"errors"
	"fmt"
	"strings"

	"agrinovagraphql/server/internal/graphql/domain/mandor"
	"agrinovagraphql/server/internal/graphql/domain/master"
	"agrinovagraphql/server/internal/graphql/generated"

	"gorm.io/gorm"
)

type blockResolver struct{ *Resolver }

func (r *blockResolver) LandType(ctx context.Context, obj *master.Block) (*generated.LandType, error) {
	if obj == nil || obj.LandTypeID == nil || strings.TrimSpace(*obj.LandTypeID) == "" {
		return nil, nil
	}

	if obj.LandType != nil {
		return mapLandTypeToGenerated(obj.LandType), nil
	}

	var landType master.LandType
	if err := r.db.WithContext(ctx).
		Where("id = ?", strings.TrimSpace(*obj.LandTypeID)).
		First(&landType).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			// Avoid surfacing an internal error for optional relation fields.
			return nil, nil
		}
		return nil, fmt.Errorf("failed to load block land type: %w", err)
	}

	return mapLandTypeToGenerated(&landType), nil
}

func (r *blockResolver) HarvestRecords(ctx context.Context, obj *master.Block) ([]*mandor.HarvestRecord, error) {
	if obj == nil || strings.TrimSpace(obj.ID) == "" {
		return []*mandor.HarvestRecord{}, nil
	}

	records := make([]*mandor.HarvestRecord, 0)
	if err := r.db.WithContext(ctx).
		Where("block_id = ?", obj.ID).
		Order("tanggal DESC").
		Find(&records).Error; err != nil {
		return nil, fmt.Errorf("failed to load block harvest records: %w", err)
	}

	return records, nil
}

func mapLandTypeToGenerated(landType *master.LandType) *generated.LandType {
	if landType == nil {
		return nil
	}

	return &generated.LandType{
		ID:          landType.ID,
		Code:        landType.Code,
		Name:        landType.Name,
		Description: landType.Description,
		IsActive:    landType.IsActive,
		CreatedAt:   landType.CreatedAt,
		UpdatedAt:   landType.UpdatedAt,
	}
}
