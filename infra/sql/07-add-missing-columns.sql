-- Add missing columns to content_metadata table
ALTER TABLE content_metadata 
ADD COLUMN IF NOT EXISTS original_file_path VARCHAR(500);