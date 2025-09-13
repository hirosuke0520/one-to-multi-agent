-- Content metadata tables for Cloud SQL

-- Content generation history
CREATE TABLE IF NOT EXISTS content_metadata (
    id VARCHAR(255) PRIMARY KEY,
    source_type VARCHAR(20) NOT NULL CHECK (source_type IN ('text', 'audio', 'video')),
    source_text TEXT, -- For text input content
    original_file_name VARCHAR(255),
    original_file_path VARCHAR(500), -- Path to stored file
    file_size BIGINT,
    mime_type VARCHAR(100),
    duration INTEGER, -- in seconds
    user_id VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Audio/Video preview data
CREATE TABLE IF NOT EXISTS preview_data (
    id SERIAL PRIMARY KEY,
    content_id VARCHAR(255) REFERENCES content_metadata(id) ON DELETE CASCADE,
    preview_type VARCHAR(20) NOT NULL CHECK (preview_type IN ('audio', 'video')),
    duration INTEGER,
    waveform_data JSONB, -- for audio: array of amplitude values
    thumbnail_base64 TEXT, -- for video: base64 encoded thumbnail
    video_width INTEGER,
    video_height INTEGER,
    transcript_preview TEXT, -- first few sentences
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Note: platform_content table is already created in 01-init-db.sql
-- Adding additional columns to existing platform_content table
ALTER TABLE platform_content 
ADD COLUMN IF NOT EXISTS content_id VARCHAR(255) REFERENCES content_metadata(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS title TEXT,
ADD COLUMN IF NOT EXISTS description TEXT,
ADD COLUMN IF NOT EXISTS content TEXT,
ADD COLUMN IF NOT EXISTS hashtags JSONB,
ADD COLUMN IF NOT EXISTS script TEXT,
ADD COLUMN IF NOT EXISTS chapters JSONB;

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_content_metadata_user_id ON content_metadata(user_id);
CREATE INDEX IF NOT EXISTS idx_content_metadata_created_at ON content_metadata(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_content_metadata_source_type ON content_metadata(source_type);
CREATE INDEX IF NOT EXISTS idx_preview_data_content_id ON preview_data(content_id);
-- Index on content_id column (if it exists)
CREATE INDEX IF NOT EXISTS idx_platform_content_content_id ON platform_content(content_id);
CREATE INDEX IF NOT EXISTS idx_platform_content_platform ON platform_content(platform);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger for automatic updated_at (drop and recreate to avoid errors)
DROP TRIGGER IF EXISTS update_content_metadata_updated_at ON content_metadata;
CREATE TRIGGER update_content_metadata_updated_at
    BEFORE UPDATE ON content_metadata
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Add missing columns for existing tables
ALTER TABLE content_metadata ADD COLUMN IF NOT EXISTS original_file_path VARCHAR(500);