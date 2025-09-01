/**
 * Storage configuration for different environments
 */

export function getStorageService() {
  const storageType = process.env.STORAGE_TYPE || 'local';
  
  if (storageType === 'gcs' && process.env.NODE_ENV === 'production') {
    // Use Google Cloud Storage in production
    const { FileStorageServiceGCS } = require('../services/file-storage-service-gcs');
    return new FileStorageServiceGCS();
  } else {
    // Use local file storage for development
    const { FileStorageService } = require('../services/file-storage-service');
    return new FileStorageService();
  }
}