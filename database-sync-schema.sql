-- SQL ALTER TABLE statements to add synchronization support columns
-- Execute these statements in your PostgreSQL database

-- Add pending_sync column (BOOLEAN, default false)
ALTER TABLE tareas 
ADD COLUMN pending_sync BOOLEAN DEFAULT false;

-- Add updated_at column (BIGINT, for storing Date.now())
ALTER TABLE tareas 
ADD COLUMN updated_at BIGINT;

-- Add deleted column (BOOLEAN, default false)
ALTER TABLE tareas 
ADD COLUMN deleted BOOLEAN DEFAULT false;

-- Add deleted_at column (TIMESTAMP, nullable)
ALTER TABLE tareas 
ADD COLUMN deleted_at TIMESTAMP;

-- Initialize updated_at for existing records with current timestamp
UPDATE tareas 
SET updated_at = EXTRACT(EPOCH FROM NOW()) * 1000 
WHERE updated_at IS NULL;

-- Make updated_at NOT NULL after initialization
ALTER TABLE tareas 
ALTER COLUMN updated_at SET NOT NULL;

-- Optional: Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_tareas_deleted ON tareas(deleted);
CREATE INDEX IF NOT EXISTS idx_tareas_updated_at ON tareas(updated_at);
CREATE INDEX IF NOT EXISTS idx_tareas_pending_sync ON tareas(pending_sync);