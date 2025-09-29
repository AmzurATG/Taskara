-- Add source_file_id column to work_items table
ALTER TABLE work_items ADD COLUMN source_file_id UUID;

-- Add foreign key constraint
ALTER TABLE work_items ADD CONSTRAINT fk_work_items_source_file_id 
    FOREIGN KEY (source_file_id) REFERENCES files (id);

-- Create index for better performance
CREATE INDEX idx_work_items_source_file_id ON work_items (source_file_id);