#!/bin/bash

# Collaborator Setup Script for Google Login
# Run this script to set up the environment for Google authentication

set -e

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 Google Login Collaborator Setup${NC}"
echo "=================================="
echo

# Step 1: Environment file setup
echo -e "${YELLOW}📝 Step 1: Environment Configuration${NC}"
echo "-----------------------------------"

if [[ ! -f .env ]]; then
    if [[ -f .env.example ]]; then
        echo "Copying .env.example to .env..."
        cp .env.example .env
        echo -e "${GREEN}✅ .env file created${NC}"
    else
        echo -e "${RED}❌ .env.example not found${NC}"
        exit 1
    fi
else
    echo -e "${GREEN}✅ .env file already exists${NC}"
fi

echo
echo -e "${YELLOW}⚠️  IMPORTANT: You need to configure the following environment variables:${NC}"
echo
echo "Required for Google authentication:"
echo "  AUTH_GOOGLE_ID=your-google-client-id"
echo "  AUTH_GOOGLE_SECRET=your-google-client-secret"
echo "  AUTH_SECRET=your-secure-secret (run: openssl rand -base64 32)"
echo
echo "For production environment:"
echo "  NEXT_PUBLIC_API_URL=https://api-one-to-multi-agent-675967400701.asia-northeast1.run.app"
echo "  DATABASE_URL=postgresql://user:pass@host:5432/one_to_multi_agent"
echo "  GOOGLE_API_KEY=your-gemini-api-key"
echo

read -p "Have you configured these variables in .env? (y/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${YELLOW}📖 Please edit .env file and configure the required variables${NC}"
    echo "Then run this script again."
    exit 0
fi

# Step 2: Dependencies
echo -e "${YELLOW}📦 Step 2: Installing Dependencies${NC}"
echo "--------------------------------"

if command -v npm > /dev/null 2>&1; then
    echo "Installing dependencies..."
    npm ci
    echo -e "${GREEN}✅ Dependencies installed${NC}"
else
    echo -e "${RED}❌ npm not found. Please install Node.js and npm first.${NC}"
    exit 1
fi

# Step 3: Database setup
echo
echo -e "${YELLOW}🗄️  Step 3: Database Setup${NC}"
echo "-------------------------"

if command -v psql > /dev/null 2>&1; then
    read -p "Do you want to set up the database schema? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo "Please enter your database connection details:"
        read -p "Database URL (or press Enter for default from .env): " DB_URL

        if [[ -z "$DB_URL" ]]; then
            # Load from .env file
            source .env 2>/dev/null || true
            DB_URL="postgresql://${DB_USER}:${DB_PASSWORD}@${DB_HOST}:${DB_PORT:-5432}/${DB_NAME}"
        fi

        echo "Testing database connection..."
        if psql "$DB_URL" -c "SELECT 1;" > /dev/null 2>&1; then
            echo -e "${GREEN}✅ Database connection successful${NC}"

            echo "Setting up database schema..."
            if psql "$DB_URL" -f scripts/setup-database.sql > /dev/null 2>&1; then
                echo -e "${GREEN}✅ Database schema setup completed${NC}"
            else
                echo -e "${RED}❌ Database schema setup failed${NC}"
                echo "You may need to run the SQL manually:"
                echo "psql \"$DB_URL\" -f scripts/setup-database.sql"
            fi
        else
            echo -e "${RED}❌ Cannot connect to database${NC}"
            echo "Please check your database configuration in .env"
        fi
    fi
else
    echo -e "${YELLOW}⚠️  psql not available. Please set up the database manually:${NC}"
    echo "1. Connect to your PostgreSQL database"
    echo "2. Run: \\i scripts/setup-database.sql"
fi

# Step 4: Build
echo
echo -e "${YELLOW}🔨 Step 4: Building Project${NC}"
echo "-------------------------"

echo "Building API server..."
if npm run build -w apps/api > /dev/null 2>&1; then
    echo -e "${GREEN}✅ API server built successfully${NC}"
else
    echo -e "${RED}❌ API server build failed${NC}"
    echo "Run manually: npm run build -w apps/api"
fi

echo "Building web frontend..."
if npm run build -w apps/web > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Web frontend built successfully${NC}"
else
    echo -e "${RED}❌ Web frontend build failed${NC}"
    echo "Run manually: npm run build -w apps/web"
fi

# Step 5: Validation
echo
echo -e "${YELLOW}🔍 Step 5: Environment Validation${NC}"
echo "--------------------------------"

echo "Starting API server for validation..."

# Start API server in background for testing
npm run start -w apps/api &
API_PID=$!

# Wait for server to start
sleep 5

# Test health endpoint
API_URL="http://localhost:8787"
echo "Testing API health check..."

if curl -s -f "$API_URL/health" > /dev/null 2>&1; then
    echo -e "${GREEN}✅ API server is responding${NC}"

    # Check environment validation
    HEALTH_RESPONSE=$(curl -s "$API_URL/health")
    if echo "$HEALTH_RESPONSE" | grep -q '"isValid":true'; then
        echo -e "${GREEN}✅ Environment validation passed${NC}"
    else
        echo -e "${YELLOW}⚠️  Environment validation has warnings/errors${NC}"
        echo "Check: curl $API_URL/health"
    fi
else
    echo -e "${RED}❌ API server is not responding${NC}"
fi

# Stop the API server
kill $API_PID 2>/dev/null || true
wait $API_PID 2>/dev/null || true

# Step 6: Final instructions
echo
echo -e "${GREEN}🎉 Setup Complete!${NC}"
echo "=================="
echo
echo "Next steps:"
echo "1. Start the API server: npm run start -w apps/api"
echo "2. Start the web frontend: npm run start -w apps/web"
echo "3. Open your browser to: http://localhost:3000"
echo
echo "For troubleshooting:"
echo "• Run the debug script: ./scripts/debug-auth.sh"
echo "• Check the setup guide: SETUP-COLLABORATORS.md"
echo "• Test API directly: curl http://localhost:8787/health"
echo
echo -e "${BLUE}💡 Pro tip: Use 'npm run dev' to start both services in development mode${NC}"

echo
echo -e "${YELLOW}📋 Environment Variables Checklist:${NC}"
echo "• AUTH_GOOGLE_ID: Google OAuth Client ID"
echo "• AUTH_GOOGLE_SECRET: Google OAuth Client Secret"
echo "• AUTH_SECRET: Random secret (32+ characters)"
echo "• NEXT_PUBLIC_API_URL: API server URL"
echo "• Database configuration (DB_HOST, DB_USER, etc.)"
echo "• GOOGLE_API_KEY: For AI features"
echo
echo "Ensure all these are properly set in your .env file!"