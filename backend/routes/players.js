const express = require('express');
const router = express.Router();
const { runQuery, getQuery, allQuery } = require('../config/databaseAdapter');

// Add a new player
router.post('/', async (req, res) => {
    try {
        const { group_id, player_name, handicap } = req.body;

        if (!group_id || !player_name) {
            return res.status(400).json({ error: 'Group ID and player name are required' });
        }

        const result = await runQuery(
            'INSERT INTO players (group_id, player_name, handicap) VALUES (?, ?, ?)',
            [group_id, player_name, handicap || 0]
        );

        const player = await getQuery('SELECT * FROM players WHERE id = ?', [result.id]);
        res.status(201).json(player);
    } catch (error) {
        console.error('Error adding player:', error);
        res.status(500).json({ error: 'Failed to add player' });
    }
});

// Get players in a group
router.get('/group/:groupId', async (req, res) => {
    try {
        const { groupId } = req.params;
        const players = await allQuery('SELECT * FROM players WHERE group_id = ?', [groupId]);
        res.json(players);
    } catch (error) {
        console.error('Error fetching players:', error);
        res.status(500).json({ error: 'Failed to fetch players' });
    }
});

// Get a specific player
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const player = await getQuery('SELECT * FROM players WHERE id = ?', [id]);

        if (!player) {
            return res.status(404).json({ error: 'Player not found' });
        }

        res.json(player);
    } catch (error) {
        console.error('Error fetching player:', error);
        res.status(500).json({ error: 'Failed to fetch player' });
    }
});

// Update a player
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { player_name, handicap } = req.body;

        const player = await getQuery('SELECT * FROM players WHERE id = ?', [id]);
        if (!player) {
            return res.status(404).json({ error: 'Player not found' });
        }

        await runQuery(
            'UPDATE players SET player_name = ?, handicap = ? WHERE id = ?',
            [
                player_name !== undefined ? player_name : player.player_name,
                handicap !== undefined ? handicap : player.handicap,
                id
            ]
        );

        const updatedPlayer = await getQuery('SELECT * FROM players WHERE id = ?', [id]);
        res.json(updatedPlayer);
    } catch (error) {
        console.error('Error updating player:', error);
        res.status(500).json({ error: 'Failed to update player' });
    }
});

// Delete a player
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;

        // Check if player exists
        const player = await getQuery('SELECT * FROM players WHERE id = ?', [id]);
        if (!player) {
            return res.status(404).json({ error: 'Player not found' });
        }

        // Delete player's scores first
        await runQuery('DELETE FROM scores WHERE player_id = ?', [id]);

        // Delete player
        await runQuery('DELETE FROM players WHERE id = ?', [id]);

        res.json({ message: 'Player deleted successfully', id: parseInt(id) });
    } catch (error) {
        console.error('Error deleting player:', error);
        res.status(500).json({ error: 'Failed to delete player' });
    }
});

module.exports = router;
