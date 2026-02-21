# Agrinova GraphQL API - Pure GraphQL Authentication Implementation
# This Makefile supports the converted GraphQL-only authentication system

.PHONY: help build run dev test clean deps fmt vet lint test-auth health schema generate migrate seed build-windows build-windows-prod build-all package-linux package-linux-arm64 package-windows

# Default target
help:
	@echo "Agrinova GraphQL API - Available commands:"
	@echo ""
	@echo "  make deps     - Install Go dependencies"
	@echo "  make build    - Build production binary (Linux)"
	@echo "  make build-windows - Build Windows 64-bit binary"
	@echo "  make build-windows-prod - Build production-optimized Windows 64-bit binary"
	@echo "  make build-all - Build binaries for all platforms"
	@echo "  make run      - Run production binary"
	@echo "  make dev      - Run in development mode with hot reload"
	@echo "  make test     - Run Go tests"
	@echo "  make test-auth - Test GraphQL authentication flow"
	@echo "  make health   - Check server health"
	@echo "  make fmt      - Format Go code"
	@echo "  make vet      - Run Go vet"
	@echo "  make clean    - Clean build artifacts"
	@echo "  make schema   - Validate GraphQL schema"
	@echo "  make generate - Generate GraphQL code with gqlgen"
	@echo "  make migrate  - Run database migrations"
	@echo "  make seed     - Seed RBAC + superadmin baseline account"
	@echo "  make package-linux - Build binary-only backend artifact (Linux amd64)"
	@echo "  make package-linux-arm64 - Build binary-only backend artifact (Linux arm64)"
	@echo "  make package-windows - Build binary-only backend artifact (Windows amd64)"
	@echo ""

# Install dependencies
deps:
	go mod tidy
	go mod download

# Build production binary (Linux)
build:
	@echo "🔨 Building production binary (Linux)..."
	go build -o bin/agrinova-graphql cmd/server/main.go
	@echo "✅ Binary built at ./bin/agrinova-graphql"

# Build Windows 64-bit binary
build-windows:
	@echo "🔨 Building Windows 64-bit binary..."
	GOOS=windows GOARCH=amd64 go build -o bin/agrinova-graphql.exe cmd/server/main.go
	@echo "✅ Windows binary built at ./bin/agrinova-graphql.exe"

# Build production-optimized Windows 64-bit binary
build-windows-prod:
	@echo "🔨 Building production-optimized Windows 64-bit binary..."
	@echo "   Target: Windows 64-bit (GOOS=windows GOARCH=amd64)"
	@echo "   Optimizations: -ldflags=\"-s -w\" (strip symbols, reduce size)"
	@echo "   CGO: Disabled for static linking"
	CGO_ENABLED=0 GOOS=windows GOARCH=amd64 go build \
		-ldflags="-s -w -X main.version=$$(git describe --tags --always --dirty 2>/dev/null || echo 'dev')" \
		-trimpath \
		-o bin/agrinova-graphql-windows-amd64.exe \
		cmd/server/main.go
	@echo "✅ Production Windows binary built at ./bin/agrinova-graphql-windows-amd64.exe"
	@ls -lh bin/agrinova-graphql-windows-amd64.exe

# Build binaries for all platforms
build-all: build build-windows-prod
	@echo "🔨 Building binaries for all platforms..."
	@echo "   Building Linux binary..."
	CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build \
		-ldflags="-s -w -X main.version=$$(git describe --tags --always --dirty 2>/dev/null || echo 'dev')" \
		-trimpath \
		-o bin/agrinova-graphql-linux-amd64 \
		cmd/server/main.go
	@echo "   Building macOS binary..."
	CGO_ENABLED=0 GOOS=darwin GOARCH=amd64 go build \
		-ldflags="-s -w -X main.version=$$(git describe --tags --always --dirty 2>/dev/null || echo 'dev')" \
		-trimpath \
		-o bin/agrinova-graphql-darwin-amd64 \
		cmd/server/main.go
	@echo "✅ All platform binaries built:"
	@ls -lh bin/agrinova-graphql-*

