#!/bin/bash

# Google Login Debug Script
# このスクリプトは401エラーの原因を特定するためのデバッグツールです

set -e

# 色付きログ用の設定
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🔍 Google Login Authentication Debug Tool${NC}"
echo "========================================"

# 環境変数の確認
echo -e "${YELLOW}📋 Step 1: Environment Variables Check${NC}"
echo "--------------------------------------"

REQUIRED_VARS=(
    "AUTH_GOOGLE_ID"
    "AUTH_GOOGLE_SECRET"
    "AUTH_SECRET"
    "NEXT_PUBLIC_API_URL"
    "DB_HOST"
    "DB_USER"
    "DB_PASSWORD"
    "DB_NAME"
)

missing_vars=()
for var in "${REQUIRED_VARS[@]}"; do
    if [[ -z "${!var}" ]]; then
        missing_vars+=("$var")
        echo -e "${RED}❌ $var: NOT SET${NC}"
    else
        if [[ "$var" == *"SECRET"* ]] || [[ "$var" == *"PASSWORD"* ]]; then
            echo -e "${GREEN}✅ $var: SET (hidden)${NC}"
        else
            echo -e "${GREEN}✅ $var: ${!var}${NC}"
        fi
    fi
done

if [[ ${#missing_vars[@]} -gt 0 ]]; then
    echo -e "${RED}⚠️  Missing required environment variables: ${missing_vars[*]}${NC}"
    echo "Please set these variables in your .env file"
    exit 1
fi

# APIの基本疎通確認
echo
echo -e "${YELLOW}📡 Step 2: API Connection Check${NC}"
echo "------------------------------"

API_BASE="${NEXT_PUBLIC_API_URL:-http://localhost:8080}"
echo "Testing API base URL: $API_BASE"

# Health check
echo -n "Health check: "
if curl -s -f "$API_BASE/health" > /dev/null 2>&1; then
    echo -e "${GREEN}✅ OK${NC}"
else
    echo -e "${RED}❌ FAILED${NC}"
    echo "API server is not responding. Please check if the server is running."

    # ローカル環境の場合の確認
    if [[ "$API_BASE" == *"localhost"* ]]; then
        echo "For local development, run: npm run start -w apps/api"
    fi
    exit 1
fi

# データベース接続確認
echo
echo -e "${YELLOW}🗄️  Step 3: Database Connection Check${NC}"
echo "-----------------------------------"

echo -n "Database connection: "
if command -v psql > /dev/null 2>&1; then
    DB_URL="postgresql://${DB_USER}:${DB_PASSWORD}@${DB_HOST}:${DB_PORT:-5432}/${DB_NAME}"

    if psql "$DB_URL" -c "SELECT 1;" > /dev/null 2>&1; then
        echo -e "${GREEN}✅ OK${NC}"

        # usersテーブルの存在確認
        echo -n "Users table exists: "
        if psql "$DB_URL" -c "\dt users" | grep -q users; then
            echo -e "${GREEN}✅ OK${NC}"
        else
            echo -e "${RED}❌ MISSING${NC}"
            echo "Run: psql \"$DB_URL\" -f scripts/setup-database.sql"
        fi
    else
        echo -e "${RED}❌ FAILED${NC}"
        echo "Cannot connect to database. Check your DB_* environment variables."
    fi
else
    echo -e "${YELLOW}⚠️  psql not available, skipping database check${NC}"
fi

# トークンテスト機能
echo
echo -e "${YELLOW}🔐 Step 4: Token Test (Optional)${NC}"
echo "-------------------------------"

read -p "Do you have a JWT token to test? (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "Please paste your JWT token (Bearer token from browser dev tools):"
    read -r TOKEN

    if [[ -n "$TOKEN" ]]; then
        echo "Testing token with /history endpoint..."

        RESPONSE=$(curl -s -w "HTTP_STATUS:%{http_code}" \
            -H "Authorization: Bearer $TOKEN" \
            -H "Content-Type: application/json" \
            "$API_BASE/history")

        HTTP_STATUS=$(echo "$RESPONSE" | grep -o "HTTP_STATUS:[0-9]*" | cut -d: -f2)
        BODY=$(echo "$RESPONSE" | sed 's/HTTP_STATUS:[0-9]*$//')

        echo "HTTP Status: $HTTP_STATUS"

        case $HTTP_STATUS in
            200)
                echo -e "${GREEN}✅ Token is valid!${NC}"
                echo "Response preview: $(echo "$BODY" | head -c 200)..."
                ;;
            401)
                echo -e "${RED}❌ Token authentication failed${NC}"
                echo "Response: $BODY"

                # 401の詳細分析
                if echo "$BODY" | grep -q "expired"; then
                    echo -e "${YELLOW}💡 Token appears to be expired. Please login again.${NC}"
                elif echo "$BODY" | grep -q "invalid"; then
                    echo -e "${YELLOW}💡 Token format is invalid. Check AUTH_SECRET configuration.${NC}"
                elif echo "$BODY" | grep -q "user not found"; then
                    echo -e "${YELLOW}💡 User not found in database. Check database setup.${NC}"
                fi
                ;;
            403)
                echo -e "${RED}❌ Forbidden - Check permissions${NC}"
                ;;
            500)
                echo -e "${RED}❌ Server error${NC}"
                echo "Response: $BODY"
                ;;
            *)
                echo -e "${RED}❌ Unexpected status: $HTTP_STATUS${NC}"
                echo "Response: $BODY"
                ;;
        esac
    fi
