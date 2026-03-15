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

// ManagementDecisionNo maps GraphQL input field managementDecisionNo.
func (r *createTarifBlokInputResolver) ManagementDecisionNo(_ context.Context, obj *master.CreateTarifBlokInput, data *string) error {
	obj.ManagementDecisionNo = data
	return nil
}

// ManagementDecisionReason maps GraphQL input field managementDecisionReason.
func (r *createTarifBlokInputResolver) ManagementDecisionReason(_ context.Context, obj *master.CreateTarifBlokInput, data *string) error {
	obj.ManagementDecisionReason = data
	return nil
}

// ManagementEffectiveNote maps GraphQL input field managementEffectiveNote.
func (r *createTarifBlokInputResolver) ManagementEffectiveNote(_ context.Context, obj *master.CreateTarifBlokInput, data *string) error {
	obj.ManagementEffectiveNote = data
	return nil
}

// ManagementDecisionNo maps GraphQL input field managementDecisionNo.
func (r *updateTarifBlokInputResolver) ManagementDecisionNo(_ context.Context, obj *master.UpdateTarifBlokInput, data *string) error {
	obj.ManagementDecisionNo = data
	return nil
}

// ManagementDecisionReason maps GraphQL input field managementDecisionReason.
func (r *updateTarifBlokInputResolver) ManagementDecisionReason(_ context.Context, obj *master.UpdateTarifBlokInput, data *string) error {
	obj.ManagementDecisionReason = data
	return nil
}

// ManagementEffectiveNote maps GraphQL input field managementEffectiveNote.
func (r *updateTarifBlokInputResolver) ManagementEffectiveNote(_ context.Context, obj *master.UpdateTarifBlokInput, data *string) error {
	obj.ManagementEffectiveNote = data
	return nil
}
