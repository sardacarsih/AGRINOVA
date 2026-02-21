//go:build tools
// +build tools

// Package tools tracks code generation tool dependencies.
// This file ensures that `go mod` includes the tools we use for code generation,
// making builds reproducible across different environments and team members.
//
// These imports are never used in actual code, but they ensure that:
// 1. The tools are versioned in go.mod
// 2. The tools are downloaded with `go mod download`
// 3. The tools can be run with `go run github.com/tool/path`
//
// To use these tools:
//   - GraphQL generation: go run github.com/99designs/gqlgen generate
//   - Mock generation: go run github.com/vektra/mockery/v2
//   - Or use Makefile targets: make gen-graphql, make gen-mocks, make gen-all
package tools

import (
	// GraphQL code generator - generates resolvers, models, and execution code
	_ "github.com/99designs/gqlgen"
	_ "github.com/99designs/gqlgen/graphql/introspection"

	// Mock generator - generates test mocks for interfaces
	_ "github.com/vektra/mockery/v2"
)
