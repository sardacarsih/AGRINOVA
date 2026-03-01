package resolvers

import (
	"context"

	master "agrinovagraphql/server/internal/graphql/domain/master"
	"agrinovagraphql/server/internal/graphql/generated"
)

type tarifBlokResolver struct{ *Resolver }

// TarifBlok returns generated.TarifBlokResolver implementation.
func (r *Resolver) TarifBlok() generated.TarifBlokResolver {
	return &tarifBlokResolver{r}
}

// LandType resolves nested landType for tarif blok.
func (r *tarifBlokResolver) LandType(_ context.Context, obj *master.TarifBlok) (*generated.LandType, error) {
	if obj == nil || obj.LandType == nil {
		return nil, nil
	}

	return &generated.LandType{
		ID:          obj.LandType.ID,
		Code:        obj.LandType.Code,
		Name:        obj.LandType.Name,
		Description: obj.LandType.Description,
		IsActive:    obj.LandType.IsActive,
		CreatedAt:   obj.LandType.CreatedAt,
		UpdatedAt:   obj.LandType.UpdatedAt,
	}, nil
}

// TargetLebihKg maps internal TargetLebih field into GraphQL targetLebihKg field.
func (r *tarifBlokResolver) TargetLebihKg(_ context.Context, obj *master.TarifBlok) (*float64, error) {
	if obj == nil {
		return nil, nil
	}
	return obj.TargetLebih, nil
}
