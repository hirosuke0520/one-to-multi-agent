#!/bin/bash

echo "🔍 PostgreSQL Database Status Check"
echo "===================================="

# User table check
echo -e "\n📊 Users Table:"
docker exec docker-postgres-1 psql -U postgres -d postgres -c "SELECT id, email, name, created_at, last_login_at FROM users;" 2>/dev/null || echo "❌ Failed to query users table"

# Count records
echo -e "\n📈 Record Counts:"
docker exec docker-postgres-1 psql -U postgres -d postgres -t -c "SELECT 'Users: ' || COUNT(*) FROM users;" 2>/dev/null || echo "Users: Error"
docker exec docker-postgres-1 psql -U postgres -d postgres -t -c "SELECT 'Sessions: ' || COUNT(*) FROM sessions;" 2>/dev/null || echo "Sessions: Error"
docker exec docker-postgres-1 psql -U postgres -d postgres -t -c "SELECT 'Content History: ' || COUNT(*) FROM content_history;" 2>/dev/null || echo "Content History: Error"
docker exec docker-postgres-1 psql -U postgres -d postgres -t -c "SELECT 'Platform Contents: ' || COUNT(*) FROM platform_contents;" 2>/dev/null || echo "Platform Contents: Error"

# Table structure
if [ "$1" = "-v" ] || [ "$1" = "--verbose" ]; then
  echo -e "\n📋 Table Structure:"
  docker exec docker-postgres-1 psql -U postgres -d postgres -c "\dt" 2>/dev/null || echo "❌ Failed to list tables"
fi

echo -e "\n✅ Check complete!"