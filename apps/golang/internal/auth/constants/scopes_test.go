package constants

import (
	"reflect"
	"testing"
)

func TestGetRequiredScopesForIntegrationFinance(t *testing.T) {
	expected := []string{
		ScopeFinanceRead,
		ScopeFinanceCreate,
		ScopeFinanceUpdate,
		ScopeFinanceSync,
	}

	got := GetRequiredScopesForIntegration(IntegrationTypeFinance)
	if !reflect.DeepEqual(got, expected) {
		t.Fatalf("unexpected required finance scopes: got=%v expected=%v", got, expected)
	}
}

func TestValidateScopesFinance(t *testing.T) {
	tests := []struct {
		name            string
		scopes          []string
		wantValid       bool
		wantInvalidList []string
	}{
		{
			name: "all finance scopes are valid",
			scopes: []string{
				ScopeFinanceRead,
				ScopeFinanceCreate,
				ScopeFinanceUpdate,
				ScopeFinanceSync,
				ScopeSyncStatus,
			},
			wantValid:       true,
			wantInvalidList: []string{},
		},
		{
			name: "unknown finance scope is invalid",
			scopes: []string{
				ScopeFinanceRead,
				"finance:delete",
			},
			wantValid:       false,
			wantInvalidList: []string{"finance:delete"},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			valid, invalidScopes := ValidateScopes(tt.scopes)
			if valid != tt.wantValid {
				t.Fatalf("unexpected validity: got=%v expected=%v", valid, tt.wantValid)
			}
			if !reflect.DeepEqual(invalidScopes, tt.wantInvalidList) {
				t.Fatalf("unexpected invalid scopes: got=%v expected=%v", invalidScopes, tt.wantInvalidList)
			}
		})
	}
}
