package cache

import (
	"crypto/aes"
	"crypto/cipher"
	"crypto/rand"
	"encoding/base64"
	"fmt"
	"io"
)

// Encryptor handles AES-256-GCM encryption for cache values
type Encryptor struct {
	key []byte
	gcm cipher.AEAD
}

// NewEncryptor creates a new encryptor with the given key
func NewEncryptor(key string) (*Encryptor, error) {
	if len(key) != 32 {
		return nil, fmt.Errorf("key must be exactly 32 bytes for AES-256")
	}

	keyBytes := []byte(key)

	// Create AES cipher
	block, err := aes.NewCipher(keyBytes)
	if err != nil {
		return nil, fmt.Errorf("failed to create cipher: %w", err)
	}

	// Create GCM mode
	gcm, err := cipher.NewGCM(block)
	if err != nil {
		return nil, fmt.Errorf("failed to create GCM: %w", err)
	}

	return &Encryptor{
		key: keyBytes,
		gcm: gcm,
	}, nil
}

// Encrypt encrypts a string value using AES-256-GCM
func (e *Encryptor) Encrypt(plaintext string) (string, error) {
	// Generate nonce
	nonce := make([]byte, e.gcm.NonceSize())
	if _, err := io.ReadFull(rand.Reader, nonce); err != nil {
		return "", fmt.Errorf("failed to generate nonce: %w", err)
	}

	// Encrypt
	ciphertext := e.gcm.Seal(nonce, nonce, []byte(plaintext), nil)

	// Encode to base64 for storage
	encoded := base64.StdEncoding.EncodeToString(ciphertext)

	return encoded, nil
}

// Decrypt decrypts a base64-encoded encrypted string
func (e *Encryptor) Decrypt(ciphertext string) (string, error) {
	// Decode from base64
	decoded, err := base64.StdEncoding.DecodeString(ciphertext)
	if err != nil {
		return "", fmt.Errorf("failed to decode base64: %w", err)
	}

	// Check minimum length
	nonceSize := e.gcm.NonceSize()
	if len(decoded) < nonceSize {
		return "", fmt.Errorf("ciphertext too short")
	}

	// Extract nonce and ciphertext
	nonce, ciphertextBytes := decoded[:nonceSize], decoded[nonceSize:]

	// Decrypt
	plaintext, err := e.gcm.Open(nil, nonce, ciphertextBytes, nil)
	if err != nil {
		return "", fmt.Errorf("failed to decrypt: %w", err)
	}

	return string(plaintext), nil
}
