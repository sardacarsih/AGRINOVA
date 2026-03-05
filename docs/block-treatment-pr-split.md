# Block Treatment PR Split Plan

Gunakan dua PR terpisah agar review lebih fokus.

## PR 1: Backend + Migration

Target commit:
- `apps/golang/internal/graphql/schema/master.graphqls`
- `apps/golang/internal/graphql/generated/generated.go`
- `apps/golang/internal/graphql/generated/models.go`
- `apps/golang/internal/graphql/resolvers/master.resolvers.go`
- `apps/golang/internal/graphql/resolvers/block_treatment_workflow_guardrail_test.go`
- `apps/golang/internal/graphql/resolvers/block_treatment_workflow_integration_test.go`
- `apps/golang/internal/master/models/master_models.go`
- `apps/golang/internal/master/resolvers/master_resolver.go`
- `apps/golang/internal/master/services/master_service.go`
- `apps/golang/internal/master/services/master_service_tariff_decision_guardrail_test.go`
- `apps/golang/pkg/database/migrations/000065_create_block_treatment_request_workflow.go`
- `apps/golang/pkg/database/migrations.go` (hanya hunk registrasi migration `000065`)

Perintah yang disarankan:
1. `git add apps/golang/internal/graphql/schema/master.graphqls`
2. `git add apps/golang/internal/graphql/generated/generated.go apps/golang/internal/graphql/generated/models.go`
3. `git add apps/golang/internal/graphql/resolvers/master.resolvers.go apps/golang/internal/graphql/resolvers/block_treatment_workflow_guardrail_test.go apps/golang/internal/graphql/resolvers/block_treatment_workflow_integration_test.go`
4. `git add apps/golang/internal/master/models/master_models.go apps/golang/internal/master/resolvers/master_resolver.go apps/golang/internal/master/services/master_service.go apps/golang/internal/master/services/master_service_tariff_decision_guardrail_test.go`
5. `git add apps/golang/pkg/database/migrations/000065_create_block_treatment_request_workflow.go`
6. `git add -p apps/golang/pkg/database/migrations.go` lalu pilih hanya hunk `Migration000065CreateBlockTreatmentRequestWorkflow`.
7. `git commit -m "feat(golang): add semester block treatment workflow with guarded transitions and tests"`

## PR 2: Web UI + Docs

Target commit:
- `apps/web/features/master-data/components/BlockTreatmentWorkflowPage.tsx`
- `apps/web/features/master-data/components/CompanyAdminBlocksTabsPage.tsx`
- `apps/web/components/role-adapters/PageAdapter.tsx`
- `docs/block-treatment-rollout-checklist.md`

Perintah yang disarankan:
1. `git add apps/web/features/master-data/components/BlockTreatmentWorkflowPage.tsx`
2. `git add apps/web/features/master-data/components/CompanyAdminBlocksTabsPage.tsx apps/web/components/role-adapters/PageAdapter.tsx`
3. `git add docs/block-treatment-rollout-checklist.md`
4. `git commit -m "feat(web): add block treatment workflow page and role routing"`

## Catatan

- File `apps/golang/pkg/database/migrations.go` di worktree saat ini berisi banyak perubahan lain. Untuk menjaga PR bersih, gunakan `git add -p` agar hanya registrasi migration `000065` yang ikut.
