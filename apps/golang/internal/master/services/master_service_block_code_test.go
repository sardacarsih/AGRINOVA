package services

import (
	"fmt"
	"strings"
	"testing"
)

func TestParseBlockSequence(t *testing.T) {
	tests := []struct {
		name         string
		blockCode    string
		divisionCode string
		want         int
		wantErr      bool
	}{
		{
			name:         "valid format",
			blockCode:    "MSLKEBUN10015",
			divisionCode: "MSLKEBUN10",
			want:         15,
		},
		{
			name:         "case insensitive",
			blockCode:    "mslkebun10099",
			divisionCode: "MSLKEBUN10",
			want:         99,
		},
		{
			name:         "invalid when suffix missing",
			blockCode:    "DIVA",
			divisionCode: "DIVA",
			wantErr:      true,
		},
		{
			name:         "invalid when suffix non numeric",
			blockCode:    "DIVAABC",
			divisionCode: "DIVA",
			wantErr:      true,
		},
		{
			name:         "invalid when prefix mismatch",
			blockCode:    "DIVB001",
			divisionCode: "DIVA",
			wantErr:      true,
		},
		{
			name:         "invalid when suffix is more than 3 digits",
			blockCode:    "DIVA1000",
			divisionCode: "DIVA",
			wantErr:      true,
		},
		{
			name:         "invalid when suffix bigger than 999",
			blockCode:    "DIVA9999",
			divisionCode: "DIVA",
			wantErr:      true,
		},
	}

	for _, tt := range tests {
		tt := tt
		t.Run(tt.name, func(t *testing.T) {
			got, err := parseBlockSequence(tt.blockCode, tt.divisionCode)
			if tt.wantErr {
				if err == nil {
					t.Fatalf("expected error, got nil")
				}
				return
			}
			if err != nil {
				t.Fatalf("unexpected error: %v", err)
			}
			if got != tt.want {
				t.Fatalf("expected %d, got %d", tt.want, got)
			}
		})
	}
}

func TestNextAutoBlockCodeForEstate(t *testing.T) {
	tests := []struct {
		name           string
		divisionCode   string
		existingBlocks []estateBlockCodeRow
		want           string
		wantErr        bool
	}{
		{
			name:         "sequence increments across divisions in same estate",
			divisionCode: "MSLKEBUN10",
			existingBlocks: []estateBlockCodeRow{
				{ID: "1", BlockCode: "MSLKEBUN10010", DivisionCode: "MSLKEBUN10"},
				{ID: "2", BlockCode: "MSLKEBUN11015", DivisionCode: "MSLKEBUN11"},
				{ID: "3", BlockCode: "MSLKEBUN12014", DivisionCode: "MSLKEBUN12"},
			},
			want: "MSLKEBUN10016",
		},
		{
			name:         "ignores malformed existing codes",
			divisionCode: "DIVA",
			existingBlocks: []estateBlockCodeRow{
				{ID: "1", BlockCode: "DIVA001", DivisionCode: "DIVA"},
				{ID: "2", BlockCode: "BROKEN", DivisionCode: "DIVB"},
				{ID: "3", BlockCode: "DIVCXYZ", DivisionCode: "DIVC"},
			},
			want: "DIVA002",
		},
		{
			name:         "error when division code empty",
			divisionCode: "   ",
			existingBlocks: []estateBlockCodeRow{
				{ID: "1", BlockCode: "DIVA001", DivisionCode: "DIVA"},
			},
			wantErr: true,
		},
		{
			name:         "error when generated code exceeds max length",
			divisionCode: strings.Repeat("A", 50),
			existingBlocks: []estateBlockCodeRow{
				{ID: "1", BlockCode: "DIV001", DivisionCode: "DIV"},
			},
			wantErr: true,
		},
		{
			name:         "reuse smallest available sequence when max reaches 999",
			divisionCode: "DIVA",
			existingBlocks: []estateBlockCodeRow{
				{ID: "1", BlockCode: "DIVA999", DivisionCode: "DIVA"},
			},
			want: "DIVA001",
		},
		{
			name:         "error when estate sequence 001-999 is fully used",
			divisionCode: "DIVA",
			existingBlocks: func() []estateBlockCodeRow {
				rows := make([]estateBlockCodeRow, 0, blockSequenceMax)
				for i := 1; i <= blockSequenceMax; i++ {
					rows = append(rows, estateBlockCodeRow{
						ID:           strings.Repeat("x", 1),
						BlockCode:    "DIVA" + fmt.Sprintf("%03d", i),
						DivisionCode: "DIVA",
					})
				}
				return rows
			}(),
			wantErr: true,
		},
	}

	for _, tt := range tests {
		tt := tt
		t.Run(tt.name, func(t *testing.T) {
			got, err := nextAutoBlockCodeForEstate(tt.divisionCode, tt.existingBlocks)
			if tt.wantErr {
				if err == nil {
					t.Fatalf("expected error, got nil")
				}
				return
			}
			if err != nil {
				t.Fatalf("unexpected error: %v", err)
			}
			if got != tt.want {
				t.Fatalf("expected %q, got %q", tt.want, got)
			}
		})
	}
}
