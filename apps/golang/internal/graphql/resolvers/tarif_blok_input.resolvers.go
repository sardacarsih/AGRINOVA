package resolvers

import (
	"context"

	master "agrinovagraphql/server/internal/graphql/domain/master"
	"agrinovagraphql/server/internal/graphql/generated"
)

type createTarifBlokInputResolver struct{ *Resolver }
type updateTarifBlokInputResolver struct{ *Resolver }

// CreateTarifBlokInput returns generated.CreateTarifBlokInputResolver implementation.
func (r *Resolver) CreateTarifBlokInput() generated.CreateTarifBlokInputResolver {
	return &createTarifBlokInputResolver{r}
}

// UpdateTarifBlokInput returns generated.UpdateTarifBlokInputResolver implementation.
func (r *Resolver) UpdateTarifBlokInput() generated.UpdateTarifBlokInputResolver {
	return &updateTarifBlokInputResolver{r}
}

// TargetLebihKg maps GraphQL input field targetLebihKg into internal field TargetLebih.
func (r *createTarifBlokInputResolver) TargetLebihKg(_ context.Context, obj *master.CreateTarifBlokInput, data *float64) error {
	obj.TargetLebih = data
	return nil
}

// TargetLebihKg maps GraphQL input field targetLebihKg into internal field TargetLebih.
func (r *updateTarifBlokInputResolver) TargetLebihKg(_ context.Context, obj *master.UpdateTarifBlokInput, data *float64) error {
	obj.TargetLebih = data
	return nil
}
