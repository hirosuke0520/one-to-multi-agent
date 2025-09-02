/**
 * Storage configuration for different environments
 */

export async function getStorageService() {
  const storageType = process.env.STORAGE_TYPE || 'local';
  
  if (storageType === 'gcs' && process.env.NODE_ENV === 'production') {
    // Use Google Cloud Storage in production
    const { FileStorageServiceGCS } = await import('../services/file-storage-service-gcs.js');
    return new FileStorageServiceGCS();
  } else {
    // Use local file storage for development
    const { FileStorageService } = await import('../services/file-storage-service.js');
    return new FileStorageService();
  }
}