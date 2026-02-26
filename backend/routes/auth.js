const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { runQuery, getQuery, allQuery } = require('../config/databaseAdapter');

// Helper function to generate random code
function generateCode(length = 6) {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Exclude ambiguous chars
    let code = '';
    for (let i = 0; i < length; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
}

// Generate unique group code with retry logic
async function generateUniqueGroupCode() {
    let attempts = 0;
    while (attempts < 10) {
        const code = generateCode(6);
        const existing = await getQuery('SELECT id FROM groups WHERE code = ?', [code]);
        if (!existing) return code;
        attempts++;
    }
    throw new Error('Failed to generate unique code');
}

// Check if any admin accounts exist
router.get('/admin-exists', async (req, res) => {
    try {
        const dbType = process.env.DB_TYPE || 'sqlite';
        const query = dbType === 'azure_sql'
            ? 'SELECT TOP 1 id FROM admins'
            : 'SELECT id FROM admins LIMIT 1';
        const admin = await getQuery(query);
        res.json({ exists: !!admin });
    } catch (error) {
        console.error('Error checking admin existence:', error);
        res.status(500).json({ error: 'Failed to check admin existence' });
    }
});

// Create first admin account (only works if no admins exist)
router.post('/admin-signup', async (req, res) => {
    try {
        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({ error: 'Username and password are required' });
        }

        // Check if any admin exists
        const dbType = process.env.DB_TYPE || 'sqlite';
        const query = dbType === 'azure_sql'
            ? 'SELECT TOP 1 id FROM admins'
            : 'SELECT id FROM admins LIMIT 1';
        const existingAdmin = await getQuery(query);
        if (existingAdmin) {
            return res.status(403).json({ error: 'Admin account already exists. Cannot create another admin.' });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Create admin
        await runQuery(
            'INSERT INTO admins (username, password) VALUES (?, ?)',
            [username, hashedPassword]
        );

        res.status(201).json({ message: 'Admin account created successfully' });
    } catch (error) {
        console.error('Error creating admin account:', error);
        if (error.message && error.message.includes('UNIQUE constraint')) {
            return res.status(400).json({ error: 'Username already exists' });
        }
        res.status(500).json({ error: 'Failed to create admin account' });
    }
});

// Verify admin credentials
router.post('/admin', async (req, res) => {
    try {
        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({ error: 'Username and password are required' });
        }

        const admin = await getQuery('SELECT * FROM admins WHERE username = ?', [username]);

        if (!admin) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const isValid = await bcrypt.compare(password, admin.password);

        if (!isValid) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        res.json({
            message: 'Authentication successful',
            userType: 'admin'
        });
    } catch (error) {
        console.error('Error verifying admin credentials:', error);
        res.status(500).json({ error: 'Authentication failed' });
    }
});

// Verify tournament code
router.post('/tournament-code', async (req, res) => {
    try {
        const { code } = req.body;

        if (!code) {
            return res.status(400).json({ error: 'Code is required' });
        }

        const tournament = await getQuery('SELECT * FROM tournaments WHERE code = ?', [code]);

        if (!tournament) {
            return res.status(401).json({ error: 'Invalid tournament code' });
        }

        // Parse JSON fields
        if (tournament.par_values) {
            tournament.par_values = JSON.parse(tournament.par_values);
        }
        if (tournament.handicap_indices) {
            tournament.handicap_indices = JSON.parse(tournament.handicap_indices);
        }

        res.json({
            message: 'Authentication successful',
            userType: 'tournament',
            tournamentId: tournament.id,
            tournamentData: tournament
        });
    } catch (error) {
        console.error('Error verifying tournament code:', error);
        res.status(500).json({ error: 'Authentication failed' });
    }
});

// Verify group code
router.post('/group-code', async (req, res) => {
    try {
        const { code } = req.body;

        if (!code) {
            return res.status(400).json({ error: 'Code is required' });
        }

        const group = await getQuery('SELECT * FROM groups WHERE code = ?', [code]);

        if (!group) {
            return res.status(401).json({ error: 'Invalid group code' });
        }

        // Get tournament data
        const tournament = await getQuery('SELECT * FROM tournaments WHERE id = ?', [group.tournament_id]);

        if (!tournament) {
            return res.status(404).json({ error: 'Tournament not found for this group' });
        }

        // Parse JSON fields
        if (tournament.par_values) {
            tournament.par_values = JSON.parse(tournament.par_values);
        }
        if (tournament.handicap_indices) {
            tournament.handicap_indices = JSON.parse(tournament.handicap_indices);
        }

        // Get players for this group
        const players = await allQuery('SELECT * FROM players WHERE group_id = ?', [group.id]);
        group.players = players;

        res.json({
            message: 'Authentication successful',
            userType: 'group',
            tournamentId: tournament.id,
            groupId: group.id,
            tournamentData: tournament,
            groupData: group
        });
    } catch (error) {
        console.error('Error verifying group code:', error);
        res.status(500).json({ error: 'Authentication failed' });
    }
});

module.exports = {
    router,
    generateUniqueGroupCode
};
