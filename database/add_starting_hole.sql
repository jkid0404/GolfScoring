-- Add starting_hole column to groups table
-- Run this on Azure SQL Database

-- Add starting_hole column if it doesn't exist
IF NOT EXISTS (
    SELECT * FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_NAME = 'groups' AND COLUMN_NAME = 'starting_hole'
)
BEGIN
    ALTER TABLE groups ADD starting_hole INT DEFAULT 1;
END
GO

-- Verify the column was added
SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_DEFAULT
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_NAME = 'groups';
GO
