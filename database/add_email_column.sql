-- Add email column to players_master table
-- Run this on Azure SQL Database

-- Add email column if it doesn't exist
IF NOT EXISTS (
    SELECT * FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_NAME = 'players_master' AND COLUMN_NAME = 'email'
)
BEGIN
    ALTER TABLE players_master ADD email NVARCHAR(255);
END
GO

-- Verify the column was added
SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_NAME = 'players_master';
GO
