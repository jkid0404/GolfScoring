const express = require('express');
const router = express.Router();
const { runQuery, allQuery, getQuery } = require('../config/databaseAdapter');

// Get all master players
router.get('/', async (req, res) => {
    try {
        const players = await allQuery('SELECT * FROM players_master ORDER BY player_name');
        res.json(players);
    } catch (error) {
        console.error('Error fetching master players:', error);
        res.status(500).json({ error: 'Failed to fetch master players' });
    }
});

// Get a single master player
router.get('/:id', async (req, res) => {
    try {
        const player = await getQuery('SELECT * FROM players_master WHERE id = ?', [req.params.id]);
        if (!player) {
            return res.status(404).json({ error: 'Player not found' });
        }
        res.json(player);
    } catch (error) {
        console.error('Error fetching master player:', error);
        res.status(500).json({ error: 'Failed to fetch master player' });
    }
});

// Create a new master player
router.post('/', async (req, res) => {
    try {
        const { player_name, email, ghin, handicap } = req.body;

        if (!player_name) {
            return res.status(400).json({ error: 'Player name is required' });
        }

        const result = await runQuery(
            'INSERT INTO players_master (player_name, email, ghin, handicap) VALUES (?, ?, ?, ?)',
            [player_name, email || null, ghin || null, handicap || 0]
        );

        const newPlayer = await getQuery('SELECT * FROM players_master WHERE id = ?', [result.id]);
        res.status(201).json(newPlayer);
    } catch (error) {
        console.error('Error creating master player:', error);
        res.status(500).json({ error: 'Failed to create master player' });
    }
});

// Update a master player
router.put('/:id', async (req, res) => {
    try {
        const { player_name, email, ghin, handicap } = req.body;

        if (!player_name) {
            return res.status(400).json({ error: 'Player name is required' });
        }

        await runQuery(
            'UPDATE players_master SET player_name = ?, email = ?, ghin = ?, handicap = ? WHERE id = ?',
            [player_name, email || null, ghin || null, handicap || 0, req.params.id]
        );

        const updatedPlayer = await getQuery('SELECT * FROM players_master WHERE id = ?', [req.params.id]);
        res.json(updatedPlayer);
    } catch (error) {
        console.error('Error updating master player:', error);
        res.status(500).json({ error: 'Failed to update master player' });
    }
});

// Delete a master player
router.delete('/:id', async (req, res) => {
    try {
        await runQuery('DELETE FROM players_master WHERE id = ?', [req.params.id]);
        res.json({ message: 'Master player deleted successfully' });
    } catch (error) {
        console.error('Error deleting master player:', error);
        res.status(500).json({ error: 'Failed to delete master player' });
    }
});

module.exports = router;
