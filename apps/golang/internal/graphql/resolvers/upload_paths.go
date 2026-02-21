package resolvers

import (
	"path"
	"path/filepath"
	"strings"
)

const defaultUploadsDir = "./uploads"

func normalizeUploadsRoot(dir string) string {
	trimmed := strings.TrimSpace(dir)
	if trimmed == "" {
		return defaultUploadsDir
	}

	cleaned := filepath.Clean(trimmed)
	if cleaned == "." {
		return defaultUploadsDir
	}

	return cleaned
}

func (r *Resolver) uploadsRootDir() string {
	return normalizeUploadsRoot(r.uploadsDir)
}

func (r *Resolver) uploadAbsolutePath(parts ...string) string {
	segments := make([]string, 0, len(parts)+1)
	segments = append(segments, r.uploadsRootDir())
	segments = append(segments, parts...)
	return filepath.Join(segments...)
}

func uploadURLPath(parts ...string) string {
	cleaned := make([]string, 0, len(parts)+1)
	cleaned = append(cleaned, "uploads")

	for _, part := range parts {
		normalized := strings.Trim(strings.ReplaceAll(part, "\\", "/"), "/")
		if normalized == "" {
			continue
		}
		cleaned = append(cleaned, normalized)
	}

	return "/" + path.Join(cleaned...)
}
