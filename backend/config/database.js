const sqlite3 = require('sqlite3').verbose();
const path = require('path');
require('dotenv').config();

const dbPath = process.env.DB_PATH || path.join(__dirname, '..', 'golf_scoring.db');

let db = null;

const getDatabase = () => {
    return new Promise((resolve, reject) => {
        if (db) {
            return resolve(db);
        }

        db = new sqlite3.Database(dbPath, (err) => {
            if (err) {
                console.error('Error opening database:', err);
                reject(err);
            } else {
                console.log('Connected to SQLite database at:', dbPath);
                initializeDatabase(db)
                    .then(() => resolve(db))
                    .catch(reject);
            }
        });
    });
};

const initializeDatabase = (database) => {
    return new Promise((resolve, reject) => {
        database.serialize(() => {
            // Create tournaments table
            database.run(`
                CREATE TABLE IF NOT EXISTS tournaments (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    name TEXT NOT NULL,
                    date TEXT NOT NULL,
                    course_name TEXT,
                    par_values TEXT DEFAULT '{"1":4,"2":4,"3":4,"4":4,"5":4,"6":4,"7":4,"8":4,"9":4,"10":4,"11":4,"12":4,"13":4,"14":4,"15":4,"16":4,"17":4,"18":4}',
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                )
            `, (err) => {
                if (err) console.error('Error creating tournaments table:', err);
            });

            // Create groups table
            database.run(`
                CREATE TABLE IF NOT EXISTS groups (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    tournament_id INTEGER NOT NULL,
                    group_name TEXT NOT NULL,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (tournament_id) REFERENCES tournaments(id)
                )
            `, (err) => {
                if (err) console.error('Error creating groups table:', err);
            });

            // Create players table
            database.run(`
                CREATE TABLE IF NOT EXISTS players (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    group_id INTEGER NOT NULL,
                    player_name TEXT NOT NULL,
                    handicap INTEGER DEFAULT 0,
                    FOREIGN KEY (group_id) REFERENCES groups(id)
                )
            `, (err) => {
                if (err) console.error('Error creating players table:', err);
            });

            // Create scores table
            database.run(`
                CREATE TABLE IF NOT EXISTS scores (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    player_id INTEGER NOT NULL,
                    group_id INTEGER NOT NULL,
                    tournament_id INTEGER NOT NULL,
                    hole_number INTEGER NOT NULL CHECK (hole_number BETWEEN 1 AND 18),
                    strokes INTEGER NOT NULL,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (player_id) REFERENCES players(id),
                    FOREIGN KEY (group_id) REFERENCES groups(id),
                    FOREIGN KEY (tournament_id) REFERENCES tournaments(id)
                )
            `, (err) => {
                if (err) {
                    console.error('Error creating scores table:', err);
                    reject(err);
                }
            });

            // Create players_master table (master list of all players)
            database.run(`
                CREATE TABLE IF NOT EXISTS players_master (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    player_name TEXT NOT NULL,
                    ghin TEXT,
                    handicap INTEGER DEFAULT 0,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                )
            `, (err) => {
                if (err) console.error('Error creating players_master table:', err);
            });

            // Create courses table
            database.run(`
                CREATE TABLE IF NOT EXISTS courses (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    course_name TEXT NOT NULL UNIQUE,
                    par_values TEXT DEFAULT '{"1":4,"2":4,"3":4,"4":4,"5":4,"6":4,"7":4,"8":4,"9":4,"10":4,"11":4,"12":4,"13":4,"14":4,"15":4,"16":4,"17":4,"18":4}',
                    handicap_indices TEXT DEFAULT '{"1":1,"2":2,"3":3,"4":4,"5":5,"6":6,"7":7,"8":8,"9":9,"10":10,"11":11,"12":12,"13":13,"14":14,"15":15,"16":16,"17":17,"18":18}',
                    course_rating REAL DEFAULT 72.0,
                    slope INTEGER DEFAULT 113,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                )
            `, (err) => {
                if (err) console.error('Error creating courses table:', err);
            });

            // Add course_rating column to courses if it doesn't exist
            database.run(`
                ALTER TABLE courses ADD COLUMN course_rating REAL DEFAULT 72.0
            `, (err) => {
                if (err && !err.message.includes('duplicate column name')) {
                    console.error('Error adding course_rating column to courses:', err);
                }
            });

            // Add slope column to courses if it doesn't exist
            database.run(`
                ALTER TABLE courses ADD COLUMN slope INTEGER DEFAULT 113
            `, (err) => {
                if (err && !err.message.includes('duplicate column name')) {
                    console.error('Error adding slope column to courses:', err);
                }
            });

            // Create indexes
            database.run('CREATE INDEX IF NOT EXISTS idx_scores_player ON scores(player_id)');
            database.run('CREATE INDEX IF NOT EXISTS idx_scores_tournament ON scores(tournament_id)');
            database.run('CREATE INDEX IF NOT EXISTS idx_players_group ON players(group_id)');
            database.run('CREATE INDEX IF NOT EXISTS idx_groups_tournament ON groups(tournament_id)');

            // Add par_values column if it doesn't exist (for existing databases)
            database.run(`
                ALTER TABLE tournaments ADD COLUMN par_values TEXT DEFAULT '{"1":4,"2":4,"3":4,"4":4,"5":4,"6":4,"7":4,"8":4,"9":4,"10":4,"11":4,"12":4,"13":4,"14":4,"15":4,"16":4,"17":4,"18":4}'
            `, (err) => {
                if (err && !err.message.includes('duplicate column name')) {
                    console.error('Error adding par_values column:', err);
                }
            });

            // Add handicap_indices column if it doesn't exist (for existing databases)
            database.run(`
                ALTER TABLE tournaments ADD COLUMN handicap_indices TEXT DEFAULT '{"1":1,"2":2,"3":3,"4":4,"5":5,"6":6,"7":7,"8":8,"9":9,"10":10,"11":11,"12":12,"13":13,"14":14,"15":15,"16":16,"17":17,"18":18}'
            `, (err) => {
                if (err && !err.message.includes('duplicate column name')) {
                    console.error('Error adding handicap_indices column:', err);
                }
            });

            // Add course_rating column if it doesn't exist (for existing databases)
            database.run(`
                ALTER TABLE tournaments ADD COLUMN course_rating REAL DEFAULT 72.0
            `, (err) => {
                if (err && !err.message.includes('duplicate column name')) {
                    console.error('Error adding course_rating column:', err);
                }
            });

            // Add slope column if it doesn't exist (for existing databases)
            database.run(`
                ALTER TABLE tournaments ADD COLUMN slope INTEGER DEFAULT 113
            `, (err) => {
                if (err && !err.message.includes('duplicate column name')) {
                    console.error('Error adding slope column:', err);
                }
            });

            // Add game_scoring column if it doesn't exist (for existing databases)
            database.run(`
                ALTER TABLE tournaments ADD COLUMN game_scoring TEXT DEFAULT 'Individual'
            `, (err) => {
                if (err && !err.message.includes('duplicate column name')) {
                    console.error('Error adding game_scoring column:', err);
                }
            });

            // Add handicap column to players_master if it doesn't exist
            database.run(`
                ALTER TABLE players_master ADD COLUMN handicap INTEGER DEFAULT 0
            `, (err) => {
                if (err && !err.message.includes('duplicate column name')) {
                    console.error('Error adding handicap column to players_master:', err);
                }
                // Resolve after all tables and migrations are complete
                console.log('Database tables initialized successfully');
                resolve();
            });
        });
    });
};

const runQuery = (query, params = []) => {
    return new Promise((resolve, reject) => {
        getDatabase()
            .then(database => {
                database.run(query, params, function(err) {
                    if (err) {
                        reject(err);
                    } else {
                        resolve({ id: this.lastID, changes: this.changes });
                    }
                });
            })
            .catch(reject);
    });
};

const getQuery = (query, params = []) => {
    return new Promise((resolve, reject) => {
        getDatabase()
            .then(database => {
                database.get(query, params, (err, row) => {
                    if (err) {
                        reject(err);
                    } else {
                        resolve(row);
                    }
                });
            })
            .catch(reject);
    });
};

const allQuery = (query, params = []) => {
    return new Promise((resolve, reject) => {
        getDatabase()
            .then(database => {
                database.all(query, params, (err, rows) => {
                    if (err) {
                        reject(err);
                    } else {
                        resolve(rows);
                    }
                });
            })
            .catch(reject);
    });
};

module.exports = {
    getDatabase,
    runQuery,
    getQuery,
    allQuery
};