fi

# システム情報
echo
echo -e "${YELLOW}💻 Step 5: System Information${NC}"
echo "----------------------------"

echo "Node.js version: $(node --version 2>/dev/null || echo 'Not installed')"
echo "npm version: $(npm --version 2>/dev/null || echo 'Not installed')"
echo "OS: $(uname -s -r 2>/dev/null || echo 'Unknown')"
echo "Current time: $(date)"

# 時刻同期チェック
echo -n "Time sync check: "
if command -v timedatectl > /dev/null 2>&1; then
    if timedatectl status | grep -q "synchronized: yes"; then
        echo -e "${GREEN}✅ Synchronized${NC}"
    else
        echo -e "${YELLOW}⚠️  Not synchronized${NC}"
        echo "Run: sudo timedatectl set-ntp true"
    fi
else
    echo -e "${YELLOW}⚠️  Cannot check (systemd not available)${NC}"
fi

# Google OAuth設定チェック
echo
echo -e "${YELLOW}🔑 Step 6: Google OAuth Configuration Tips${NC}"
echo "----------------------------------------"

echo "Ensure your Google Cloud Console settings include:"
echo "• Authorized JavaScript origins: $AUTH_URL"
echo "• Authorized redirect URIs: $AUTH_URL/api/auth/callback/google"
echo
echo "To check your current OAuth settings:"
echo "1. Go to: https://console.cloud.google.com/apis/credentials"
echo "2. Select your OAuth 2.0 Client ID"
echo "3. Verify the URIs match your environment"

# 完了メッセージ
echo
echo -e "${GREEN}🎉 Debug check completed!${NC}"
echo "=========================="

if [[ ${#missing_vars[@]} -eq 0 ]]; then
    echo -e "${GREEN}✅ All basic checks passed${NC}"
    echo
    echo "If you're still experiencing 401 errors:"
    echo "1. Check the API server logs for detailed error messages"
    echo "2. Verify your Google OAuth configuration in Cloud Console"
    echo "3. Ensure database schema is up to date"
    echo "4. Test with the token validation above"
else
    echo -e "${RED}❌ Please fix the missing environment variables first${NC}"
fi

echo
echo "For more detailed troubleshooting, see SETUP-COLLABORATORS.md"