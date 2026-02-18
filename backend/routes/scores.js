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

        // Get tournament data including handicap indices
        const tournament = await getQuery('SELECT * FROM tournaments WHERE id = ?', [tournamentId]);
        const handicapIndices = tournament?.handicap_indices ? JSON.parse(tournament.handicap_indices) : null;

        // Get player data and their scores
        const players = await allQuery(`
            SELECT
                p.id as player_id,
                p.player_name,
                p.handicap,
                g.id as group_id,
                g.group_name,
                COALESCE(SUM(s.strokes), 0) as total_strokes,
                COUNT(DISTINCT s.hole_number) as holes_completed
            FROM players p
            INNER JOIN groups g ON p.group_id = g.id
            LEFT JOIN scores s ON p.id = s.player_id
            WHERE g.tournament_id = ?
            GROUP BY p.id, p.player_name, p.handicap, g.id, g.group_name
        `, [tournamentId]);

        // Calculate net scores for each player
        for (const player of players) {
            // Get all scores for this player
            const scores = await allQuery(
                'SELECT hole_number, strokes FROM scores WHERE player_id = ?',
                [player.player_id]
            );

            let netStrokes = 0;
            for (const score of scores) {
                const holeHandicapIndex = handicapIndices?.[score.hole_number] || score.hole_number;
                const strokesReceived = getStrokesForHole(player.handicap, holeHandicapIndex);
                netStrokes += Math.max(0, score.strokes - strokesReceived);
            }

            player.net_score = netStrokes;
        }

        // Sort by net score
        players.sort((a, b) => {
            if (a.net_score !== b.net_score) return a.net_score - b.net_score;
            return a.total_strokes - b.total_strokes;
        });

        res.json(players);
    } catch (error) {
        console.error('Error fetching leaderboard:', error);
        res.status(500).json({ error: 'Failed to fetch leaderboard' });
    }
});

// Helper function to calculate strokes received on a hole
function getStrokesForHole(playerHandicap, holeHandicapIndex) {
    if (!playerHandicap || !holeHandicapIndex) return 0;

    let strokes = 0;
    if (playerHandicap >= holeHandicapIndex) strokes++;
    if (playerHandicap >= 18 + holeHandicapIndex) strokes++;
    if (playerHandicap >= 36 + holeHandicapIndex) strokes++;

    return strokes;
}

module.exports = router;
