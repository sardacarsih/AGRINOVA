# Agrinova GraphQL Server (Go Implementation)

## Project Overview

This is the Go-based GraphQL server implementation for the Agrinova palm oil harvest management system. It provides a comprehensive authentication system, domain-based GraphQL schema, and serves as the backend API for both web and mobile applications.

The server implements:
- Pure GraphQL authentication with JWT tokens
- Multi-role user management (Super Admin, Company Admin, Manager, Mandor, Asisten, Satpam)
- Device binding and security for mobile applications
- Role-based access control (RBAC)
- Secure password handling with Argon2id
- Rate limiting and security logging
- CORS and CSRF protection

## Tech Stack

- **Go 1.24+** - Programming language
- **Gin** - HTTP web framework
- **GraphQL (gqlgen)** - API query language and runtime
- **PostgreSQL** - Primary database
- **Viper** - Configuration management
- **JWT** - Authentication tokens
- **Argon2id** - Password hashing

## Project Structure

```
apps/golang/
├── cmd/server/              # Main application entry point
├── internal/                # Internal application code
│   ├── auth/               # Authentication domain
│   ├── graphql/            # GraphQL schema and resolvers
│   │   ├── schema/         # GraphQL schema files (.graphqls)
│   │   ├── generated/      # Auto-generated GraphQL code
│   │   └── resolvers/      # GraphQL resolver implementations
│   ├── middleware/         # Gin middleware
│   └── [domain]/           # Other domain modules (panen, gatecheck, etc.)
├── pkg/                    # Shared packages
│   ├── config/             # Configuration management
│   ├── database/           # Database connection
│   └── logger/             # Logging utilities
├── docs/                   # Documentation and API specs
└── gqlgen.yml              # GraphQL generator configuration
```

## Configuration

The server can be configured through:
1. Environment variables (highest precedence)
2. YAML configuration files
3. Default values

Key configuration files:
- `.env` - Environment variables
- `config.yaml` - YAML configuration
- `gqlgen.yml` - GraphQL generator settings

## Building and Running

### Prerequisites
- Go 1.24+
- PostgreSQL database
- Environment variables properly configured

### Development Setup

1. Install dependencies:
   ```bash
   make deps
   ```

2. Run in development mode (with hot reload):
   ```bash
   make dev
   ```

### Production Build

1. Build the binary:
   ```bash
   make build
   ```

2. Run the production binary:
   ```bash
   make run
   ```

### Other Commands

```bash
# Format code
make fmt

# Run tests
make test

# Validate GraphQL schema
make schema

# Generate GraphQL code
make generate

# Clean build artifacts
make clean
```

## GraphQL API

The GraphQL API is available at `/graphql` endpoint with:
- Playground at `/playground` (in development mode)
- Schema-first development using gqlgen
- Comprehensive authentication and authorization
- Device binding for mobile security

### Authentication Flow

1. Authenticate with `login` mutation
2. Receive JWT tokens (access, refresh, optional offline)
3. Use access token in `Authorization: Bearer <token>` header
4. Refresh tokens with `refreshToken` mutation before expiration
5. Logout with `logout` or `logoutAllDevices` mutations

## Security Features

- JWT token authentication with separate secrets for access/refresh/offline
- Device binding with fingerprinting for mobile apps
- Rate limiting to prevent brute force attacks
- CSRF protection for web clients
- Secure password hashing with Argon2id
- Comprehensive security headers
- Detailed security logging

## Environment Variables

Key environment variables (see `.env.example` for full list):
- `JWT_ACCESS_SECRET` - Secret for signing access tokens
- `JWT_REFRESH_SECRET` - Secret for signing refresh tokens
- `DATABASE_PASSWORD` - PostgreSQL database password
- `DEVICE_SECRET` - Secret for device binding
- `CSRF_SECRET` - Secret for CSRF protection

All secrets must be at least 32 characters long in production.