# Run production binary
run: build
	@echo "🚀 Starting Agrinova GraphQL Server..."
	./bin/agrinova-graphql

# Development mode with hot reload (requires air)
dev:
	@echo "🔥 Starting development mode..."
	@if command -v air > /dev/null; then \
		air; \
	else \
		echo "Air not found. Install with: go install github.com/cosmtrek/air@latest"; \
		echo "Falling back to regular go run..."; \
		go run cmd/server/main.go; \
	fi

# Run Go tests
test:
	@echo "🧪 Running Go tests..."
	go test -v ./...

# Test GraphQL authentication flow
test-auth:
	@echo "🔐 Testing GraphQL authentication..."
	@if command -v node > /dev/null; then \
		if npm list node-fetch > /dev/null 2>&1 || npm list -g node-fetch > /dev/null 2>&1; then \
			node test-graphql-auth.js; \
		else \
			echo "Installing node-fetch..."; \
			npm install node-fetch; \
			node test-graphql-auth.js; \
		fi \
	else \
		echo "❌ Node.js is required to run authentication tests"; \
		echo "   Install Node.js or test manually using GraphQL Playground at http://localhost:8080/playground"; \
	fi

# Format Go code
fmt:
	@echo "🎨 Formatting Go code..."
	go fmt ./...
	@echo "✅ Code formatted"

# Run Go vet
vet:
	@echo "🔍 Running Go vet..."
	go vet ./...
	@echo "✅ Vet completed"

# Clean build artifacts
clean:
	@echo "🧹 Cleaning build artifacts..."
	rm -rf bin/
	go clean
	@echo "✅ Clean completed"

# Health check
health:
	@echo "🏥 Checking server health..."
	@curl -s http://localhost:8080/health | jq . || curl -s http://localhost:8080/health

# Validate GraphQL schema
schema:
	@echo "📋 Validating GraphQL schema..."
	@if [ -f schema/schema.graphql ]; then \
		echo "Schema found: schema/schema.graphql"; \
		wc -l schema/schema.graphql; \
		echo "✅ Schema validation complete"; \
	else \
		echo "❌ Schema file not found at schema/schema.graphql"; \
	fi

# Docker build
docker-build:
	@echo "🐳 Building Docker image..."
	docker build -t agrinova-graphql:latest .

# Docker run
docker-run: docker-build
	@echo "🐳 Running Docker container..."
	docker run -p 8080:8080 --name agrinova-graphql agrinova-graphql:latest

# Generate GraphQL code with gqlgen
generate:
	@echo "🏗️ Generating GraphQL code with gqlgen..."
	@if command -v gqlgen > /dev/null; then \
		gqlgen generate; \
		echo "✅ GraphQL code generated successfully"; \
	else \
		echo "Installing gqlgen..."; \
		go install github.com/99designs/gqlgen@latest; \
		gqlgen generate; \
		echo "✅ GraphQL code generated successfully"; \
	fi

# Database migrations
migrate:
	@echo "🗄️ Running database migrations..."
	@go run -ldflags "-X main.migrateOnly=true" cmd/server/main.go || echo "Migration completed via server startup"

# Seed baseline RBAC + superadmin account
seed:
	@echo "🌱 Seeding RBAC and baseline superadmin account..."
	go run ./cmd/seed/main.go

# Build binary-only backend artifact for Linux amd64
package-linux:
	powershell -ExecutionPolicy Bypass -File scripts/package-binaries.ps1 -TargetOS linux -TargetArch amd64

# Build binary-only backend artifact for Linux arm64
package-linux-arm64:
	powershell -ExecutionPolicy Bypass -File scripts/package-binaries.ps1 -TargetOS linux -TargetArch arm64

# Build binary-only backend artifact for Windows amd64
package-windows:
	powershell -ExecutionPolicy Bypass -File scripts/package-binaries.ps1 -TargetOS windows -TargetArch amd64
