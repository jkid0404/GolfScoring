import React, { useState, useEffect } from 'react';
import { createTournament, getAllTournaments, updateTournament, getAllCourses, createCourse } from '../services/api';
import './TournamentSetup.css';

const TournamentSetup = ({ onTournamentSelected, onEditHoles, editingTournament }) => {
    const [tournaments, setTournaments] = useState([]);
    const [courses, setCourses] = useState([]);
    const [showCreateForm, setShowCreateForm] = useState(false);
    const [showCourseCreate, setShowCourseCreate] = useState(false);
    const [showParEditor, setShowParEditor] = useState(false);
    const [selectedTournament, setSelectedTournament] = useState(null);
    const [parValues, setParValues] = useState({});
    const [handicapIndices, setHandicapIndices] = useState({});
    const [formData, setFormData] = useState({
        date: new Date().toISOString().split('T')[0],
        course_id: '',
        course_name: '',
        game_scoring: 'Individual',
    });
    const [newCourseData, setNewCourseData] = useState({
        course_name: '',
        par_values: {},
        handicap_indices: {},
        course_rating: 72.0,
        slope: 113
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        loadTournaments();
        loadCourses();
    }, []);

    useEffect(() => {
        if (editingTournament) {
            handleEditPar(editingTournament);
        }
    }, [editingTournament]);

    const loadTournaments = async () => {
        try {
            const data = await getAllTournaments();
            // Ensure data is an array
            setTournaments(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error('Error loading tournaments:', err);
            setError('Failed to load tournaments');
            setTournaments([]); // Set to empty array on error
        }
    };

    const loadCourses = async () => {
        try {
            const data = await getAllCourses();
            // Ensure data is an array
            setCourses(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error('Error loading courses:', err);
            setCourses([]); // Set to empty array on error
        }
    };

    const handleInputChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value,
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            // Get course data if a course was selected, otherwise use defaults
            let tournamentData = { ...formData };

            // Set default par values and handicap indices
            const defaultPars = {};
            const defaultHandicaps = {};
            for (let i = 1; i <= 18; i++) {
                defaultPars[i] = 4;
                defaultHandicaps[i] = i;
            }

            if (formData.course_id) {
                const selectedCourse = courses.find(c => c.id === parseInt(formData.course_id));
                if (selectedCourse) {
                    tournamentData.par_values = selectedCourse.par_values;
                    tournamentData.handicap_indices = selectedCourse.handicap_indices;
                } else {
                    tournamentData.par_values = defaultPars;
                    tournamentData.handicap_indices = defaultHandicaps;
                }
            } else {
                // No course selected, use defaults
                tournamentData.par_values = defaultPars;
                tournamentData.handicap_indices = defaultHandicaps;
            }

            const tournament = await createTournament(tournamentData);
            setTournaments([tournament, ...tournaments]);
            setFormData({
                date: new Date().toISOString().split('T')[0],
                course_id: '',
                course_name: '',
                game_scoring: 'Individual',
            });
            setShowCreateForm(false);
            onTournamentSelected(tournament);
        } catch (err) {
            console.error('Error creating tournament:', err);
            setError('Failed to create tournament');
        } finally {
            setLoading(false);
        }
    };

    const handleEditPar = (tournament) => {
        setSelectedTournament(tournament);
        const pars = tournament.par_values || {};
        const defaultPars = {};
        for (let i = 1; i <= 18; i++) {
            defaultPars[i] = pars[i] || 4;
        }
        setParValues(defaultPars);

        const handicaps = tournament.handicap_indices || {};
        const defaultHandicaps = {};
        for (let i = 1; i <= 18; i++) {
            defaultHandicaps[i] = handicaps[i] || i;
        }
        setHandicapIndices(defaultHandicaps);

        setShowParEditor(true);
    };

    const handleParChange = (hole, value) => {
        setParValues({
            ...parValues,
            [hole]: parseInt(value) || 3,
        });
    };

    const handleHandicapChange = (hole, value) => {
        setHandicapIndices({
            ...handicapIndices,
            [hole]: parseInt(value) || 1,
        });
    };

    const handleSavePar = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            const updatedTournament = await updateTournament(selectedTournament.id, {
                date: selectedTournament.date,
                course_name: selectedTournament.course_name,
                par_values: parValues,
                handicap_indices: handicapIndices,
                course_rating: parseFloat(selectedTournament.course_rating) || 72.0,
                slope: parseInt(selectedTournament.slope) || 113,
                game_scoring: selectedTournament.game_scoring || 'Individual',
            });

            // Update tournament in list
            setTournaments(tournaments.map(t =>
                t.id === updatedTournament.id ? updatedTournament : t
            ));

            setShowParEditor(false);
            setSelectedTournament(null);

            // If we're in edit mode (called from group selection), notify parent with updated tournament
            if (editingTournament) {
                onTournamentSelected(updatedTournament);
            }
        } catch (err) {
            console.error('Error updating par values:', err);
            setError('Failed to update par values');
        } finally {
            setLoading(false);
        }
    };

    const getTotalPar = () => {
        return Object.values(parValues).reduce((sum, par) => sum + par, 0);
    };

    return (
        <div className="tournament-setup">
            {error && <div className="error-message">{error}</div>}

            {!showCreateForm && !showParEditor && !showCourseCreate ? (
                <div className="tournament-list">
                    <h2>Select a Tournament</h2>
                    <div className="tournament-grid">
                        {tournaments.map((tournament) => (
                            <div
                                key={tournament.id}
                                className="tournament-card"
                                onClick={() => onTournamentSelected(tournament)}
                            >
                                <h3>{new Date(tournament.date).toLocaleDateString()}</h3>
                                {tournament.course_name && (
                                    <p className="tournament-course">{tournament.course_name}</p>
                                )}
                                {tournament.game_scoring && (
                                    <p className="tournament-scoring">{tournament.game_scoring}</p>
                                )}
                            </div>
                        ))}
                    </div>
                    <button
                        className="btn btn-primary"
                        onClick={() => setShowCreateForm(true)}
                    >
                        Create New Tournament
                    </button>
                </div>
            ) : showCreateForm ? (
                <div className="create-tournament-form">
                    <h2>Create New Tournament</h2>
                    <form onSubmit={handleSubmit}>
                        <div className="form-group">
                            <label htmlFor="date">Date *</label>
                            <input
                                type="date"
                                id="date"
                                name="date"
                                value={formData.date}
                                onChange={handleInputChange}
                                required
                            />
                        </div>

                        <div className="form-group">
                            <label htmlFor="course_id">Course</label>
                            <select
                                id="course_id"
                                name="course_id"
                                value={formData.course_id}
                                onChange={(e) => {
                                    if (e.target.value === 'create_new') {
                                        setShowCreateForm(false);
                                        setShowCourseCreate(true);
                                    } else {
                                        handleInputChange(e);
                                        // Set course_name from selected course
                                        const selectedCourse = courses.find(c => c.id === parseInt(e.target.value));
                                        if (selectedCourse) {
                                            setFormData({
                                                ...formData,
                                                course_id: e.target.value,
                                                course_name: selectedCourse.course_name
                                            });
                                        }
                                    }
                                }}
                            >
                                <option value="">Select a course...</option>
                                {courses.map(course => (
                                    <option key={course.id} value={course.id}>
                                        {course.course_name}
                                    </option>
                                ))}
                                <option value="create_new">Create New...</option>
                            </select>
                        </div>

                        <div className="form-group">
                            <label htmlFor="game_scoring">Game Scoring *</label>
                            <select
                                id="game_scoring"
                                name="game_scoring"
                                value={formData.game_scoring}
                                onChange={handleInputChange}
                                required
                            >
                                <option value="Individual">Individual</option>
                                <option value="4 Person Best Ball">4 Person Best Ball</option>
                                <option value="2 Person Best Ball">2 Person Best Ball</option>
                                <option value="2 Person Shamble">2 Person Shamble</option>
                                <option value="2 Person Scramble">2 Person Scramble</option>
                                <option value="1,2,3">1,2,3</option>
                            </select>
                        </div>

                        <div className="form-actions">
                            <button
                                type="button"
                                className="btn btn-secondary"
                                onClick={() => setShowCreateForm(false)}
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                className="btn btn-primary"
                                disabled={loading}
                            >
                                {loading ? 'Creating...' : 'Create Tournament'}
                            </button>
                        </div>
                    </form>
                </div>
            ) : showCourseCreate ? (
                <div className="course-create-form">
                    <h2>Create New Course</h2>
                    <form onSubmit={async (e) => {
                        e.preventDefault();
                        try {
                            // Initialize default values if not set
                            const defaultPars = {};
                            const defaultHandicaps = {};
                            for (let i = 1; i <= 18; i++) {
                                defaultPars[i] = newCourseData.par_values[i] || 4;
                                defaultHandicaps[i] = newCourseData.handicap_indices[i] || i;
                            }

                            const courseData = {
                                course_name: newCourseData.course_name,
                                par_values: defaultPars,
                                handicap_indices: defaultHandicaps,
                                course_rating: parseFloat(newCourseData.course_rating) || 72.0,
                                slope: parseInt(newCourseData.slope) || 113
                            };

                            const course = await createCourse(courseData);
                            await loadCourses();

                            // Set the new course as selected in the form
                            setFormData({
                                ...formData,
                                course_id: course.id.toString(),
                                course_name: course.course_name
                            });

                            // Reset and go back to create tournament form
                            setNewCourseData({
                                course_name: '',
                                par_values: {},
                                handicap_indices: {},
                                course_rating: 72.0,
                                slope: 113
                            });
                            setShowCourseCreate(false);
                            setShowCreateForm(true);
                        } catch (err) {
                            console.error('Error creating course:', err);
                            setError('Failed to create course');
                        }
                    }}>
                        <div className="form-group">
                            <label htmlFor="newCourseName">Course Name *</label>
                            <input
                                type="text"
                                id="newCourseName"
                                value={newCourseData.course_name}
                                onChange={(e) => setNewCourseData({
                                    ...newCourseData,
                                    course_name: e.target.value
                                })}
                                required
                            />
                        </div>

                        <div className="course-info-grid">
                            <div className="form-group">
                                <label htmlFor="newCourseRating">Course Rating</label>
                                <input
                                    type="number"
                                    step="0.1"
                                    id="newCourseRating"
                                    value={newCourseData.course_rating}
                                    onChange={(e) => setNewCourseData({
                                        ...newCourseData,
                                        course_rating: e.target.value
                                    })}
                                />
                            </div>

                            <div className="form-group">
                                <label htmlFor="newSlope">Slope</label>
                                <input
                                    type="number"
                                    id="newSlope"
                                    value={newCourseData.slope}
                                    onChange={(e) => setNewCourseData({
                                        ...newCourseData,
                                        slope: e.target.value
                                    })}
                                />
                            </div>
                        </div>

                        <h3>Par Values & Handicap Indices</h3>
                        <div className="holes-grid-combined">
                            {[...Array(18)].map((_, i) => {
                                const hole = i + 1;
                                return (
                                    <div key={hole} className="hole-input-combined">
                                        <label className="hole-label">{hole}</label>
                                        <div className="input-pair">
                                            <div className="input-wrapper">
                                                <label className="input-label">Par</label>
                                                <input
                                                    type="number"
                                                    min="3"
                                                    max="6"
                                                    value={newCourseData.par_values[hole] || 4}
                                                    onChange={(e) => setNewCourseData({
                                                        ...newCourseData,
                                                        par_values: {
                                                            ...newCourseData.par_values,
                                                            [hole]: parseInt(e.target.value) || 4
                                                        }
                                                    })}
                                                />
                                            </div>
                                            <div className="input-wrapper">
                                                <label className="input-label">HCP</label>
                                                <input
                                                    type="number"
                                                    min="1"
                                                    max="18"
                                                    value={newCourseData.handicap_indices[hole] || hole}
                                                    onChange={(e) => setNewCourseData({
                                                        ...newCourseData,
                                                        handicap_indices: {
                                                            ...newCourseData.handicap_indices,
                                                            [hole]: parseInt(e.target.value) || 1
                                                        }
                                                    })}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        <div className="form-actions">
                            <button
                                type="button"
                                className="btn btn-secondary"
                                onClick={() => {
                                    setNewCourseData({
                                        course_name: '',
                                        par_values: {},
                                        handicap_indices: {},
                                        course_rating: 72.0,
                                        slope: 113
                                    });
                                    setShowCourseCreate(false);
                                    setShowCreateForm(true);
                                }}
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                className="btn btn-primary"
                                disabled={loading}
                            >
                                {loading ? 'Creating...' : 'Create Course'}
                            </button>
                        </div>
                    </form>
                </div>
            ) : (
                <div className="par-editor">
                    <form onSubmit={handleSavePar}>
                        <div className="tournament-info-grid">
                            <div className="form-group">
                                <label htmlFor="tournamentDate">Date</label>
                                <input
                                    type="date"
                                    id="tournamentDate"
                                    value={selectedTournament?.date || ''}
                                    onChange={(e) => setSelectedTournament({
                                        ...selectedTournament,
                                        date: e.target.value
                                    })}
                                />
                            </div>

                            <div className="form-group">
                                <label htmlFor="courseName">Course Name</label>
                                <input
                                    type="text"
                                    id="courseName"
                                    value={selectedTournament?.course_name || ''}
                                    onChange={(e) => setSelectedTournament({
                                        ...selectedTournament,
                                        course_name: e.target.value
                                    })}
                                />
                            </div>

                            <div className="form-group">
                                <label htmlFor="gameScoring">Game Scoring</label>
                                <select
                                    id="gameScoring"
                                    value={selectedTournament?.game_scoring || 'Individual'}
                                    onChange={(e) => setSelectedTournament({
                                        ...selectedTournament,
                                        game_scoring: e.target.value
                                    })}
                                >
                                    <option value="Individual">Individual</option>
                                    <option value="4 Person Best Ball">4 Person Best Ball</option>
                                    <option value="2 Person Best Ball">2 Person Best Ball</option>
                                    <option value="2 Person Shamble">2 Person Shamble</option>
                                    <option value="2 Person Scramble">2 Person Scramble</option>
                                    <option value="1,2,3">1,2,3</option>
                                </select>
                            </div>
                        </div>

                        <div className="course-info-grid">
                            <div className="form-group">
                                <label htmlFor="courseRating">Course Rating</label>
                                <input
                                    type="number"
                                    step="0.1"
                                    id="courseRating"
                                    value={selectedTournament?.course_rating || 72.0}
                                    onChange={(e) => setSelectedTournament({
                                        ...selectedTournament,
                                        course_rating: e.target.value
                                    })}
                                />
                            </div>

                            <div className="form-group">
                                <label htmlFor="slope">Slope</label>
                                <input
                                    type="number"
                                    id="slope"
                                    value={selectedTournament?.slope || 113}
                                    onChange={(e) => setSelectedTournament({
                                        ...selectedTournament,
                                        slope: e.target.value
                                    })}
                                />
                            </div>
                        </div>

                        <h3>Par Values</h3>
                        <div className="par-grid">
                            {[...Array(18)].map((_, index) => {
                                const hole = index + 1;
                                return (
                                    <div key={hole} className="par-input-group">
                                        <label>Hole {hole}</label>
                                        <input
                                            type="number"
                                            min="3"
                                            max="5"
                                            value={parValues[hole] || 4}
                                            onChange={(e) => handleParChange(hole, e.target.value)}
                                        />
                                    </div>
                                );
                            })}
                        </div>

                        <div className="par-total">
                            <strong>Total Par: {getTotalPar()}</strong>
                        </div>

                        <h3>Handicap Indices</h3>
                        <div className="par-grid">
                            {[...Array(18)].map((_, index) => {
                                const hole = index + 1;
                                return (
                                    <div key={hole} className="par-input-group">
                                        <label>Hole {hole}</label>
                                        <input
                                            type="number"
                                            min="1"
                                            max="18"
                                            value={handicapIndices[hole] || hole}
                                            onChange={(e) => handleHandicapChange(hole, e.target.value)}
                                        />
                                    </div>
                                );
                            })}
                        </div>

                        <div className="form-actions">
                            <button
                                type="button"
                                className="btn btn-secondary"
                                onClick={() => {
                                    setShowParEditor(false);
                                    setSelectedTournament(null);
                                    if (editingTournament) {
                                        onTournamentSelected(editingTournament);
                                    }
                                }}
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                className="btn btn-primary"
                                disabled={loading}
                            >
                                {loading ? 'Saving...' : 'Save'}
                            </button>
                        </div>
                    </form>
                </div>
            )}
        </div>
    );
};

export default TournamentSetup;
