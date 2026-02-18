const express = require('express');
const router = express.Router();
const { runQuery, getQuery, allQuery } = require('../config/database');

// Submit or update a score
router.post('/', async (req, res) => {
    try {
        const { player_id, group_id, tournament_id, hole_number, strokes } = req.body;

        if (!player_id || !group_id || !tournament_id || !hole_number || strokes === undefined) {
            return res.status(400).json({ error: 'All fields are required' });
        }

        if (hole_number < 1 || hole_number > 18) {
            return res.status(400).json({ error: 'Hole number must be between 1 and 18' });
        }

        // Check if score already exists
        const existingScore = await getQuery(
            'SELECT id FROM scores WHERE player_id = ? AND hole_number = ?',
            [player_id, hole_number]
        );

        let result;
        if (existingScore) {
            // Update existing score
            await runQuery(
                'UPDATE scores SET strokes = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
                [strokes, existingScore.id]
            );
            result = await getQuery('SELECT * FROM scores WHERE id = ?', [existingScore.id]);
        } else {
            // Insert new score
            const insertResult = await runQuery(
                'INSERT INTO scores (player_id, group_id, tournament_id, hole_number, strokes) VALUES (?, ?, ?, ?, ?)',
                [player_id, group_id, tournament_id, hole_number, strokes]
            );
            result = await getQuery('SELECT * FROM scores WHERE id = ?', [insertResult.id]);
        }

        // Emit socket event for real-time update
        if (req.app.get('io')) {
            req.app.get('io').to(`tournament_${tournament_id}`).emit('score_updated', {
                player_id,
                group_id,
                tournament_id,
                hole_number,
                strokes
            });
        }

        res.status(201).json(result);
    } catch (error) {
        console.error('Error submitting score:', error);
        res.status(500).json({ error: 'Failed to submit score' });
    }
});

// Get scores for a player
router.get('/player/:playerId', async (req, res) => {
    try {
        const { playerId } = req.params;
        const scores = await allQuery(
            'SELECT * FROM scores WHERE player_id = ? ORDER BY hole_number',
            [playerId]
        );
        res.json(scores);
    } catch (error) {
        console.error('Error fetching scores:', error);
        res.status(500).json({ error: 'Failed to fetch scores' });
    }
});

// Get leaderboard for a tournament
router.get('/leaderboard/:tournamentId', async (req, res) => {
    try {
        const { tournamentId } = req.params;

        const leaderboard = await allQuery(`
            SELECT
                p.id as player_id,
                p.player_name,
                p.handicap,
                g.id as group_id,
                g.group_name,
                COALESCE(SUM(s.strokes), 0) as total_strokes,
                COUNT(DISTINCT s.hole_number) as holes_completed,
                COALESCE(SUM(s.strokes), 0) - p.handicap as net_score
            FROM players p
            INNER JOIN groups g ON p.group_id = g.id
            LEFT JOIN scores s ON p.id = s.player_id
            WHERE g.tournament_id = ?
            GROUP BY p.id, p.player_name, p.handicap, g.id, g.group_name
            ORDER BY net_score ASC, total_strokes ASC
        `, [tournamentId]);

        res.json(leaderboard);
    } catch (error) {
        console.error('Error fetching leaderboard:', error);
        res.status(500).json({ error: 'Failed to fetch leaderboard' });
    }
});

module.exports = router;
