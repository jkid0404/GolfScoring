const express = require('express');
const router = express.Router();
const { runQuery, getQuery, allQuery } = require('../config/database');

// Create a new tournament
router.post('/', async (req, res) => {
    try {
        const { name, date, course_name, par_values } = req.body;

        if (!name || !date) {
            return res.status(400).json({ error: 'Name and date are required' });
        }

        const parJson = par_values ? JSON.stringify(par_values) : null;

        const result = await runQuery(
            'INSERT INTO tournaments (name, date, course_name, par_values) VALUES (?, ?, ?, ?)',
            [name, date, course_name, parJson]
        );

        const tournament = await getQuery('SELECT * FROM tournaments WHERE id = ?', [result.id]);
        if (tournament.par_values) {
            tournament.par_values = JSON.parse(tournament.par_values);
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
        const { name, date, course_name, par_values } = req.body;

        const tournament = await getQuery('SELECT * FROM tournaments WHERE id = ?', [id]);
        if (!tournament) {
            return res.status(404).json({ error: 'Tournament not found' });
        }

        const parJson = par_values ? JSON.stringify(par_values) : tournament.par_values;

        await runQuery(
            'UPDATE tournaments SET name = ?, date = ?, course_name = ?, par_values = ? WHERE id = ?',
            [
                name || tournament.name,
                date || tournament.date,
                course_name !== undefined ? course_name : tournament.course_name,
                parJson,
                id
            ]
        );

        const updatedTournament = await getQuery('SELECT * FROM tournaments WHERE id = ?', [id]);
        if (updatedTournament.par_values) {
            updatedTournament.par_values = JSON.parse(updatedTournament.par_values);
        }

        res.json(updatedTournament);
    } catch (error) {
        console.error('Error updating tournament:', error);
        res.status(500).json({ error: 'Failed to update tournament' });
    }
});

module.exports = router;
