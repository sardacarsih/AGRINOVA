package resolvers

import (
	"context"

	"agrinovagraphql/server/internal/graphql/domain/bkm"
	"agrinovagraphql/server/internal/graphql/generated"
)

// UpsertBkmMasters is the resolver for the upsertBkmMasters mutation.
func (r *mutationResolver) UpsertBkmMasters(ctx context.Context, input []*bkm.BkmMasterUpsertInput) (*bkm.UpsertBkmResult, error) {
	return r.BkmSyncService.UpsertMasters(ctx, input)
}

// UpsertBkmDetails is the resolver for the upsertBkmDetails mutation.
func (r *mutationResolver) UpsertBkmDetails(ctx context.Context, input []*bkm.BkmDetailUpsertInput) (*bkm.UpsertBkmResult, error) {
	return r.BkmSyncService.UpsertDetails(ctx, input)
}

// BkmMasterUpsertInput returns the BkmMasterUpsertInputResolver implementation.
func (r *Resolver) BkmMasterUpsertInput() generated.BkmMasterUpsertInputResolver {
	return &bkmMasterUpsertInputResolver{r}
}

type bkmMasterUpsertInputResolver struct{ *Resolver }

// Nomor converts GraphQL Int (int32) to Go int64 for the Nomor field.
func (r *bkmMasterUpsertInputResolver) Nomor(ctx context.Context, obj *bkm.BkmMasterUpsertInput, data *int32) error {
	if data != nil {
		v := int64(*data)
		obj.Nomor = &v
	}
	return nil
}
