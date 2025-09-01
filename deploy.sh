#!/bin/bash

# GCP Deployment Script for One-to-Multi Agent

set -e

echo "🚀 Starting GCP Deployment..."

# Configuration
PROJECT_ID="one-to-multi-agent"
REGION="asia-northeast1"
SERVICE_NAME="one-to-multi-agent"

# Set project
echo "📌 Setting GCP Project..."
gcloud config set project $PROJECT_ID

# Create secrets if they don't exist
echo "🔐 Creating/Updating Secrets..."

# Check if db-password secret exists
if ! gcloud secrets describe db-password --project=$PROJECT_ID &>/dev/null; then
    echo "Creating db-password secret..."
    echo -n "Enter database password: "
    read -s DB_PASSWORD
    echo
    echo -n "$DB_PASSWORD" | gcloud secrets create db-password --data-file=-
else
    echo "db-password secret already exists"
fi

# Check if gemini-api-key secret exists
if ! gcloud secrets describe gemini-api-key --project=$PROJECT_ID &>/dev/null; then
    echo "Creating gemini-api-key secret..."
    echo -n "Enter Gemini API key: "
    read -s GEMINI_API_KEY
    echo
    echo -n "$GEMINI_API_KEY" | gcloud secrets create gemini-api-key --data-file=-
else
    echo "gemini-api-key secret already exists"
fi

# Enable required APIs
echo "🔧 Enabling required GCP APIs..."
gcloud services enable cloudbuild.googleapis.com
gcloud services enable run.googleapis.com
gcloud services enable sqladmin.googleapis.com
gcloud services enable storage-component.googleapis.com
gcloud services enable secretmanager.googleapis.com
gcloud services enable artifactregistry.googleapis.com

# Grant necessary permissions to Cloud Build service account
echo "🔑 Granting permissions to Cloud Build..."
PROJECT_NUMBER=$(gcloud projects describe $PROJECT_ID --format='value(projectNumber)')
CLOUD_BUILD_SA="${PROJECT_NUMBER}@cloudbuild.gserviceaccount.com"

gcloud projects add-iam-policy-binding $PROJECT_ID \
    --member="serviceAccount:${CLOUD_BUILD_SA}" \
    --role="roles/run.admin"

gcloud projects add-iam-policy-binding $PROJECT_ID \
    --member="serviceAccount:${CLOUD_BUILD_SA}" \
    --role="roles/secretmanager.secretAccessor"

gcloud projects add-iam-policy-binding $PROJECT_ID \
    --member="serviceAccount:${CLOUD_BUILD_SA}" \
    --role="roles/cloudsql.client"

# Grant Cloud Run service account access to secrets
echo "🔑 Granting Cloud Run access to secrets..."
COMPUTE_SA="${PROJECT_NUMBER}-compute@developer.gserviceaccount.com"

gcloud secrets add-iam-policy-binding db-password \
    --member="serviceAccount:${COMPUTE_SA}" \
    --role="roles/secretmanager.secretAccessor"

gcloud secrets add-iam-policy-binding gemini-api-key \
    --member="serviceAccount:${COMPUTE_SA}" \
    --role="roles/secretmanager.secretAccessor"

# Grant Cloud Run service account access to Cloud Storage
echo "📦 Granting Cloud Run access to Cloud Storage..."
gsutil iam ch serviceAccount:${COMPUTE_SA}:objectAdmin gs://one-to-multi-agent-storage

# Run database migrations
echo "🗄️ Running database migrations..."
echo "Please ensure Cloud SQL Proxy is running and execute the following:"
echo "  cd apps/api && npm run migrate"
echo "Press enter when migrations are complete..."
read

# Submit build to Cloud Build
echo "🏗️ Starting Cloud Build..."
gcloud builds submit \
    --config=cloudbuild.yaml \
    --substitutions=_SERVICE_NAME=$SERVICE_NAME,_REGION=$REGION

echo "✅ Deployment complete!"

# Get service URLs
echo "📍 Service URLs:"
API_URL=$(gcloud run services describe api-${SERVICE_NAME} --region=$REGION --format='value(status.url)')
WEB_URL=$(gcloud run services describe web-${SERVICE_NAME} --region=$REGION --format='value(status.url)')

echo "  API: $API_URL"
echo "  Web: $WEB_URL"

echo ""
echo "🎉 Deployment successful! Your application is now live."