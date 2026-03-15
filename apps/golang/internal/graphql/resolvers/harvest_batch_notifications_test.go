package resolvers

import "testing"

func TestFormatHarvestBatchBlockSummary(t *testing.T) {
	t.Parallel()

	tests := []struct {
		name   string
		blocks []string
		want   string
	}{
		{
			name:   "empty",
			blocks: nil,
			want:   "beberapa blok",
		},
		{
			name:   "single",
			blocks: []string{"A12"},
			want:   "blok A12",
		},
		{
			name:   "two blocks",
			blocks: []string{"A12", "B07"},
			want:   "blok A12 dan B07",
		},
		{
			name:   "many blocks",
			blocks: []string{"A12", "B07", "C01"},
			want:   "blok A12, B07, dan 1 blok lainnya",
		},
	}

	for _, tt := range tests {
		tt := tt
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()

			if got := formatHarvestBatchBlockSummary(tt.blocks); got != tt.want {
				t.Fatalf("formatHarvestBatchBlockSummary() = %q, want %q", got, tt.want)
			}
		})
	}
}

func TestBuildHarvestBatchNotificationContent(t *testing.T) {
	t.Parallel()

	tests := []struct {
		name        string
		status      harvestBatchStatus
		count       int
		blocks      []string
		totalWeight float64
		approver    string
		reason      string
		wantTitle   string
		wantBody    string
	}{
		{
			name:        "approved summary",
			status:      harvestBatchStatusApproved,
			count:       3,
			blocks:      []string{"A12", "B07"},
			totalWeight: 120.5,
			approver:    "Asisten Beta",
			wantTitle:   "Disetujui 3 data panen",
			wantBody:    "3 data panen Anda di blok A12 dan B07 (120.5 kg) telah disetujui oleh Asisten Beta",
		},
		{
			name:        "rejected summary",
			status:      harvestBatchStatusRejected,
			count:       1,
			blocks:      []string{"A12"},
			totalWeight: 0,
			approver:    "",
			reason:      "Periksa ulang jumlah janjang",
			wantTitle:   "Ditolak 1 data panen",
			wantBody:    "1 data panen Anda di blok A12 telah ditolak oleh Asisten: Periksa ulang jumlah janjang",
		},
	}

	for _, tt := range tests {
		tt := tt
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()

			gotTitle, gotBody := buildHarvestBatchNotificationContent(
				tt.status,
				tt.count,
				tt.blocks,
				tt.totalWeight,
				tt.approver,
				tt.reason,
			)

			if gotTitle != tt.wantTitle {
				t.Fatalf("title = %q, want %q", gotTitle, tt.wantTitle)
			}
			if gotBody != tt.wantBody {
				t.Fatalf("body = %q, want %q", gotBody, tt.wantBody)
			}
		})
	}
}
