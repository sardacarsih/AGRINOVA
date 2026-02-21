#!/bin/bash
# ============================================================================
# AGRINOVA PRODUCTION SECRETS GENERATOR
# ============================================================================
# This script generates secure secrets for production deployment
# Run this script on your production server to generate unique secrets
# ============================================================================

echo "🔐 Agrinova Production Secrets Generator"
echo "========================================"
echo ""

# Check if openssl is available
if ! command -v openssl &> /dev/null; then
    echo "❌ Error: openssl is not installed."
    echo "Please install OpenSSL first:"
    echo "  - Windows: Download from https://slproweb.com/products/Win32OpenSSL.html"
    echo "  - Or use Git Bash which includes openssl"
    exit 1
fi

echo "✅ OpenSSL found. Generating production secrets..."
echo ""

# Generate secrets
JWT_ACCESS_SECRET=$(openssl rand -base64 32)
JWT_REFRESH_SECRET=$(openssl rand -base64 32)
JWT_OFFLINE_SECRET=$(openssl rand -base64 32)
DEVICE_SECRET=$(openssl rand -base64 32)
CSRF_SECRET=$(openssl rand -base64 32)

# Display generated secrets
echo "🔑 Generated Production Secrets:"
echo "================================"
echo ""
echo "JWT_ACCESS_SECRET=$JWT_ACCESS_SECRET"
echo "JWT_REFRESH_SECRET=$JWT_REFRESH_SECRET"
echo "JWT_OFFLINE_SECRET=$JWT_OFFLINE_SECRET"
echo "DEVICE_SECRET=$DEVICE_SECRET"
echo "CSRF_SECRET=$CSRF_SECRET"
echo ""

# Create a secrets file
SECRETS_FILE="production-secrets-$(date +%Y%m%d-%H%M%S).env"
echo "📝 Saving secrets to: $SECRETS_FILE"
echo ""

cat > "$SECRETS_FILE" << EOF
# ============================================================================
# AGRINOVA PRODUCTION SECRETS
# Generated on: $(date)
# ============================================================================
# IMPORTANT: Keep these secrets secure and never commit them to version control
# Replace the placeholder values in .env.production with these generated secrets
# ============================================================================

JWT_ACCESS_SECRET=$JWT_ACCESS_SECRET
JWT_REFRESH_SECRET=$JWT_REFRESH_SECRET
JWT_OFFLINE_SECRET=$JWT_OFFLINE_SECRET
DEVICE_SECRET=$DEVICE_SECRET
CSRF_SECRET=$CSRF_SECRET

# ============================================================================
# DEPLOYMENT INSTRUCTIONS:
# ============================================================================
# 1. Copy .env.production to your production server
# 2. Replace all "REPLACE_WITH_openssl_rand_base64_32_OUTPUT" placeholders
#    with the corresponding secrets above
# 3. Update database credentials and domain settings
# 4. Configure SSL certificate paths for Windows
# 5. Test the configuration before deploying to production
# ============================================================================
EOF

echo "✅ Secrets saved to: $SECRETS_FILE"
echo ""
echo "🛡️  SECURITY REMINDERS:"
echo "======================="
echo "• Keep this secrets file secure and delete it after use"
echo "• Never commit secrets to version control"
echo "• Use different secrets for different environments"
echo "• Rotate secrets regularly in production"
echo "• Store secrets in a secure password manager"
echo ""
echo "📋 Next Steps:"
echo "=============="
echo "1. Copy .env.production to your Windows production server"
echo "2. Replace placeholder values with the generated secrets above"
echo "3. Configure your production database credentials"
echo "4. Update domain settings for your production environment"
echo "5. Install SSL certificates and update certificate paths"
echo ""
echo "🚀 Ready for production deployment!"