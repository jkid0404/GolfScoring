import React, { useState, useEffect } from 'react';
import { submitScore, getPlayerScores } from '../services/api';
import './ScoreEntry.css';

const ScoreEntry = ({ tournament, group, onBack, onShowLeaderboard }) => {
    const [currentHole, setCurrentHole] = useState(1);
    const [holeScores, setHoleScores] = useState({});
    const [allScores, setAllScores] = useState({});
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [saveMessage, setSaveMessage] = useState('');
    const [showSummary, setShowSummary] = useState(false);

    useEffect(() => {
        loadAllScores();
    }, [group.players]);

    const loadAllScores = async () => {
        try {
            const scoresData = {};
            for (const player of group.players) {
                const playerScores = await getPlayerScores(player.id);
                const scoresMap = {};
                playerScores.forEach(score => {
                    scoresMap[score.hole_number] = score.strokes;
                });
                scoresData[player.id] = scoresMap;
            }
            setAllScores(scoresData);

            // Initialize current hole scores
            const currentHoleScores = {};
            group.players.forEach(player => {
                currentHoleScores[player.id] = scoresData[player.id]?.[currentHole] || '';
            });
            setHoleScores(currentHoleScores);
        } catch (err) {
            console.error('Error loading scores:', err);
        }
    };

    useEffect(() => {
        // Update hole scores when hole changes
        const currentHoleScores = {};
        group.players.forEach(player => {
            currentHoleScores[player.id] = allScores[player.id]?.[currentHole] || '';
        });
        setHoleScores(currentHoleScores);
    }, [currentHole, allScores, group.players]);

    const handleScoreChange = (playerId, value) => {
        setHoleScores({
            ...holeScores,
            [playerId]: value === '' ? '' : parseInt(value),
        });
    };

    const handleSaveHole = async () => {
        setLoading(true);
        setError(null);
        setSaveMessage('');

        try {
            const savePromises = [];
            for (const player of group.players) {
                const score = holeScores[player.id];
                if (score !== '' && score !== null && score !== undefined) {
                    savePromises.push(
                        submitScore({
                            player_id: player.id,
                            group_id: group.id,
                            tournament_id: tournament.id,
                            hole_number: currentHole,
                            strokes: parseInt(score),
                        })
                    );
                }
            }

            await Promise.all(savePromises);

            // Update allScores state
            const updatedScores = { ...allScores };
            group.players.forEach(player => {
                if (!updatedScores[player.id]) {
                    updatedScores[player.id] = {};
                }
                if (holeScores[player.id] !== '' && holeScores[player.id] !== null) {
                    updatedScores[player.id][currentHole] = parseInt(holeScores[player.id]);
                }
            });
            setAllScores(updatedScores);

            // Auto-advance to next hole or summary first
            if (currentHole < 18) {
                setCurrentHole(currentHole + 1);
            } else {
                setShowSummary(true);
            }

            // Show success message after advancing
            setSaveMessage(`Hole ${currentHole} saved!`);
            setTimeout(() => setSaveMessage(''), 2000);
        } catch (err) {
            console.error('Error saving scores:', err);
            setError('Failed to save scores');
        } finally {
            setLoading(false);
        }
    };

    const handleNextHole = async () => {
        await handleSaveHole();
        if (currentHole < 18) {
            setCurrentHole(currentHole + 1);
        }
    };

    const handlePreviousHole = () => {
        if (currentHole > 1) {
            setCurrentHole(currentHole - 1);
        }
    };

    const getPlayerTotal = (playerId) => {
        const scores = allScores[playerId] || {};
        return Object.values(scores).reduce((sum, score) => sum + (score || 0), 0);
    };

    const getTotalPar = () => {
        if (!tournament?.par_values) return 72;
        return Object.values(tournament.par_values).reduce((sum, par) => sum + par, 0);
    };

    const getStrokesForHole = (playerHandicap, holeHandicapIndex) => {
        if (!playerHandicap || !holeHandicapIndex) return 0;

        let strokes = 0;
        if (playerHandicap >= holeHandicapIndex) strokes++;
        if (playerHandicap >= 18 + holeHandicapIndex) strokes++;
        if (playerHandicap >= 36 + holeHandicapIndex) strokes++;

        return strokes;
    };

    const getScoreToPar = (playerId) => {
        const total = getPlayerTotal(playerId);
        const totalPar = getTotalPar();
        const diff = total - totalPar;
        if (diff === 0) return 'E';
        if (diff > 0) return `+${diff}`;
        return `${diff}`;
    };

    if (showSummary) {
        return (
            <div className="score-entry">
                <div className="header">
                    <button className="btn btn-back" onClick={onBack}>
                        Back to Groups
                    </button>
                    <div className="header-info">
                        <h2>Round Summary</h2>
                    </div>
                    <button className="btn btn-primary" onClick={onShowLeaderboard}>
                        Leaderboard
                    </button>
                </div>

                <div className="summary-table">
                    <table>
                        <thead>
                            <tr>
                                <th>Player</th>
                                {[...Array(18)].map((_, i) => (
                                    <th key={i + 1}>{i + 1}</th>
                                ))}
                                <th>Total</th>
                                <th>To Par</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr className="par-row">
                                <td className="player-name-cell">Par</td>
                                {[...Array(18)].map((_, i) => {
                                    const hole = i + 1;
                                    const par = tournament?.par_values?.[hole] || 4;
                                    return (
                                        <td key={hole} className="par-cell">
                                            {par}
                                        </td>
                                    );
                                })}
                                <td className="total-cell">{getTotalPar()}</td>
                                <td className="to-par-cell">-</td>
                            </tr>
                            {group.players.map(player => (
                                <tr key={player.id}>
                                    <td className="player-name-cell">{player.player_name}</td>
                                    {[...Array(18)].map((_, i) => {
                                        const hole = i + 1;
                                        const score = allScores[player.id]?.[hole];
                                        return (
                                            <td key={hole} className={score ? 'has-score' : 'no-score'}>
                                                {score || '-'}
                                            </td>
                                        );
                                    })}
                                    <td className="total-cell">{getPlayerTotal(player.id)}</td>
                                    <td className="to-par-cell">{getScoreToPar(player.id)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                <div className="summary-actions">
                    <button
                        className="btn btn-secondary"
                        onClick={() => {
                            setShowSummary(false);
                            setCurrentHole(1);
                        }}
                    >
                        Edit Scores
                    </button>
                    <button
                        className="btn btn-primary"
                        onClick={onShowLeaderboard}
                    >
                        View Leaderboard
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="score-entry">
            <div className="header">
                <button className="btn btn-back" onClick={onBack}>
                    Back
                </button>
                <button className="btn btn-primary" onClick={onShowLeaderboard}>
                    Leaderboard
                </button>
            </div>

            {error && <div className="error-message">{error}</div>}
            {saveMessage && <div className="success-message">{saveMessage}</div>}

            <div className="hole-navigation">
                <button
                    className="btn btn-nav"
                    onClick={handlePreviousHole}
                    disabled={currentHole === 1}
                >
                    ← Previous
                </button>

                <div className="hole-info">
                    <h2>Hole {currentHole}</h2>
                    {tournament?.handicap_indices && (
                        <p className="hole-handicap">HCP: {tournament.handicap_indices[currentHole]}</p>
                    )}
                </div>

                <button
                    className="btn btn-nav"
                    onClick={handleNextHole}
                    disabled={currentHole === 18 && loading}
                >
                    {currentHole === 18 ? 'Save' : 'Next →'}
                </button>
            </div>

            <div className="hole-selector">
                {[...Array(18)].map((_, index) => {
                    const hole = index + 1;
                    const isComplete = group.players.every(
                        player => allScores[player.id]?.[hole]
                    );
                    return (
                        <button
                            key={hole}
                            className={`hole-btn ${hole === currentHole ? 'active' : ''} ${isComplete ? 'complete' : ''}`}
                            onClick={() => setCurrentHole(hole)}
                        >
                            {hole}
                        </button>
                    );
                })}
            </div>

            <div className="players-scoring">
                {group.players.map((player) => {
                    const holeHandicapIndex = tournament?.handicap_indices?.[currentHole];
                    const strokes = getStrokesForHole(player.handicap, holeHandicapIndex);

                    return (
                        <div key={player.id} className="player-score-card">
                            <div className="player-name-section">
                                <h3>{player.player_name}</h3>
                                {strokes > 0 && (
                                    <div className="stroke-dots">
                                        {[...Array(strokes)].map((_, i) => (
                                            <span key={i} className="dot">•</span>
                                        ))}
                                    </div>
                                )}
                            </div>
                            <input
                                type="number"
                                min="1"
                                max="15"
                                value={holeScores[player.id] || ''}
                                onChange={(e) => handleScoreChange(player.id, e.target.value)}
                                className="score-input"
                                placeholder="-"
                            />
                        </div>
                    );
                })}
            </div>

            <div className="action-buttons">
                <button
                    className="btn btn-secondary btn-lg"
                    onClick={handleSaveHole}
                    disabled={loading}
                >
                    {loading ? 'Saving...' : 'Save'}
                </button>
            </div>
        </div>
    );
};

export default ScoreEntry;
