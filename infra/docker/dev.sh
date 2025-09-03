#!/bin/bash

# Development script for One to Multi Agent

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

cd "$PROJECT_ROOT"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}🚀 One to Multi Agent - Development Environment${NC}"
echo "Project root: $PROJECT_ROOT"
echo

# Function to check if Docker is running
check_docker() {
    if ! docker info >/dev/null 2>&1; then
        echo -e "${RED}❌ Docker is not running. Please start Docker and try again.${NC}"
        exit 1
    fi
}

# Function to install dependencies
install_deps() {
    echo -e "${YELLOW}📦 Installing dependencies locally...${NC}"
    
    # Update root dependencies
    npm install
    
    # Install and generate package-lock.json for web
    echo -e "${YELLOW}📝 Installing dependencies for web...${NC}"
    (cd apps/web && npm install)
    
    # Install and generate package-lock.json for api
    echo -e "${YELLOW}📝 Installing dependencies for api...${NC}"
    (cd apps/api && npm install)
    
    echo -e "${GREEN}✅ All dependencies installed locally${NC}"
    echo
}

# Function to start services
start_services() {
    echo -e "${YELLOW}🐳 Starting Docker services...${NC}"
    
    # Stop containers if running
    docker compose -f infra/docker/compose.yml down
    
    # Build and start containers (no volume removal needed since we're mounting local files)
    echo -e "${YELLOW}🔨 Building Docker images...${NC}"
    docker compose -f infra/docker/compose.yml build
    
    # Start containers
    docker compose -f infra/docker/compose.yml up -d
    
    echo -e "${GREEN}✅ Services started!${NC}"
    echo
    echo -e "${YELLOW}🌐 Available services:${NC}"
    echo "  - Web (Next.js): http://localhost:3000"
    echo "  - API (Hono):    http://localhost:8787"
    echo
    echo -e "${YELLOW}💡 To view logs:${NC}"
    echo "  docker compose -f infra/docker/compose.yml logs -f"
    echo
    echo -e "${YELLOW}💡 To stop services:${NC}"
    echo "  docker compose -f infra/docker/compose.yml down"
}

# Function to stop services
stop_services() {
    echo -e "${YELLOW}🛑 Stopping Docker services...${NC}"
    docker compose -f infra/docker/compose.yml down
    echo -e "${GREEN}✅ Services stopped${NC}"
}

# Function to view logs
view_logs() {
    docker compose -f infra/docker/compose.yml logs -f
}

# Function to reset everything
reset() {
    echo -e "${YELLOW}🗑️  Resetting environment (this will remove all data)...${NC}"
    docker compose -f infra/docker/compose.yml down -v
    docker compose -f infra/docker/compose.yml build --no-cache
    echo -e "${GREEN}✅ Environment reset${NC}"
}

# Main script logic
case "${1:-start}" in
    "install")
        install_deps
        ;;
    "start")
        check_docker
        install_deps
        start_services
        ;;
    "stop")
        stop_services
        ;;
    "restart")
        stop_services
        check_docker
        start_services
        ;;
    "logs")
        view_logs
        ;;
    "reset")
        reset
        ;;
    "status")
        docker compose -f infra/docker/compose.yml ps
        ;;
    *)
        echo "Usage: $0 {install|start|stop|restart|logs|reset|status}"
        echo
        echo "Commands:"
        echo "  install  - Install Node.js dependencies"
        echo "  start    - Install deps and start all services"
        echo "  stop     - Stop all services"
        echo "  restart  - Restart all services"
        echo "  logs     - View service logs"
        echo "  reset    - Reset environment (removes all data)"
        echo "  status   - Show service status"
        exit 1
        ;;
esac