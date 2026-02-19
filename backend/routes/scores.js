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
        const gameScoring = tournament?.game_scoring || 'Individual';

        // Check if this is a team-based format
        if (gameScoring.includes('Best Ball')) {
            return handleBestBallLeaderboard(tournamentId, tournament, handicapIndices, parValues, gameScoring, allQuery, res);
        }

        // Check if this is a Shamble or Scramble format
        if (gameScoring.includes('Shamble') || gameScoring.includes('Scramble')) {
            return handleTeamFormatLeaderboard(tournamentId, tournament, handicapIndices, parValues, gameScoring, allQuery, res);
        }

        // Check if this is a 1,2,3 format
        if (gameScoring === '1,2,3') {
            return handle123Leaderboard(tournamentId, tournament, handicapIndices, parValues, allQuery, res);
        }

        // Get player data and their scores (Individual scoring)
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

// Helper function to handle best ball leaderboard
async function handleBestBallLeaderboard(tournamentId, tournament, handicapIndices, parValues, gameScoring, allQuery, res) {
    try {
        const isTwoPersonBestBall = gameScoring.includes('2 Person Best Ball');

        // Get all groups in the tournament
        const groups = await allQuery(
            'SELECT id, group_name FROM groups WHERE tournament_id = ?',
            [tournamentId]
        );

        const leaderboardData = [];

        for (const group of groups) {
            // Get all players in this group ordered by id
            const players = await allQuery(
                'SELECT id, player_name, handicap FROM players WHERE group_id = ? ORDER BY id',
                [group.id]
            );

            if (players.length === 0) continue;

            // For 2 Person Best Ball, split into teams of 2
            if (isTwoPersonBestBall) {
                // Team 1: First 2 players
                const team1 = players.slice(0, 2);
                // Team 2: Last 2 players
                const team2 = players.slice(Math.max(players.length - 2, 0));

                if (team1.length > 0) {
                    await processTeam(team1, group, 'Team 1', handicapIndices, allQuery, leaderboardData);
                }
                if (team2.length > 0 && team2[0].id !== team1[0].id) {
                    await processTeam(team2, group, 'Team 2', handicapIndices, allQuery, leaderboardData);
                }
                continue;
            }

            // Get all scores for all players in this group
            const allScores = await allQuery(
                'SELECT player_id, hole_number, strokes FROM scores WHERE player_id IN (' +
                players.map(p => p.id).join(',') + ') ORDER BY hole_number'
            );

            // Group scores by hole
            const scoresByHole = {};
            for (const score of allScores) {
                if (!scoresByHole[score.hole_number]) {
                    scoresByHole[score.hole_number] = [];
                }
                const player = players.find(p => p.id === score.player_id);
                const holeHandicapIndex = handicapIndices?.[score.hole_number] || score.hole_number;
                const strokesReceived = getStrokesForHole(player.handicap, holeHandicapIndex);

                scoresByHole[score.hole_number].push({
                    player_id: score.player_id,
                    gross_strokes: score.strokes,
                    net_strokes: score.strokes - strokesReceived
                });
            }

            // Calculate best ball scores
            let totalGross = 0;
            let totalNet = 0;
            let holesCompleted = 0;

            for (let hole = 1; hole <= 18; hole++) {
                const holeScores = scoresByHole[hole];
                if (holeScores && holeScores.length > 0) {
                    // Take the best (lowest) gross score
                    const bestGross = Math.min(...holeScores.map(s => s.gross_strokes));
                    // Take the best (lowest) net score
                    const bestNet = Math.min(...holeScores.map(s => s.net_strokes));

                    totalGross += bestGross;
                    totalNet += bestNet;
                    holesCompleted++;
                }
            }

            // Add group to leaderboard
            leaderboardData.push({
                group_id: group.id,
                group_name: group.group_name,
                player_names: players.map(p => p.player_name).join(', '),
                total_strokes: totalGross,
                net_score: totalNet,
                holes_completed: holesCompleted,
                skins: 0 // Best ball doesn't use skins typically
            });
        }

        // Sort by net score
        leaderboardData.sort((a, b) => {
            if (a.net_score !== b.net_score) return a.net_score - b.net_score;
            return a.total_strokes - b.total_strokes;
        });

        // Calculate skins using individual player scores
        // Get all individual players for skins calculation
        const allPlayers = [];
        for (const group of groups) {
            const players = await allQuery(
                'SELECT id as player_id, player_name, handicap FROM players WHERE group_id = ? ORDER BY id',
                [group.id]
            );
            allPlayers.push(...players);
        }

        const skins = calculateSkins(allPlayers, tournamentId, allQuery, handicapIndices, parValues);
        const { skinsDetails } = await skins;

        // Return with individual skins data
        res.json({
            players: leaderboardData,
            skinsDetails: skinsDetails,
            isBestBall: true
        });
    } catch (error) {
        console.error('Error calculating best ball leaderboard:', error);
        res.status(500).json({ error: 'Failed to calculate best ball leaderboard' });
    }
}

