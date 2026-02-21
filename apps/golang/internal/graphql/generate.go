package graphql

// This file contains go:generate directives for GraphQL code generation.
//
// The gqlgen tool reads the configuration from gqlgen.yml (located at the project root)
// and generates the following files:
//   - generated/generated.go       - GraphQL execution code
//   - generated/models.go          - GraphQL model types
//   - generated/gorm_models.go     - GORM-compatible model extensions
//   - resolvers/*.resolvers.go     - Resolver implementations (follow-schema layout)
//
// To regenerate GraphQL code:
//   - Run: go generate ./internal/graphql
//   - Or: make gen-graphql
//   - Or: make gen-all (generates everything)
//
// IMPORTANT: The following files are manually maintained and should NOT be regenerated:
//   - generated/user_extension.go  - Custom user type extensions
//   - generated/gorm_extensions.go - Custom GORM helpers
//
// Schema files are located in: internal/graphql/schema/*.graphql
// Configuration file: gqlgen.yml (project root)

//go:generate go run github.com/99designs/gqlgen generate
