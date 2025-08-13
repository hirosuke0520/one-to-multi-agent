#!/bin/bash

# GCP Setup Script for One to Multi Agent

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

PROJECT_ID="one-to-multi-agent-80339"

echo -e "${GREEN}🌟 GCP Setup for One to Multi Agent${NC}"
echo -e "${BLUE}Project ID: $PROJECT_ID${NC}"
echo

# Function to check if billing is enabled
check_billing() {
    echo -e "${YELLOW}💳 Checking billing status...${NC}"
    
    if gcloud billing projects describe $PROJECT_ID > /dev/null 2>&1; then
        echo -e "${GREEN}✅ Billing is enabled${NC}"
        return 0
    else
        echo -e "${RED}❌ Billing is not enabled${NC}"
        echo
        echo -e "${YELLOW}To enable billing:${NC}"
        echo "1. Go to https://console.cloud.google.com/billing"
        echo "2. Select or create a billing account"
        echo "3. Link it to project: $PROJECT_ID"
        echo
        return 1
    fi
}

# Function to enable APIs
enable_apis() {
    echo -e "${YELLOW}🔧 Enabling required APIs...${NC}"
    
    # Core APIs that require billing
    BILLING_APIS=(
        "speech.googleapis.com"
        "aiplatform.googleapis.com" 
        "run.googleapis.com"
        "storage-component.googleapis.com"
    )
    
    # Free APIs
    FREE_APIS=(
        "firebase.googleapis.com"
        "firestore.googleapis.com"
        "identitytoolkit.googleapis.com"
    )
    
    # Enable free APIs first
    echo -e "${BLUE}Enabling free APIs...${NC}"
    for api in "${FREE_APIS[@]}"; do
        echo "- $api"
        gcloud services enable $api --project=$PROJECT_ID || echo "  Failed (might already be enabled)"
    done
    
    echo
    
    # Try to enable billing APIs
    if check_billing; then
        echo -e "${BLUE}Enabling APIs that require billing...${NC}"
        for api in "${BILLING_APIS[@]}"; do
            echo "- $api"
            gcloud services enable $api --project=$PROJECT_ID || echo "  Failed"
        done
    else
        echo -e "${YELLOW}⚠️  Skipping billing-required APIs. Enable billing first.${NC}"
        echo "Required APIs for full functionality:"
        for api in "${BILLING_APIS[@]}"; do
            echo "  - $api"
        done
    fi
}

# Function to create service account
create_service_account() {
    echo -e "${YELLOW}🔑 Setting up service account...${NC}"
    
    SA_NAME="one-to-multi-agent-sa"
    SA_EMAIL="$SA_NAME@$PROJECT_ID.iam.gserviceaccount.com"
    
    # Create service account
    if gcloud iam service-accounts describe $SA_EMAIL --project=$PROJECT_ID > /dev/null 2>&1; then
        echo -e "${BLUE}Service account already exists: $SA_EMAIL${NC}"
    else
        echo "Creating service account..."
        gcloud iam service-accounts create $SA_NAME \
            --display-name="One to Multi Agent Service Account" \
            --project=$PROJECT_ID
    fi
    
    # Add necessary roles
    echo "Adding IAM roles..."
    ROLES=(
        "roles/speech.client"
        "roles/aiplatform.user"
        "roles/storage.admin"
        "roles/firebase.admin"
    )
    
    for role in "${ROLES[@]}"; do
        echo "- $role"
        gcloud projects add-iam-policy-binding $PROJECT_ID \
            --member="serviceAccount:$SA_EMAIL" \
            --role=$role > /dev/null || echo "  Failed (might need billing enabled)"
    done
    
    # Generate key file
    KEY_FILE="./gcp-service-account-key.json"
    if [ ! -f "$KEY_FILE" ]; then
        echo "Generating service account key..."
        gcloud iam service-accounts keys create $KEY_FILE \
            --iam-account=$SA_EMAIL \
            --project=$PROJECT_ID
        echo -e "${GREEN}✅ Service account key saved to: $KEY_FILE${NC}"
        echo -e "${RED}⚠️  Keep this file secure and don't commit it to version control!${NC}"
    else
        echo -e "${BLUE}Service account key already exists: $KEY_FILE${NC}"
    fi
}

