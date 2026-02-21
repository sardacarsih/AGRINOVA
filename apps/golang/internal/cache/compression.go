package cache

import (
	"bytes"
	"compress/gzip"
	"encoding/base64"
	"fmt"
	"io"
)

// Compressor handles gzip compression for cache values
type Compressor struct {
	compressionLevel int
}

// NewCompressor creates a new compressor with default compression level
func NewCompressor() *Compressor {
	return &Compressor{
		compressionLevel: gzip.BestCompression,
	}
}

// Compress compresses a string value using gzip
func (c *Compressor) Compress(data string) (string, error) {
	var buf bytes.Buffer

	// Create gzip writer
	writer, err := gzip.NewWriterLevel(&buf, c.compressionLevel)
	if err != nil {
		return "", fmt.Errorf("failed to create gzip writer: %w", err)
	}

	// Write data
	if _, err := writer.Write([]byte(data)); err != nil {
		return "", fmt.Errorf("failed to write data: %w", err)
	}

	// Close writer to flush
	if err := writer.Close(); err != nil {
		return "", fmt.Errorf("failed to close writer: %w", err)
	}

	// Encode to base64 for storage
	encoded := base64.StdEncoding.EncodeToString(buf.Bytes())

	return encoded, nil
}

// Decompress decompresses a base64-encoded gzipped string
func (c *Compressor) Decompress(data string) (string, error) {
	// Decode from base64
	decoded, err := base64.StdEncoding.DecodeString(data)
	if err != nil {
		return "", fmt.Errorf("failed to decode base64: %w", err)
	}

	// Create gzip reader
	reader, err := gzip.NewReader(bytes.NewReader(decoded))
	if err != nil {
		return "", fmt.Errorf("failed to create gzip reader: %w", err)
	}
	defer reader.Close()

	// Read decompressed data
	decompressed, err := io.ReadAll(reader)
	if err != nil {
		return "", fmt.Errorf("failed to read data: %w", err)
	}

	return string(decompressed), nil
}
