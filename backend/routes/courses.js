const express = require('express');
const router = express.Router();
const { runQuery, getQuery, allQuery } = require('../config/databaseAdapter');

// Helper function to safely parse JSON
const safeJsonParse = (value, fieldName, defaultValue = {}) => {
    if (!value) return defaultValue;
    if (typeof value === 'object') return value; // Already parsed

    try {
        // Clean control characters before parsing
        const cleaned = value.replace(/[\u0000-\u001F\u007F-\u009F]/g, '');
        return JSON.parse(cleaned);
    } catch (error) {
        console.error(`Error parsing ${fieldName}:`, error.message);
        console.error(`Raw value (first 200 chars):`, value.substring(0, 200));
        return defaultValue;
    }
};

// Get all courses
router.get('/', async (req, res) => {
    try {
        const courses = await allQuery('SELECT * FROM courses ORDER BY course_name');

        // Parse JSON fields for each course
        courses.forEach(course => {
            course.par_values = safeJsonParse(course.par_values, 'par_values', {});
            course.handicap_indices = safeJsonParse(course.handicap_indices, 'handicap_indices', {});
        });

        res.json(courses);
    } catch (error) {
        console.error('Error fetching courses:', error);
        res.status(500).json({ error: 'Failed to fetch courses' });
    }
});

// Get a single course by ID
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const course = await getQuery('SELECT * FROM courses WHERE id = ?', [id]);

        if (!course) {
            return res.status(404).json({ error: 'Course not found' });
        }

        // Parse JSON fields
        course.par_values = safeJsonParse(course.par_values, 'par_values', {});
        course.handicap_indices = safeJsonParse(course.handicap_indices, 'handicap_indices', {});

        res.json(course);
    } catch (error) {
        console.error('Error fetching course:', error);
        res.status(500).json({ error: 'Failed to fetch course' });
    }
});

// Create a new course
router.post('/', async (req, res) => {
    try {
        const { course_name, par_values, handicap_indices, course_rating, slope } = req.body;

        if (!course_name) {
            return res.status(400).json({ error: 'Course name is required' });
        }

        // Check if course already exists
        const existing = await getQuery('SELECT id FROM courses WHERE course_name = ?', [course_name]);
        if (existing) {
            return res.status(400).json({ error: 'A course with this name already exists' });
        }

        const result = await runQuery(
            'INSERT INTO courses (course_name, par_values, handicap_indices, course_rating, slope) VALUES (?, ?, ?, ?, ?)',
            [
                course_name,
                JSON.stringify(par_values || {}),
                JSON.stringify(handicap_indices || {}),
                course_rating || 72.0,
                slope || 113
            ]
        );

        const newCourse = await getQuery('SELECT * FROM courses WHERE id = ?', [result.id]);
        newCourse.par_values = safeJsonParse(newCourse.par_values, 'par_values', {});
        newCourse.handicap_indices = safeJsonParse(newCourse.handicap_indices, 'handicap_indices', {});

        res.status(201).json(newCourse);
    } catch (error) {
        console.error('Error creating course:', error);
        res.status(500).json({ error: 'Failed to create course' });
    }
});

// Update a course
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { course_name, par_values, handicap_indices, course_rating, slope } = req.body;

        await runQuery(
            'UPDATE courses SET course_name = ?, par_values = ?, handicap_indices = ?, course_rating = ?, slope = ? WHERE id = ?',
            [
                course_name,
                JSON.stringify(par_values),
                JSON.stringify(handicap_indices),
                course_rating,
                slope,
                id
            ]
        );

        const updatedCourse = await getQuery('SELECT * FROM courses WHERE id = ?', [id]);
        updatedCourse.par_values = safeJsonParse(updatedCourse.par_values, 'par_values', {});
        updatedCourse.handicap_indices = safeJsonParse(updatedCourse.handicap_indices, 'handicap_indices', {});

        res.json(updatedCourse);
    } catch (error) {
        console.error('Error updating course:', error);
        res.status(500).json({ error: 'Failed to update course' });
    }
});

// Delete a course
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        await runQuery('DELETE FROM courses WHERE id = ?', [id]);
        res.json({ message: 'Course deleted successfully' });
    } catch (error) {
        console.error('Error deleting course:', error);
        res.status(500).json({ error: 'Failed to delete course' });
    }
});

module.exports = router;
