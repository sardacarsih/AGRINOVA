package routes

import (
	"bytes"
	"image"
	"image/color"
	"image/jpeg"
	"strings"
	"testing"
)

func TestDetectThemeAssetContentType(t *testing.T) {
	t.Parallel()

	tests := []struct {
		name     string
		fileName string
		content  []byte
		want     string
		notWant  string
	}{
		{
			name:     "accepts svg by extension with svg root",
			fileName: "mobile-background.svg",
			content:  []byte(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1080 2400"></svg>`),
			want:     "image/svg+xml",
		},
		{
			name:     "accepts svg with utf8 bom",
			fileName: "mobile-background.svg",
			content:  append([]byte{0xEF, 0xBB, 0xBF}, []byte(`<svg xmlns="http://www.w3.org/2000/svg"></svg>`)...),
			want:     "image/svg+xml",
		},
		{
			name:     "accepts svg by root even without svg extension",
			fileName: "mobile-background.txt",
			content:  []byte(`<?xml version="1.0"?><svg xmlns="http://www.w3.org/2000/svg"></svg>`),
			want:     "image/svg+xml",
		},
		{
			name:     "keeps non svg html content",
			fileName: "fake.svg",
			content:  []byte(`<html><body><svg xmlns="http://www.w3.org/2000/svg"></svg></body></html>`),
			notWant:  "image/svg+xml",
		},
		{
			name:     "keeps png content type",
			fileName: "asset.png",
			content:  []byte{0x89, 'P', 'N', 'G', '\r', '\n', 0x1a, '\n', 0, 0, 0, 0},
			want:     "image/png",
		},
	}

	for _, tc := range tests {
		tc := tc
		t.Run(tc.name, func(t *testing.T) {
			t.Parallel()

			got := detectThemeAssetContentType(tc.content, tc.fileName)
			if tc.want != "" && got != tc.want {
				t.Fatalf("detectThemeAssetContentType() = %q, want %q", got, tc.want)
			}
			if tc.notWant != "" && got == tc.notWant {
				t.Fatalf("detectThemeAssetContentType() = %q, expected different content type", got)
			}
		})
	}
}

func TestValidateSafeSVG(t *testing.T) {
	t.Parallel()

	tests := []struct {
		name         string
		content      []byte
		wantErr      bool
		wantContains string
	}{
		{
			name:    "valid svg",
			content: []byte(`<svg xmlns="http://www.w3.org/2000/svg"><rect width="10" height="10"/></svg>`),
		},
		{
			name:    "valid svg with utf8 bom",
			content: append([]byte{0xEF, 0xBB, 0xBF}, []byte(`<svg xmlns="http://www.w3.org/2000/svg"></svg>`)...),
		},
		{
			name:         "empty svg rejected",
			content:      []byte(`   `),
			wantErr:      true,
			wantContains: "svg file is empty",
		},
		{
			name:         "invalid root rejected",
			content:      []byte(`<html><body><svg></svg></body></html>`),
			wantErr:      true,
			wantContains: "invalid svg document",
		},
		{
			name:         "script tag rejected",
			content:      []byte(`<svg><script>alert(1)</script></svg>`),
			wantErr:      true,
			wantContains: "disallowed",
		},
		{
			name:         "event handler rejected",
			content:      []byte(`<svg onload="alert(1)"></svg>`),
			wantErr:      true,
			wantContains: "disallowed",
		},
	}

	for _, tc := range tests {
		tc := tc
		t.Run(tc.name, func(t *testing.T) {
			t.Parallel()

			err := validateSafeSVG(tc.content)
			if tc.wantErr {
				if err == nil {
					t.Fatalf("validateSafeSVG() expected error")
				}
				if tc.wantContains != "" && !strings.Contains(strings.ToLower(err.Error()), strings.ToLower(tc.wantContains)) {
					t.Fatalf("validateSafeSVG() error = %q, want to contain %q", err.Error(), tc.wantContains)
				}
				return
			}

			if err != nil {
				t.Fatalf("validateSafeSVG() unexpected error: %v", err)
			}
		})
	}
}

func TestTransformThemeAssetForUploadSVG(t *testing.T) {
	t.Parallel()

	largeSVG := `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 300">` +
		strings.Repeat("<!--0123456789-->", 200000) +
		`<rect width="100" height="300"/></svg>`
	if len(largeSVG) <= themeAssetMaxUploadSize {
		t.Fatalf("test setup invalid: svg size %d should be larger than %d", len(largeSVG), themeAssetMaxUploadSize)
	}

	contentType, content, err := transformThemeAssetForUpload("image/svg+xml", []byte(largeSVG), "mobile", "backgroundImage")
	if err != nil {
		t.Fatalf("transformThemeAssetForUpload() unexpected error: %v", err)
	}
	if contentType != "image/svg+xml" {
		t.Fatalf("contentType = %q, want image/svg+xml", contentType)
	}
	if len(content) > themeAssetMaxUploadSize {
		t.Fatalf("optimized size = %d, should be <= %d", len(content), themeAssetMaxUploadSize)
	}
}

func TestTransformThemeAssetForUploadSVGBestEffortWhenStillLarge(t *testing.T) {
	t.Parallel()

	largePath := strings.Repeat("L1 1 ", 500000)
	largeSVG := `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1080 2400"><path d="M0 0 ` + largePath + `"/></svg>`
	if len(largeSVG) <= themeAssetMaxUploadSize {
		t.Fatalf("test setup invalid: svg size %d should be larger than %d", len(largeSVG), themeAssetMaxUploadSize)
	}

	contentType, content, err := transformThemeAssetForUpload("image/svg+xml", []byte(largeSVG), "mobile", "backgroundImage")
	if err != nil {
		t.Fatalf("transformThemeAssetForUpload() unexpected error: %v", err)
	}
	if contentType != "image/svg+xml" {
		t.Fatalf("contentType = %q, want image/svg+xml", contentType)
	}
	if len(content) <= themeAssetMaxUploadSize {
		t.Fatalf("optimized size = %d, should remain > %d for best-effort case", len(content), themeAssetMaxUploadSize)
	}
}

func TestTransformThemeAssetForUploadJPEG(t *testing.T) {
	t.Parallel()

	sourceImage := image.NewRGBA(image.Rect(0, 0, 3200, 2200))
	for y := 0; y < 2200; y++ {
		for x := 0; x < 3200; x++ {
			sourceImage.SetRGBA(x, y, color.RGBA{
				R: uint8((x*y + y) % 255),
				G: uint8((x + 2*y) % 255),
				B: uint8((x + y*3) % 255),
				A: 255,
			})
		}
	}

	var source bytes.Buffer
	if err := jpeg.Encode(&source, sourceImage, &jpeg.Options{Quality: 100}); err != nil {
		t.Fatalf("failed to build source jpeg: %v", err)
	}
	if source.Len() <= themeAssetMaxUploadSize {
		t.Fatalf("test setup invalid: jpeg size %d should be larger than %d", source.Len(), themeAssetMaxUploadSize)
	}

	contentType, content, err := transformThemeAssetForUpload("image/jpeg", source.Bytes(), "web", "backgroundImage")
	if err != nil {
		t.Fatalf("transformThemeAssetForUpload() unexpected error: %v", err)
	}
	if contentType != "image/jpeg" {
		t.Fatalf("contentType = %q, want image/jpeg", contentType)
	}
	if len(content) > themeAssetMaxUploadSize {
		t.Fatalf("optimized size = %d, should be <= %d", len(content), themeAssetMaxUploadSize)
	}
}

func TestTransformThemeAssetForUploadUnsupportedServerOptimization(t *testing.T) {
	t.Parallel()

	oversized := make([]byte, themeAssetMaxUploadSize+100)
	_, _, err := transformThemeAssetForUpload("image/webp", oversized, "web", "backgroundImage")
	if err == nil {
		t.Fatalf("expected error for unsupported server optimization")
	}
	if !strings.Contains(strings.ToLower(err.Error()), "not supported") {
		t.Fatalf("unexpected error message: %v", err)
	}
}
