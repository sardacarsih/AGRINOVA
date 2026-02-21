package services

import (
	"agrinovagraphql/server/internal/auth/domain"
	"agrinovagraphql/server/internal/graphql/domain/auth"
)

func toGraphQLUser(d *domain.User) *auth.User {
	if d == nil {
		return nil
	}

	return &auth.User{
		ID:          d.ID,
		Username:    d.Username,
		Name:        d.Name,
		Email:       d.Email,
		PhoneNumber: d.PhoneNumber,
		Role:        auth.UserRole(d.Role),
		IsActive:    d.IsActive,

		CreatedAt: d.CreatedAt,
		UpdatedAt: d.UpdatedAt,
	}
}

func toGraphQLUsers(ds []*domain.User) []*auth.User {
	users := make([]*auth.User, len(ds))
	for i, d := range ds {
		users[i] = toGraphQLUser(d)
	}
	return users
}
