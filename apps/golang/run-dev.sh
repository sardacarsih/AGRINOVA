#!/bin/bash

# Export JWT environment variables from .env file
export $(grep -E '^(JWT_|DEVICE_|CSRF_)' .env | xargs)

# Export other important environment variables
export $(grep -E '^AGRINOVA_' .env | xargs)

echo "Starting Go GraphQL server with environment variables loaded..."
echo "JWT_ACCESS_SECRET length: $(echo -n "$JWT_ACCESS_SECRET" | wc -c)"

make dev