# Function to setup authentication
setup_auth() {
    echo -e "${YELLOW}🔐 Setting up authentication...${NC}"
    
    # Set application default credentials
    gcloud auth application-default set-quota-project $PROJECT_ID
    
    echo -e "${GREEN}✅ Authentication configured${NC}"
}

# Function to create Firebase configuration
setup_firebase() {
    echo -e "${YELLOW}🔥 Setting up Firebase...${NC}"
    
    # Check if Firebase is already initialized
    if [ -f "./firebase.json" ]; then
        echo -e "${BLUE}Firebase config already exists${NC}"
    else
        echo "Firebase needs to be initialized manually:"
        echo "1. Run: npm install -g firebase-tools"
        echo "2. Run: firebase login"
        echo "3. Run: firebase init firestore"
        echo "4. Select project: $PROJECT_ID"
    fi
}

# Function to create environment file
create_env_file() {
    echo -e "${YELLOW}📄 Creating environment file...${NC}"
    
    ENV_FILE=".env.local"
    if [ ! -f "$ENV_FILE" ]; then
        cat > $ENV_FILE << EOF
# GCP Configuration
GCP_PROJECT_ID=$PROJECT_ID
GOOGLE_APPLICATION_CREDENTIALS=./gcp-service-account-key.json

# Firebase Configuration  
FIREBASE_PROJECT_ID=$PROJECT_ID

# API Configuration
NEXT_PUBLIC_API_URL=http://localhost:8787

# Platform APIs (set these with your actual keys)
YOUTUBE_CLIENT_ID=
YOUTUBE_CLIENT_SECRET=
YOUTUBE_REFRESH_TOKEN=

META_APP_ID=
META_APP_SECRET=

TWITTER_API_KEY=
TWITTER_API_SECRET=
TWITTER_ACCESS_TOKEN=
TWITTER_ACCESS_TOKEN_SECRET=

WP_WEBHOOK_URL=

# Feature Flags  
ENABLE_THREADS=false
ENABLE_YOUTUBE=false
ENABLE_WORDPRESS=false
ENABLE_TWITTER=false
ENABLE_INSTAGRAM=false
ENABLE_TIKTOK=false
EOF
        echo -e "${GREEN}✅ Created $ENV_FILE${NC}"
        echo -e "${YELLOW}⚠️  Update the API keys in $ENV_FILE with your actual values${NC}"
    else
        echo -e "${BLUE}Environment file already exists: $ENV_FILE${NC}"
    fi
}

# Main execution
main() {
    echo -e "${BLUE}Setting GCP project to: $PROJECT_ID${NC}"
    gcloud config set project $PROJECT_ID
    
    check_billing
    enable_apis
    create_service_account
    setup_auth
    setup_firebase
    create_env_file
    
    echo
    echo -e "${GREEN}🎉 GCP setup completed!${NC}"
    echo
    echo -e "${YELLOW}Next steps:${NC}"
    echo "1. Enable billing if not already done"
    echo "2. Update API keys in .env.local"
    echo "3. Initialize Firebase if needed"
    echo "4. Start the development environment:"
    echo "   ./infra/docker/dev.sh start"
    echo
    echo -e "${YELLOW}Useful commands:${NC}"
    echo "  gcloud projects list"
    echo "  gcloud services list --enabled"
    echo "  gcloud auth list"
}

# Check if gcloud is installed
if ! command -v gcloud &> /dev/null; then
    echo -e "${RED}❌ gcloud CLI is not installed${NC}"
    echo "Please install it from: https://cloud.google.com/sdk/docs/install"
    exit 1
fi

# Run main function
main