// Helper function to process a team for best ball
async function processTeam(players, group, teamLabel, handicapIndices, allQuery, leaderboardData) {
    // Get all scores for all players in this team
    const allScores = await allQuery(
        'SELECT player_id, hole_number, strokes FROM scores WHERE player_id IN (' +
        players.map(p => p.id).join(',') + ') ORDER BY hole_number'
    );

    // Group scores by hole
    const scoresByHole = {};
    for (const score of allScores) {
        if (!scoresByHole[score.hole_number]) {
            scoresByHole[score.hole_number] = [];
        }
        const player = players.find(p => p.id === score.player_id);
        const holeHandicapIndex = handicapIndices?.[score.hole_number] || score.hole_number;
        const strokesReceived = getStrokesForHole(player.handicap, holeHandicapIndex);

        scoresByHole[score.hole_number].push({
            player_id: score.player_id,
            gross_strokes: score.strokes,
            net_strokes: score.strokes - strokesReceived
        });
    }

    // Calculate best ball scores
    let totalGross = 0;
    let totalNet = 0;
    let holesCompleted = 0;

    for (let hole = 1; hole <= 18; hole++) {
        const holeScores = scoresByHole[hole];
        if (holeScores && holeScores.length > 0) {
            // Take the best (lowest) gross score
            const bestGross = Math.min(...holeScores.map(s => s.gross_strokes));
            // Take the best (lowest) net score
            const bestNet = Math.min(...holeScores.map(s => s.net_strokes));

            totalGross += bestGross;
            totalNet += bestNet;
            holesCompleted++;
        }
    }

    // Add team to leaderboard
    leaderboardData.push({
        group_id: `${group.id}-${teamLabel}`,
        group_name: group.group_name,
        player_names: players.map(p => p.player_name).join(' & '),
        total_strokes: totalGross,
        net_score: totalNet,
        holes_completed: holesCompleted,
        skins: 0
    });
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

// Helper function to handle Shamble and Scramble leaderboard
async function handleTeamFormatLeaderboard(tournamentId, tournament, handicapIndices, parValues, gameScoring, allQuery, res) {
    try {
        const isTwoPersonFormat = gameScoring.includes('2 Person');

        // Get all groups in the tournament
        const groups = await allQuery(
            'SELECT id, group_name FROM groups WHERE tournament_id = ?',
            [tournamentId]
        );

        const leaderboardData = [];
        const allTeams = []; // For skins calculation

        for (const group of groups) {
            // Get all players in this group ordered by id
            const players = await allQuery(
                'SELECT id, player_name, handicap FROM players WHERE group_id = ? ORDER BY id',
                [group.id]
            );

            if (players.length === 0) continue;

            // For 2 Person formats, split into teams of 2
            if (isTwoPersonFormat) {
                // Team 1: First 2 players
                const team1 = players.slice(0, 2);
                // Team 2: Last 2 players
                const team2 = players.slice(Math.max(players.length - 2, 0));

                if (team1.length > 0) {
                    const teamData = await processTeamFormat(team1, group, handicapIndices, allQuery);
                    if (teamData) {
                        leaderboardData.push(teamData);
                        allTeams.push({ ...teamData, team_id: `${group.id}-team1` });
                    }
                }
                if (team2.length > 0 && team2[0].id !== team1[0].id) {
                    const teamData = await processTeamFormat(team2, group, handicapIndices, allQuery);
                    if (teamData) {
                        leaderboardData.push(teamData);
                        allTeams.push({ ...teamData, team_id: `${group.id}-team2` });
                    }
                }
            }
        }

        // Sort by net score
        leaderboardData.sort((a, b) => {
            if (a.net_score !== b.net_score) return a.net_score - b.net_score;
            return a.total_strokes - b.total_strokes;
        });

        // Calculate skins using team scores
        const skins = calculateTeamSkins(allTeams, tournamentId, allQuery, handicapIndices, parValues);
        const { skinsDetails } = await skins;

        // Return with team skins data
        res.json({
            players: leaderboardData,
            skinsDetails: skinsDetails,
            isBestBall: true // Use same UI layout as best ball
        });
    } catch (error) {
        console.error('Error calculating team format leaderboard:', error);
        res.status(500).json({ error: 'Failed to calculate team format leaderboard' });
    }
}

// Helper function to process a team for Shamble/Scramble formats
async function processTeamFormat(players, group, handicapIndices, allQuery) {
    // Get scores for first player (all players in team have same score)
    const firstPlayer = players[0];
    const scores = await allQuery(
        'SELECT hole_number, strokes FROM scores WHERE player_id = ?',
        [firstPlayer.id]
    );

    if (scores.length === 0) return null;

    let totalGross = 0;
    let totalNet = 0;
    let holesCompleted = scores.length;

    // Calculate net scores
    for (const score of scores) {
        const holeHandicapIndex = handicapIndices?.[score.hole_number] || score.hole_number;
        // Use average team handicap for net calculation
        const avgHandicap = Math.round(players.reduce((sum, p) => sum + (p.handicap || 0), 0) / players.length);
        const strokesReceived = getStrokesForHole(avgHandicap, holeHandicapIndex);
        const netScore = Math.max(0, score.strokes - strokesReceived);

        totalGross += score.strokes;
        totalNet += netScore;
    }

    return {
        group_id: `${group.id}-team`,
        group_name: group.group_name,
        player_names: players.map(p => p.player_name).join(' & '),
        total_strokes: totalGross,
        net_score: totalNet,
        holes_completed: holesCompleted,
        skins: 0,
        players: players // Include for skins calculation
    };
}

// Helper function to calculate skins for team formats
async function calculateTeamSkins(teams, tournamentId, allQuery, handicapIndices, parValues) {
    const skinsCount = {};
    const skinsDetails = [];

    // Get all scores grouped by hole (use first player from each team)
    const allScores = await allQuery(
        'SELECT player_id, hole_number, strokes FROM scores WHERE tournament_id = ? ORDER BY hole_number',
        [tournamentId]
    );

    // Group scores by hole and map to teams
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

        // Calculate net scores for each team
        const teamNetScores = [];
        const processedTeams = new Set();

        for (const team of teams) {
            if (!team.players || processedTeams.has(team.team_id)) continue;

            const teamKey = team.team_id;
            processedTeams.add(teamKey);

            // Get score from first player in team (all have same score)
            const firstPlayer = team.players[0];
            const holeScore = holeScores.find(s => s.player_id === firstPlayer.id);

            if (holeScore) {
                const holeHandicapIndex = handicapIndices?.[hole] || hole;
                const avgHandicap = Math.round(team.players.reduce((sum, p) => sum + (p.handicap || 0), 0) / team.players.length);
                const strokesReceived = getStrokesForHole(avgHandicap, holeHandicapIndex);
                const netScore = holeScore.strokes - strokesReceived;

                teamNetScores.push({
                    team_name: team.player_names,
                    net_score: netScore,
                    score_name: getScoreName(netScore, holePar)
                });
            }
        }

        if (teamNetScores.length === 0) {
            skinsDetails.push({
                hole,
                status: 'unplayed'
            });
            continue;
        }

        // Find the lowest net score
        const lowestScore = Math.min(...teamNetScores.map(s => s.net_score));
        const winners = teamNetScores.filter(s => s.net_score === lowestScore);

        // If there's a clear winner (no tie), award 1 skin
        if (winners.length === 1) {
            skinsDetails.push({
                hole,
                status: 'won',
                winner: winners[0].team_name,
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

// Helper function to handle 1,2,3 format leaderboard
async function handle123Leaderboard(tournamentId, tournament, handicapIndices, parValues, allQuery, res) {
    try {
        // Get all groups in the tournament
        const groups = await allQuery(
            'SELECT id, group_name FROM groups WHERE tournament_id = ?',
            [tournamentId]
        );

        const leaderboardData = [];

        for (const group of groups) {
            // Get all players in this group
            const players = await allQuery(
                'SELECT id, player_name, handicap FROM players WHERE group_id = ?',
                [group.id]
            );

            if (players.length === 0) continue;

            // Get all scores for all players in this group
            const allScores = await allQuery(
                'SELECT player_id, hole_number, strokes FROM scores WHERE player_id IN (' +
                players.map(p => p.id).join(',') + ') ORDER BY hole_number'
            );

            // Group scores by hole
            const scoresByHole = {};
            for (const score of allScores) {
                if (!scoresByHole[score.hole_number]) {
                    scoresByHole[score.hole_number] = [];
                }
                const player = players.find(p => p.id === score.player_id);
                const holeHandicapIndex = handicapIndices?.[score.hole_number] || score.hole_number;
                const strokesReceived = getStrokesForHole(player.handicap, holeHandicapIndex);

                scoresByHole[score.hole_number].push({
                    player_id: score.player_id,
                    gross_strokes: score.strokes,
                    net_strokes: score.strokes - strokesReceived
                });
            }

            // Calculate 1,2,3 scores based on par values
            let totalGross = 0;
            let totalNet = 0;
            let effectivePar = 0; // Track the adjusted par
            let holesCompleted = 0;

            for (let hole = 1; hole <= 18; hole++) {
                const holeScores = scoresByHole[hole];
                if (holeScores && holeScores.length > 0) {
                    const holePar = parValues?.[hole] || 4;
                    let scoresToCount;

                    // Determine how many scores to count based on par
                    if (holePar === 3) {
                        scoresToCount = 1;
                    } else if (holePar === 4) {
                        scoresToCount = 2;
                    } else if (holePar === 5) {
                        scoresToCount = 3;
                    } else {
                        scoresToCount = 1; // Default for unusual pars
                    }

                    // Adjust par based on how many scores we're counting
                    const adjustedHolePar = holePar * scoresToCount;
                    effectivePar += adjustedHolePar;

                    // Sort scores and take the best N scores
                    const sortedGross = [...holeScores].sort((a, b) => a.gross_strokes - b.gross_strokes);
                    const sortedNet = [...holeScores].sort((a, b) => a.net_strokes - b.net_strokes);

                    // Sum the best N gross scores
                    const bestGrossScores = sortedGross.slice(0, Math.min(scoresToCount, sortedGross.length));
                    const holeGross = bestGrossScores.reduce((sum, s) => sum + s.gross_strokes, 0);

                    // Sum the best N net scores
                    const bestNetScores = sortedNet.slice(0, Math.min(scoresToCount, sortedNet.length));
                    const holeNet = bestNetScores.reduce((sum, s) => sum + s.net_strokes, 0);

                    totalGross += holeGross;
                    totalNet += holeNet;
                    holesCompleted++;
                }
            }

            // Add group to leaderboard
            leaderboardData.push({
                group_id: group.id,
                group_name: group.group_name,
                player_names: players.map(p => p.player_name).join(', '),
                total_strokes: totalGross,
                net_score: totalNet,
                holes_completed: holesCompleted,
                effective_par: effectivePar, // Include adjusted par for 1,2,3 format
                skins: 0
            });
        }

        // Sort by net score
        leaderboardData.sort((a, b) => {
            if (a.net_score !== b.net_score) return a.net_score - b.net_score;
            return a.total_strokes - b.total_strokes;
        });

        // Calculate skins using individual player scores
        const allPlayers = [];
        for (const group of groups) {
            const players = await allQuery(
                'SELECT id as player_id, player_name, handicap FROM players WHERE group_id = ?',
                [group.id]
            );
            allPlayers.push(...players);
        }

        const skins = calculateSkins(allPlayers, tournamentId, allQuery, handicapIndices, parValues);
        const { skinsDetails } = await skins;

        // Return with individual skins data
        res.json({
            players: leaderboardData,
            skinsDetails: skinsDetails,
            isBestBall: true // Use same UI layout as best ball
        });
    } catch (error) {
        console.error('Error calculating 1,2,3 leaderboard:', error);
        res.status(500).json({ error: 'Failed to calculate 1,2,3 leaderboard' });
    }
}

module.exports = router;
