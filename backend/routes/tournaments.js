const express = require('express');
const router = express.Router();
const { runQuery, getQuery, allQuery } = require('../config/databaseAdapter');

// Create a new tournament
router.post('/', async (req, res) => {
    try {
        const { date, course_name, par_values, handicap_indices, course_rating, slope, game_scoring } = req.body;

        if (!date) {
            return res.status(400).json({ error: 'Date is required' });
        }

        // Use date as the name
        const name = date;
        const parJson = par_values ? JSON.stringify(par_values) : null;
        const handicapJson = handicap_indices ? JSON.stringify(handicap_indices) : null;

        const result = await runQuery(
            'INSERT INTO tournaments (name, date, course_name, par_values, handicap_indices, course_rating, slope, game_scoring) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
            [name, date, course_name, parJson, handicapJson, course_rating || 72.0, slope || 113, game_scoring || 'Individual']
        );

        const tournament = await getQuery('SELECT * FROM tournaments WHERE id = ?', [result.id]);
        if (tournament.par_values) {
            tournament.par_values = JSON.parse(tournament.par_values);
        }
        if (tournament.handicap_indices) {
            tournament.handicap_indices = JSON.parse(tournament.handicap_indices);
        }
        res.status(201).json(tournament);
    } catch (error) {
        console.error('Error creating tournament:', error);
        res.status(500).json({ error: 'Failed to create tournament' });
    }
});

// Get a specific tournament
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const tournament = await getQuery('SELECT * FROM tournaments WHERE id = ?', [id]);

        if (!tournament) {
            return res.status(404).json({ error: 'Tournament not found' });
        }

        if (tournament.par_values) {
            tournament.par_values = JSON.parse(tournament.par_values);
        }
        if (tournament.handicap_indices) {
            tournament.handicap_indices = JSON.parse(tournament.handicap_indices);
        }

        res.json(tournament);
    } catch (error) {
        console.error('Error fetching tournament:', error);
        res.status(500).json({ error: 'Failed to fetch tournament' });
    }
});

// Get all tournaments
router.get('/', async (req, res) => {
    try {
        const tournaments = await allQuery('SELECT * FROM tournaments ORDER BY date DESC');
        tournaments.forEach(tournament => {
            if (tournament.par_values) {
                tournament.par_values = JSON.parse(tournament.par_values);
            }
            if (tournament.handicap_indices) {
                tournament.handicap_indices = JSON.parse(tournament.handicap_indices);
            }
        });
        res.json(tournaments);
    } catch (error) {
        console.error('Error fetching tournaments:', error);
        res.status(500).json({ error: 'Failed to fetch tournaments' });
    }
});

// Update a tournament
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { date, course_name, par_values, handicap_indices, course_rating, slope, game_scoring } = req.body;

        const tournament = await getQuery('SELECT * FROM tournaments WHERE id = ?', [id]);
        if (!tournament) {
            return res.status(404).json({ error: 'Tournament not found' });
        }

        const parJson = par_values ? JSON.stringify(par_values) : tournament.par_values;
        const handicapJson = handicap_indices ? JSON.stringify(handicap_indices) : tournament.handicap_indices;

        // Use date as the name if date is updated
        const name = date || tournament.date;

        await runQuery(
            'UPDATE tournaments SET name = ?, date = ?, course_name = ?, par_values = ?, handicap_indices = ?, course_rating = ?, slope = ?, game_scoring = ? WHERE id = ?',
            [
                name,
                date || tournament.date,
                course_name !== undefined ? course_name : tournament.course_name,
                parJson,
                handicapJson,
                course_rating !== undefined ? course_rating : tournament.course_rating,
                slope !== undefined ? slope : tournament.slope,
                game_scoring !== undefined ? game_scoring : tournament.game_scoring,
                id
            ]
        );

        const updatedTournament = await getQuery('SELECT * FROM tournaments WHERE id = ?', [id]);
        if (updatedTournament.par_values) {
            updatedTournament.par_values = JSON.parse(updatedTournament.par_values);
        }
        if (updatedTournament.handicap_indices) {
            updatedTournament.handicap_indices = JSON.parse(updatedTournament.handicap_indices);
        }

        res.json(updatedTournament);
    } catch (error) {
        console.error('Error updating tournament:', error);
        res.status(500).json({ error: 'Failed to update tournament' });
    }
});

// Delete a tournament
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;

        // Check if tournament exists
        const tournament = await getQuery('SELECT * FROM tournaments WHERE id = ?', [id]);
        if (!tournament) {
            return res.status(404).json({ error: 'Tournament not found' });
        }

        // Delete related data first (cascade delete)
        // Delete scores
        await runQuery('DELETE FROM scores WHERE tournament_id = ?', [id]);

        // Delete players from groups in this tournament
        await runQuery(`
            DELETE FROM players WHERE group_id IN (
                SELECT id FROM groups WHERE tournament_id = ?
            )
        `, [id]);

        // Delete groups
        await runQuery('DELETE FROM groups WHERE tournament_id = ?', [id]);

        // Finally delete the tournament
        await runQuery('DELETE FROM tournaments WHERE id = ?', [id]);

        res.json({ message: 'Tournament deleted successfully' });
    } catch (error) {
        console.error('Error deleting tournament:', error);
        res.status(500).json({ error: 'Failed to delete tournament' });
    }
});

module.exports = router;
