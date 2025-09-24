#!/bin/sh

# Replace environment variables in runtime-config.js
sed -i "s|{{NEXT_PUBLIC_API_URL}}|${NEXT_PUBLIC_API_URL:-http://localhost:8080}|g" /app/apps/web/public/runtime-config.js

# Start the Next.js application
exec npm start