-- Golf Tournament Scoring Database Schema
-- Azure SQL Database

-- Tournaments table
CREATE TABLE tournaments (
    id INT PRIMARY KEY IDENTITY(1,1),
    name NVARCHAR(255) NOT NULL,
    date DATE NOT NULL,
    course_name NVARCHAR(255),
    created_at DATETIME DEFAULT GETDATE()
);

-- Groups table
CREATE TABLE groups (
    id INT PRIMARY KEY IDENTITY(1,1),
    tournament_id INT FOREIGN KEY REFERENCES tournaments(id),
    group_name NVARCHAR(100) NOT NULL,
    created_at DATETIME DEFAULT GETDATE()
);

-- Players table
CREATE TABLE players (
    id INT PRIMARY KEY IDENTITY(1,1),
    group_id INT FOREIGN KEY REFERENCES groups(id),
    player_name NVARCHAR(100) NOT NULL,
    handicap INT DEFAULT 0
);

-- Scores table
CREATE TABLE scores (
    id INT PRIMARY KEY IDENTITY(1,1),
    player_id INT FOREIGN KEY REFERENCES players(id),
    group_id INT FOREIGN KEY REFERENCES groups(id),
    tournament_id INT FOREIGN KEY REFERENCES tournaments(id),
    hole_number INT NOT NULL CHECK (hole_number BETWEEN 1 AND 18),
    strokes INT NOT NULL,
    created_at DATETIME DEFAULT GETDATE(),
    updated_at DATETIME DEFAULT GETDATE()
);

-- Create indexes for better query performance
CREATE INDEX idx_scores_player ON scores(player_id);
CREATE INDEX idx_scores_tournament ON scores(tournament_id);
CREATE INDEX idx_players_group ON players(group_id);
CREATE INDEX idx_groups_tournament ON groups(tournament_id);
