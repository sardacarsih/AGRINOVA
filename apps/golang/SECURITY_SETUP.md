# 🔐 Agrinova Security Setup Guide

## 🚨 Critical Security Notice

This document explains how to properly configure security secrets for the Agrinova GraphQL API. **Never commit secrets to version control or use example values in production.**

## Table of Contents

- [Security Overview](#security-overview)
- [Required Secrets](#required-secrets)
- [Quick Setup](#quick-setup)
- [Manual Configuration](#manual-configuration)
- [Production Security](#production-security)
- [Secret Validation](#secret-validation)
- [Troubleshooting](#troubleshooting)

## Security Overview

The Agrinova system uses multiple layers of security:

1. **JWT Tokens** - For authentication and authorization
2. **Device Binding** - For mobile device security
3. **CSRF Protection** - For web application security
4. **Environment Variables** - For secure secret storage

### Why This Matters

- **Hardcoded secrets** in version control are a critical security vulnerability
- **Weak secrets** can be compromised through brute force attacks
- **Example secrets** should never be used in production
- **Environment-specific secrets** prevent cross-environment security risks

## Required Secrets

The following secrets must be configured for the system to operate securely:

| Secret Name | Purpose | Minimum Length | Example Format |
|-------------|---------|----------------|----------------|
| `JWT_ACCESS_SECRET` | JWT access token signing | 32 characters | Base64 encoded random string |
| `JWT_REFRESH_SECRET` | JWT refresh token signing | 32 characters | Base64 encoded random string |
| `JWT_OFFLINE_SECRET` | JWT offline token signing | 32 characters | Base64 encoded random string |
| `DEVICE_SECRET` | Mobile device fingerprinting | 32 characters | Base64 encoded random string |
| `CSRF_SECRET` | CSRF token generation | 32 characters | Base64 encoded random string |

### Security Requirements

- ✅ **Minimum 32 characters** for all secrets
- ✅ **Cryptographically random** generation
- ✅ **Unique per environment** (dev/staging/production)
- ✅ **Regular rotation** in production
- ❌ **No dictionary words** or predictable patterns
- ❌ **No hardcoded example values**
- ❌ **No reuse across environments**

## Quick Setup

### Option 1: Automated Secret Generation (Recommended)

The fastest way to generate secure secrets:

```bash
# Navigate to the Go backend directory
cd apps/golang

# Generate secure .env.local file
make secrets

# Check secret configuration status
make secrets-check

# Validate current secrets
make secrets-validate
```

This will create a `.env.local` file with cryptographically strong secrets.

### Option 2: Generate Individual Secrets

If you need individual secrets for copy-paste:

```bash
# Generate individual secrets
go run scripts/generate-secrets.go secrets
```

## Manual Configuration

### Step 1: Generate Cryptographically Strong Secrets

Use one of these methods to generate secure secrets:

#### Method A: OpenSSL (Recommended)
```bash
# Generate JWT access secret
openssl rand -base64 32

# Generate JWT refresh secret
openssl rand -base64 32

# Generate JWT offline secret
openssl rand -base64 32

# Generate device secret
openssl rand -base64 32

# Generate CSRF secret
openssl rand -base64 32
```

#### Method B: Using our built-in generator
```bash
# Go to scripts directory
cd apps/golang/scripts

# Run the generator
go run generate-secrets.go secrets
```

### Step 2: Configure Environment Variables

Create or update your environment configuration:

#### Option A: Using .env.local (Development)
```bash
# Copy the generated secrets to .env.local
JWT_ACCESS_SECRET=your_generated_access_secret_here
JWT_REFRESH_SECRET=your_generated_refresh_secret_here
JWT_OFFLINE_SECRET=your_generated_offline_secret_here
DEVICE_SECRET=your_generated_device_secret_here
CSRF_SECRET=your_generated_csrf_secret_here
```

#### Option B: Environment Variables (Production)
```bash
# Set environment variables directly
export JWT_ACCESS_SECRET=your_generated_access_secret_here
export JWT_REFRESH_SECRET=your_generated_refresh_secret_here
export JWT_OFFLINE_SECRET=your_generated_offline_secret_here
export DEVICE_SECRET=your_generated_device_secret_here
export CSRF_SECRET=your_generated_csrf_secret_here
```

#### Option C: Docker/Kubernetes
```yaml
# docker-compose.yml
environment:
  - JWT_ACCESS_SECRET=${JWT_ACCESS_SECRET}
  - JWT_REFRESH_SECRET=${JWT_REFRESH_SECRET}
  - JWT_OFFLINE_SECRET=${JWT_OFFLINE_SECRET}
  - DEVICE_SECRET=${DEVICE_SECRET}
  - CSRF_SECRET=${CSRF_SECRET}
```

```yaml
# Kubernetes Secret
apiVersion: v1
kind: Secret
metadata:
  name: agrinova-secrets
type: Opaque
data:
  JWT_ACCESS_SECRET: <base64-encoded-secret>
  JWT_REFRESH_SECRET: <base64-encoded-secret>
  JWT_OFFLINE_SECRET: <base64-encoded-secret>
  DEVICE_SECRET: <base64-encoded-secret>
  CSRF_SECRET: <base64-encoded-secret>
```

## Production Security

### Production Checklist

- [ ] **Unique secrets per environment** - Never reuse secrets between dev/staging/production
- [ ] **Secret management system** - Use AWS Secrets Manager, HashiCorp Vault, or similar
- [ ] **Regular rotation** - Rotate secrets every 90 days in production
- [ ] **Access control** - Limit who can view and modify secrets
- [ ] **Audit logging** - Log secret access and rotation events
- [ ] **Backup procedures** - Secure backup of secrets for disaster recovery
- [ ] **Compliance** - Ensure secrets meet industry and regulatory requirements

### AWS Secrets Manager Example

```json
{
  "ARN": "arn:aws:secretsmanager:region:account-id:secret:agrinova-secrets-xxxxxx",
  "Name": "agrinova-secrets",
  "SecretString": "{\"JWT_ACCESS_SECRET\":\"your-secret\",\"JWT_REFRESH_SECRET\":\"your-secret\",\"JWT_OFFLINE_SECRET\":\"your-secret\",\"DEVICE_SECRET\":\"your-secret\",\"CSRF_SECRET\":\"your-secret\"}"
}
```

### HashiCorp Vault Example

```bash
# Store secrets in Vault
vault kv put secret/agrinova/jwt \
  access_secret="your-access-secret" \
  refresh_secret="your-refresh-secret" \
  offline_secret="your-offline-secret"

vault kv put secret/agrinova/security \
  device_secret="your-device-secret" \
  csrf_secret="your-csrf-secret"
```

## Secret Validation

### Built-in Validation

The system includes automatic secret validation that will:

1. **Check minimum length** (32 characters)
2. **Detect weak/example secrets**
3. **Prevent hardcoded values** from .env.example
4. **Validate at startup** with clear error messages

### Manual Validation

```bash
# Check current secret status
make secrets-check

# Validate all secrets are properly configured
make secrets-validate
```

### Validation Rules

The system will reject secrets that match these patterns:
- Previously hardcoded values from .env.example
- Template placeholders (GENERATE_UNIQUE_32_CHAR_SECRET_HERE)
- Common weak passwords
- Secrets shorter than 32 characters
- Empty or null values

## Troubleshooting

### Common Issues

#### Issue: "Secret too short" Error
**Problem**: Secrets are less than 32 characters
**Solution**: Generate new secrets with minimum 32 characters
```bash
make secrets  # This generates proper length secrets
```

#### Issue: "Using example secrets" Error
**Problem**: Using hardcoded values from .env.example
**Solution**: Generate unique secrets
```bash
go run scripts/generate-secrets.go secrets
```

#### Issue: Server won't start
**Problem**: Missing or invalid environment variables
**Solution**: Check secret configuration
```bash
make secrets-check
```

#### Issue: "Weak secret detected" Error
**Problem**: Secret is using a known weak value
**Solution**: Generate cryptographically random secrets
```bash
openssl rand -base64 32
```

### Debug Commands

```bash
# Check all environment variables
env | grep -E "(JWT|DEVICE|CSRF)_SECRET"

# Validate secrets manually
go run scripts/generate-secrets.go validate

# Check configuration status
make secrets-check

# Test server startup with validation
go run cmd/server/main.go
```

### Recovery

If you lose your secrets or need to regenerate them:

1. **Backup current data** (if server is running)
2. **Generate new secrets**: `make secrets`
3. **Update all environment variables**
4. **Restart the server**
5. **Clear any cached tokens/sessions**

## Security Best Practices

### Development Environment
- ✅ Use `make secrets` for development
- ✅ Never commit `.env.local` files
- ✅ Use different secrets per developer
- ✅ Rotate development secrets regularly

### Production Environment
- ✅ Use professional secret management (AWS Secrets Manager, Vault, etc.)
- ✅ Implement secret rotation policies
- ✅ Monitor secret access logs
- ✅ Have backup procedures for secrets
- ✅ Use different secrets per environment

### Team Security
- ✅ Educate team on secret management
- ✅ Implement access control for secrets
- ✅ Regular security training
- ✅ Security audit procedures

## Emergency Procedures

### If Secrets Are Compromised

1. **Immediate Actions**:
   - Rotate all compromised secrets
   - Invalidate all user sessions/tokens
   - Check audit logs for unauthorized access
   - Notify security team

2. **Recovery Steps**:
   - Generate new cryptographically strong secrets
   - Update all environment configurations
   - Restart all affected services
   - Monitor for suspicious activity

3. **Post-Incident**:
   - Review security procedures
   - Implement additional safeguards
   - Update security documentation
   - Team security training

---

## 🚨 Security Contacts

If you discover a security vulnerability or need security assistance:

1. **Immediate Security Issues**: Contact your security team immediately
2. **Questions about Setup**: Refer to this documentation first
3. **Security Improvements**: Submit security improvement proposals

---

**Remember**: Security is everyone's responsibility. Never commit secrets, always use strong random values, and follow the security procedures outlined in this document.