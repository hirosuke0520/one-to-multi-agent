-- Add columns for storing original uploaded files
ALTER TABLE content_metadata 
ADD COLUMN IF NOT EXISTS original_file_path TEXT,
ADD COLUMN IF NOT EXISTS original_file_name TEXT,
ADD COLUMN IF NOT EXISTS original_mime_type TEXT,
ADD COLUMN IF NOT EXISTS original_file_size BIGINT;

-- Index for faster queries
CREATE INDEX IF NOT EXISTS idx_content_metadata_original_file 
ON content_metadata(content_id) 
WHERE original_file_path IS NOT NULL;