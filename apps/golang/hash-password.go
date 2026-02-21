package main

import (
	"crypto/rand"
	"encoding/base64"
	"fmt"
	"log"

	"golang.org/x/crypto/argon2"
)

func main() {
	password := "demo123"
	hash, err := hashPassword(password)
	if err != nil {
		log.Fatalf("Failed to hash password: %v", err)
	}
	
	fmt.Printf("Password: %s\n", password)
	fmt.Printf("Hash: %s\n", hash)
}

func hashPassword(password string) (string, error) {
	// Argon2id parameters (matching PasswordService defaults)
	memory := uint32(64 * 1024) // 64MB
	iterations := uint32(3)     // 3 iterations
	parallelism := uint8(2)     // 2 threads
	saltLength := uint32(16)    // 16 bytes salt
	keyLength := uint32(32)     // 32 bytes key
	
	// Generate a random salt
	salt, err := generateRandomBytes(saltLength)
	if err != nil {
		return "", fmt.Errorf("failed to generate salt: %w", err)
	}

	// Generate the hash using Argon2id
	hash := argon2.IDKey([]byte(password), salt, iterations, memory, parallelism, keyLength)

	// Encode salt and hash to base64
	b64Salt := base64.RawStdEncoding.EncodeToString(salt)
	b64Hash := base64.RawStdEncoding.EncodeToString(hash)

	// Return the encoded hash in the format:
	// $argon2id$v=19$m=65536,t=3,p=2$salt$hash
	encodedHash := fmt.Sprintf("$argon2id$v=%d$m=%d,t=%d,p=%d$%s$%s",
		argon2.Version, memory, iterations, parallelism, b64Salt, b64Hash)

	return encodedHash, nil
}

func generateRandomBytes(n uint32) ([]byte, error) {
	b := make([]byte, n)
	_, err := rand.Read(b)
	if err != nil {
		return nil, err
	}
	return b, nil
}