const express = require('express');
const router = express.Router();
const { runQuery, getQuery, allQuery } = require('../config/database');

// Create a new group
router.post('/', async (req, res) => {
    try {
        const { tournament_id, group_name } = req.body;

        if (!tournament_id || !group_name) {
            return res.status(400).json({ error: 'Tournament ID and group name are required' });
        }

        const result = await runQuery(
            'INSERT INTO groups (tournament_id, group_name) VALUES (?, ?)',
            [tournament_id, group_name]
        );

        const group = await getQuery('SELECT * FROM groups WHERE id = ?', [result.id]);
        res.status(201).json(group);
    } catch (error) {
        console.error('Error creating group:', error);
        res.status(500).json({ error: 'Failed to create group' });
    }
});

// Get all groups for a tournament
router.get('/tournament/:tournamentId', async (req, res) => {
    try {
        const { tournamentId } = req.params;

        const groups = await allQuery(`
            SELECT g.*, COUNT(p.id) as player_count
            FROM groups g
            LEFT JOIN players p ON g.id = p.group_id
            WHERE g.tournament_id = ?
            GROUP BY g.id, g.tournament_id, g.group_name, g.created_at
            ORDER BY g.created_at
        `, [tournamentId]);

        res.json(groups);
    } catch (error) {
        console.error('Error fetching groups:', error);
        res.status(500).json({ error: 'Failed to fetch groups' });
    }
});

// Get a specific group with players
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;

        const group = await getQuery('SELECT * FROM groups WHERE id = ?', [id]);

        if (!group) {
            return res.status(404).json({ error: 'Group not found' });
        }

        const players = await allQuery('SELECT * FROM players WHERE group_id = ?', [id]);
        group.players = players;

        res.json(group);
    } catch (error) {
        console.error('Error fetching group:', error);
        res.status(500).json({ error: 'Failed to fetch group' });
    }
});

// Delete a group (cascade deletes players and scores)
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;

        // Delete scores for all players in this group
        await runQuery('DELETE FROM scores WHERE group_id = ?', [id]);

        // Delete all players in this group
        await runQuery('DELETE FROM players WHERE group_id = ?', [id]);

        // Delete the group
        await runQuery('DELETE FROM groups WHERE id = ?', [id]);

        res.json({ message: 'Group deleted successfully' });
    } catch (error) {
        console.error('Error deleting group:', error);
        res.status(500).json({ error: 'Failed to delete group' });
    }
});

module.exports = router;
