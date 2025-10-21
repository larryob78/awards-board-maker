-- PromptCut Database Schema

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Projects table
CREATE TABLE IF NOT EXISTS projects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255) NOT NULL,
    fps INTEGER NOT NULL DEFAULT 30,
    resolution VARCHAR(20) NOT NULL DEFAULT '1920x1080',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Media table
CREATE TABLE IF NOT EXISTS media (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    filename VARCHAR(255) NOT NULL,
    uri_original TEXT NOT NULL,
    uri_proxy TEXT,
    uri_thumbnail TEXT,
    duration FLOAT,
    fps INTEGER,
    width INTEGER,
    height INTEGER,
    codec VARCHAR(50),
    file_size BIGINT,
    media_type VARCHAR(20) NOT NULL, -- 'video', 'audio', 'image'
    transcript TEXT,
    metadata_json JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create index on project_id for faster queries
CREATE INDEX IF NOT EXISTS idx_media_project_id ON media(project_id);

-- Timeline table
CREATE TABLE IF NOT EXISTS timeline (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    state_json JSONB NOT NULL DEFAULT '{"tracks": [], "duration": 0}',
    version INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create index on project_id
CREATE INDEX IF NOT EXISTS idx_timeline_project_id ON timeline(project_id);

-- Jobs table for async processing
CREATE TABLE IF NOT EXISTS jobs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL, -- 'upload', 'proxy', 'ai_plan', 'render', 'export'
    payload_json JSONB DEFAULT '{}',
    status VARCHAR(20) NOT NULL DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'failed'
    progress INTEGER DEFAULT 0, -- 0-100
    result_json JSONB,
    error_message TEXT,
    started_at TIMESTAMP WITH TIME ZONE,
    finished_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for job queries
CREATE INDEX IF NOT EXISTS idx_jobs_project_id ON jobs(project_id);
CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(status);
CREATE INDEX IF NOT EXISTS idx_jobs_type ON jobs(type);

-- Edit history table for undo/redo
CREATE TABLE IF NOT EXISTS edit_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    timeline_id UUID NOT NULL REFERENCES timeline(id) ON DELETE CASCADE,
    action VARCHAR(50) NOT NULL, -- 'cut', 'trim', 'transition', 'effect', etc.
    previous_state JSONB,
    new_state JSONB,
    user_prompt TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create index on project_id for edit history
CREATE INDEX IF NOT EXISTS idx_edit_history_project_id ON edit_history(project_id);

-- Exports table
CREATE TABLE IF NOT EXISTS exports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    job_id UUID REFERENCES jobs(id) ON DELETE SET NULL,
    filename VARCHAR(255) NOT NULL,
    uri TEXT,
    format VARCHAR(20) NOT NULL, -- 'mp4', 'mov', 'webm'
    resolution VARCHAR(20) NOT NULL,
    file_size BIGINT,
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP WITH TIME ZONE
);

-- Create index on project_id for exports
CREATE INDEX IF NOT EXISTS idx_exports_project_id ON exports(project_id);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for updated_at
CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON projects
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_timeline_updated_at BEFORE UPDATE ON timeline
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert a default demo project
INSERT INTO projects (id, title, fps, resolution)
VALUES ('00000000-0000-0000-0000-000000000001', 'Demo Project', 30, '1920x1080')
ON CONFLICT DO NOTHING;
