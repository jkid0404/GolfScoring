import React, { useState, useEffect } from 'react';
import { createTournament, getAllTournaments, updateTournament } from '../services/api';
import './TournamentSetup.css';

const TournamentSetup = ({ onTournamentSelected, onEditHoles, editingTournament }) => {
    const [tournaments, setTournaments] = useState([]);
    const [showCreateForm, setShowCreateForm] = useState(false);
    const [showParEditor, setShowParEditor] = useState(false);
    const [selectedTournament, setSelectedTournament] = useState(null);
    const [parValues, setParValues] = useState({});
    const [formData, setFormData] = useState({
        name: '',
        date: new Date().toISOString().split('T')[0],
        course_name: '',
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        loadTournaments();
    }, []);

    useEffect(() => {
        if (editingTournament) {
            handleEditPar(editingTournament);
        }
    }, [editingTournament]);

    const loadTournaments = async () => {
        try {
            const data = await getAllTournaments();
            setTournaments(data);
        } catch (err) {
            console.error('Error loading tournaments:', err);
            setError('Failed to load tournaments');
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
            const tournament = await createTournament(formData);
            setTournaments([tournament, ...tournaments]);
            setFormData({
                name: '',
                date: new Date().toISOString().split('T')[0],
                course_name: '',
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
        setShowParEditor(true);
    };

    const handleParChange = (hole, value) => {
        setParValues({
            ...parValues,
            [hole]: parseInt(value) || 3,
        });
    };

    const handleSavePar = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            const updatedTournament = await updateTournament(selectedTournament.id, {
                name: selectedTournament.name,
                date: selectedTournament.date,
                course_name: selectedTournament.course_name,
                par_values: parValues,
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

            {!showCreateForm && !showParEditor ? (
                <div className="tournament-list">
                    <h2>Select a Tournament</h2>
                    <div className="tournament-grid">
                        {tournaments.map((tournament) => (
                            <div
                                key={tournament.id}
                                className="tournament-card"
                                onClick={() => onTournamentSelected(tournament)}
                            >
                                <h3>{tournament.name}</h3>
                                <p className="tournament-date">
                                    {new Date(tournament.date).toLocaleDateString()}
                                </p>
                                {tournament.course_name && (
                                    <p className="tournament-course">{tournament.course_name}</p>
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
                            <label htmlFor="name">Tournament Name *</label>
                            <input
                                type="text"
                                id="name"
                                name="name"
                                value={formData.name}
                                onChange={handleInputChange}
                                required
                            />
                        </div>

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
                            <label htmlFor="course_name">Course Name</label>
                            <input
                                type="text"
                                id="course_name"
                                name="course_name"
                                value={formData.course_name}
                                onChange={handleInputChange}
                            />
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
            ) : (
                <div className="par-editor">
                    <form onSubmit={handleSavePar}>
                        <div className="tournament-info-grid">
                            <div className="form-group">
                                <label htmlFor="tournamentName">Tournament Name</label>
                                <input
                                    type="text"
                                    id="tournamentName"
                                    value={selectedTournament?.name || ''}
                                    onChange={(e) => setSelectedTournament({
                                        ...selectedTournament,
                                        name: e.target.value
                                    })}
                                />
                            </div>

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
                        </div>
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
