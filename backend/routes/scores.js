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

        // Get tournament data including handicap indices and par values
        const tournament = await getQuery('SELECT * FROM tournaments WHERE id = ?', [tournamentId]);
        const handicapIndices = tournament?.handicap_indices ? JSON.parse(tournament.handicap_indices) : null;
        const parValues = tournament?.par_values ? JSON.parse(tournament.par_values) : null;

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

        // Calculate skins
        const skins = calculateSkins(players, tournamentId, allQuery, handicapIndices, parValues);
        const { skinsCount, skinsDetails } = await skins;

        // Add skins count to each player
        for (const player of players) {
            player.skins = skinsCount[player.player_id] || 0;
        }

        // Sort by net score
        players.sort((a, b) => {
            if (a.net_score !== b.net_score) return a.net_score - b.net_score;
            return a.total_strokes - b.total_strokes;
        });

        // Return both players and skins details
        res.json({
            players: players,
            skinsDetails: skinsDetails
        });
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

// Helper function to get score name relative to par
function getScoreName(netScore, holePar) {
    const diff = netScore - holePar;

    if (diff <= -3) return 'Albatross';
    if (diff === -2) return 'Eagle';
    if (diff === -1) return 'Birdie';
    if (diff === 0) return 'Par';
    if (diff === 1) return 'Bogey';
    if (diff === 2) return 'Double Bogey';
    if (diff === 3) return 'Triple Bogey';
    return `+${diff}`;
}

// Helper function to calculate skins
async function calculateSkins(players, tournamentId, allQuery, handicapIndices, parValues) {
    const skinsCount = {};
    const skinsDetails = [];

    // Initialize skins count for all players
    for (const player of players) {
        skinsCount[player.player_id] = 0;
    }

    // Get all scores for all players grouped by hole
    const allScores = await allQuery(
        'SELECT player_id, hole_number, strokes FROM scores WHERE tournament_id = ? ORDER BY hole_number',
        [tournamentId]
    );

    // Group scores by hole
    const scoresByHole = {};
    for (const score of allScores) {
        if (!scoresByHole[score.hole_number]) {
            scoresByHole[score.hole_number] = [];
        }
        scoresByHole[score.hole_number].push(score);
    }

    // Process each hole
    for (let hole = 1; hole <= 18; hole++) {
        const holeScores = scoresByHole[hole] || [];
        const holePar = parValues?.[hole] || 4;

        if (holeScores.length === 0) {
            // Hole not played yet
            skinsDetails.push({
                hole,
                status: 'unplayed'
            });
            continue;
        }

        // Calculate net scores for this hole
        const netScores = holeScores.map(score => {
            const player = players.find(p => p.player_id === score.player_id);
            const holeHandicapIndex = handicapIndices?.[hole] || hole;
            const strokesReceived = getStrokesForHole(player.handicap, holeHandicapIndex);
            const netScore = score.strokes - strokesReceived;

            return {
                player_id: score.player_id,
                player_name: player.player_name,
                net_score: netScore,
                score_name: getScoreName(netScore, holePar)
            };
        });

        // Find the lowest net score
        const lowestScore = Math.min(...netScores.map(s => s.net_score));
        const winners = netScores.filter(s => s.net_score === lowestScore);

        // If there's a clear winner (no tie), award 1 skin
        if (winners.length === 1) {
            skinsCount[winners[0].player_id] += 1;
            skinsDetails.push({
                hole,
                status: 'won',
                winner: winners[0].player_name,
                scoreName: winners[0].score_name
            });
        } else {
            // Tie - no skin awarded
            const tieScoreName = getScoreName(lowestScore, holePar);
            skinsDetails.push({
                hole,
                status: 'tied',
                scoreName: tieScoreName,
                tiedCount: winners.length
            });
        }
    }

    return { skinsCount, skinsDetails };
}

module.exports = router;
