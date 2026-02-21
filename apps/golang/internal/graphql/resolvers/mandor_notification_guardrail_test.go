package resolvers

import (
	"context"
	"go/ast"
	"go/parser"
	"go/token"
	"path/filepath"
	"runtime"
	"testing"
	"time"

	graphqlAuth "agrinovagraphql/server/internal/graphql/domain/auth"
	graphqlMaster "agrinovagraphql/server/internal/graphql/domain/master"
	notifServices "agrinovagraphql/server/internal/notifications/services"
	panenModels "agrinovagraphql/server/internal/panen/models"
)

type asistenNotificationCall struct {
	harvestID  string
	mandorID   string
	mandorName string
	blockName  string
	bunchCount int32
}

type captureHarvestNotifier struct {
	calls chan asistenNotificationCall
}

func (m *captureHarvestNotifier) NotifyAsistenNewHarvest(
	_ context.Context,
	harvestID string,
	mandorID string,
	mandorName string,
	blockName string,
	bunchCount int32,
) error {
	m.calls <- asistenNotificationCall{
		harvestID:  harvestID,
		mandorID:   mandorID,
		mandorName: mandorName,
		blockName:  blockName,
		bunchCount: bunchCount,
	}
	return nil
}

func waitForNotificationCall(
	t *testing.T,
	notifier *captureHarvestNotifier,
) asistenNotificationCall {
	t.Helper()

	select {
	case call := <-notifier.calls:
		return call
	case <-time.After(2 * time.Second):
		t.Fatal("timeout waiting for NotifyAsistenNewHarvest call")
		return asistenNotificationCall{}
	}
}

func TestNotifyAsistenHarvestCreated_SendsExpectedPayload(t *testing.T) {
	notifier := &captureHarvestNotifier{
		calls: make(chan asistenNotificationCall, 1),
	}

	mutation := &mutationResolver{
		Resolver: &Resolver{
			FCMNotificationService: notifier,
		},
	}

	record := &panenModels.HarvestRecord{
		ID:            "harvest-001",
		MandorID:      "mandor-001",
		BeratTbs:      345.6,
		JumlahJanjang: 123,
		Mandor: &graphqlAuth.User{
			Name: "Mandor Alpha",
		},
		Block: &graphqlMaster.Block{
			Name: "Blok A1",
		},
	}

	mutation.notifyAsistenHarvestCreated(context.Background(), record)
	call := waitForNotificationCall(t, notifier)

	if call.harvestID != "harvest-001" {
		t.Fatalf("unexpected harvestID: got %q", call.harvestID)
	}
	if call.mandorID != "mandor-001" {
		t.Fatalf("unexpected mandorID: got %q", call.mandorID)
	}
	if call.mandorName != "Mandor Alpha" {
		t.Fatalf("unexpected mandorName: got %q", call.mandorName)
	}
	if call.blockName != "Blok A1" {
		t.Fatalf("unexpected blockName: got %q", call.blockName)
	}
	if call.bunchCount != 123 {
		t.Fatalf("unexpected bunchCount: got %d", call.bunchCount)
	}
}

func TestNotifyAsistenHarvestCreated_UsesFallbackNames(t *testing.T) {
	notifier := &captureHarvestNotifier{
		calls: make(chan asistenNotificationCall, 1),
	}

	mutation := &mutationResolver{
		Resolver: &Resolver{
			FCMNotificationService: notifier,
		},
	}

	record := &panenModels.HarvestRecord{
		ID:            "harvest-002",
		MandorID:      "mandor-002",
		BeratTbs:      100,
		JumlahJanjang: 50,
	}

	mutation.notifyAsistenHarvestCreated(context.Background(), record)
	call := waitForNotificationCall(t, notifier)

	if call.mandorName != "Mandor" {
		t.Fatalf("expected default mandor name, got %q", call.mandorName)
	}
	if call.blockName != "Block" {
		t.Fatalf("expected default block name, got %q", call.blockName)
	}
}

func TestMandorResolvers_KeepNotificationCallsInCreateAndSyncFlow(t *testing.T) {
	_, currentFile, _, ok := runtime.Caller(0)
	if !ok {
		t.Fatal("failed to resolve current file path")
	}

	targetFile := filepath.Join(filepath.Dir(currentFile), "mandor.resolvers.go")
	fset := token.NewFileSet()
	node, err := parser.ParseFile(fset, targetFile, nil, 0)
	if err != nil {
		t.Fatalf("failed to parse mandor.resolvers.go: %v", err)
	}

	targetFunctions := map[string]bool{
		"CreateMandorHarvest": false,
		"CreateHarvestRecord": false,
		"SyncHarvestRecords":  false,
	}

	for _, decl := range node.Decls {
		funcDecl, ok := decl.(*ast.FuncDecl)
		if !ok || funcDecl.Recv == nil || funcDecl.Body == nil {
			continue
		}
		if _, exists := targetFunctions[funcDecl.Name.Name]; !exists {
			continue
		}
		if !isMutationResolverMethod(funcDecl) {
			continue
		}

		if containsNotifyCall(funcDecl.Body) {
			targetFunctions[funcDecl.Name.Name] = true
		}
	}

	for functionName, found := range targetFunctions {
		if !found {
			t.Fatalf(
				"guardrail failed: %s must call notifyAsistenHarvestCreated",
				functionName,
			)
		}
	}
}

func isMutationResolverMethod(funcDecl *ast.FuncDecl) bool {
	for _, field := range funcDecl.Recv.List {
		starExpr, ok := field.Type.(*ast.StarExpr)
		if !ok {
			continue
		}
		ident, ok := starExpr.X.(*ast.Ident)
		if !ok {
			continue
		}
		if ident.Name == "mutationResolver" {
			return true
		}
	}
	return false
}

func containsNotifyCall(block *ast.BlockStmt) bool {
	found := false
	ast.Inspect(block, func(n ast.Node) bool {
		call, ok := n.(*ast.CallExpr)
		if !ok {
			return true
		}
		selector, ok := call.Fun.(*ast.SelectorExpr)
		if !ok {
			return true
		}
		if selector.Sel.Name == "notifyAsistenHarvestCreated" {
			found = true
			return false
		}
		return true
	})
	return found
}

func TestNotifyAsistenHarvestCreated_SkipsTypedNilNotifier(t *testing.T) {
	var typedNilNotifier *notifServices.FCMNotificationService
	mutation := &mutationResolver{
		Resolver: &Resolver{
			FCMNotificationService: typedNilNotifier,
		},
	}

	record := &panenModels.HarvestRecord{
		ID:       "harvest-typed-nil",
		MandorID: "mandor-typed-nil",
	}

	mutation.notifyAsistenHarvestCreated(context.Background(), record)

	// Give enough time for async goroutines (if any) to run.
	time.Sleep(100 * time.Millisecond)
}
