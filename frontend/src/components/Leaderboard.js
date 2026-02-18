import React, { useState, useEffect } from 'react';
import { getLeaderboard, getTournament } from '../services/api';
import socketService from '../services/socket';
import './Leaderboard.css';

const Leaderboard = ({ tournament, onBack }) => {
    const [leaderboard, setLeaderboard] = useState([]);
    const [tournamentData, setTournamentData] = useState(tournament);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isConnected, setIsConnected] = useState(false);

    useEffect(() => {
        loadLeaderboard();
        loadTournamentData();

        // Connect to socket and join tournament room
        const socket = socketService.connect();
        setIsConnected(socketService.isConnected());
        socketService.joinTournament(tournament.id);

        // Listen for score updates
        const handleScoreUpdate = () => {
            console.log('Score updated, refreshing leaderboard...');
            loadLeaderboard();
        };

        socketService.onScoreUpdate(handleScoreUpdate);

        // Cleanup on unmount
        return () => {
            socketService.offScoreUpdate(handleScoreUpdate);
            socketService.leaveTournament(tournament.id);
        };
    }, [tournament.id]);

    const loadTournamentData = async () => {
        try {
            const data = await getTournament(tournament.id);
            setTournamentData(data);
        } catch (err) {
            console.error('Error loading tournament data:', err);
        }
    };

    const loadLeaderboard = async () => {
        try {
            setLoading(true);
            const data = await getLeaderboard(tournament.id);
            setLeaderboard(data);
            setError(null);
        } catch (err) {
            console.error('Error loading leaderboard:', err);
            setError('Failed to load leaderboard');
        } finally {
            setLoading(false);
        }
    };

    const getTotalPar = () => {
        if (!tournamentData?.par_values) return 72;
        return Object.values(tournamentData.par_values).reduce((sum, par) => sum + par, 0);
    };

    const formatScoreToPar = (score, holesCompleted) => {
        if (holesCompleted === 0) return { text: 'E', color: 'green' };
        const totalPar = getTotalPar();
        const parForHolesPlayed = (totalPar / 18) * holesCompleted;
        const diff = score - parForHolesPlayed;

        if (diff === 0) return { text: 'E', color: 'green' };
        if (diff > 0) return { text: `+${diff}`, color: 'black' };
        return { text: `${diff}`, color: 'red' };
    };

    const getScoreRelativeToPar = (score, holesCompleted) => {
        if (holesCompleted === 0) return 0;
        const totalPar = getTotalPar();
        const parForHolesPlayed = (totalPar / 18) * holesCompleted;
        return score - parForHolesPlayed;
    };

    const getGrossLeaderboard = () => {
        return [...leaderboard].sort((a, b) => {
            // Players with no scores go to the bottom
            if (a.holes_completed === 0 && b.holes_completed > 0) return 1;
            if (b.holes_completed === 0 && a.holes_completed > 0) return -1;

            // Calculate score relative to par for both players
            const aRelativePar = getScoreRelativeToPar(a.total_strokes, a.holes_completed);
            const bRelativePar = getScoreRelativeToPar(b.total_strokes, b.holes_completed);

            // Sort by score relative to par (lower is better)
            if (aRelativePar !== bRelativePar) {
                return aRelativePar - bRelativePar;
            }
            // If tied on score relative to par, more holes completed ranks higher
            if (a.holes_completed !== b.holes_completed) {
                return b.holes_completed - a.holes_completed;
            }
            // If still tied, alphabetical by name
            return a.player_name.localeCompare(b.player_name);
        });
    };

    const getNetLeaderboard = () => {
        return [...leaderboard].sort((a, b) => {
            // Players with no scores go to the bottom
            if (a.holes_completed === 0 && b.holes_completed > 0) return 1;
            if (b.holes_completed === 0 && a.holes_completed > 0) return -1;

            // Calculate score relative to par for both players
            const aRelativePar = getScoreRelativeToPar(a.net_score, a.holes_completed);
            const bRelativePar = getScoreRelativeToPar(b.net_score, b.holes_completed);

            // Sort by score relative to par (lower is better)
            if (aRelativePar !== bRelativePar) {
                return aRelativePar - bRelativePar;
            }
            // If tied on score relative to par, more holes completed ranks higher
            if (a.holes_completed !== b.holes_completed) {
                return b.holes_completed - a.holes_completed;
            }
            // If still tied, alphabetical by name
            return a.player_name.localeCompare(b.player_name);
        });
    };

    if (loading && leaderboard.length === 0) {
        return (
            <div className="leaderboard">
                <div className="header">
                    <button className="btn btn-back" onClick={onBack}>
                        Back
                    </button>
                    <h2>Loading...</h2>
                </div>
            </div>
        );
    }

    const grossLeaderboard = getGrossLeaderboard();
    const netLeaderboard = getNetLeaderboard();

    return (
        <div className="leaderboard">
            <div className="header">
                <button className="btn btn-back" onClick={onBack}>
                    Back
                </button>
                <div className="header-info">
                    <h2>Leaderboard</h2>
                    <p className="tournament-name">{tournament.name}</p>
                    {tournamentData?.course_name && (
                        <p className="course-name">{tournamentData.course_name} (Par {getTotalPar()})</p>
                    )}
                </div>
                <div className="connection-status">
                    <span className={`status-indicator ${isConnected ? 'connected' : 'disconnected'}`}>
                        {isConnected ? '● Live' : '○ Offline'}
                    </span>
                </div>
            </div>

            {error && <div className="error-message">{error}</div>}

            <div className="leaderboard-content">
                <div className="leaderboard-section">
                    <h3>Gross Leaderboard</h3>
                    <div className="leaderboard-table">
                        <div className="table-header">
                            <div className="rank">Pos</div>
                            <div className="player-name">Player</div>
                            <div className="score-to-par">Score</div>
                            <div className="holes">Hole</div>
                        </div>
                        {grossLeaderboard.map((player, index) => {
                            const hasScores = player.holes_completed > 0;
                            const scoreData = hasScores ? formatScoreToPar(player.total_strokes, player.holes_completed) : { text: '-', color: 'black' };
                            const currentRelativePar = getScoreRelativeToPar(player.total_strokes, player.holes_completed);
                            const previousPlayer = index > 0 ? grossLeaderboard[index - 1] : null;
                            const previousRelativePar = previousPlayer ? getScoreRelativeToPar(previousPlayer.total_strokes, previousPlayer.holes_completed) : null;
                            const showPosition = hasScores && (index === 0 || currentRelativePar !== previousRelativePar);

                            return (
                                <div key={`gross-${player.player_id}`} className="table-row">
                                    <div className="rank">{showPosition ? index + 1 : ''}</div>
                                    <div className="player-name">{player.player_name}</div>
                                    <div className="score-to-par" style={{ color: scoreData.color }}>
                                        {scoreData.text}
                                    </div>
                                    <div className="holes">{hasScores ? player.holes_completed : '-'}</div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                <div className="leaderboard-section">
                    <h3>Net Leaderboard</h3>
                    <div className="leaderboard-table">
                        <div className="table-header">
                            <div className="rank">Pos</div>
                            <div className="player-name">Player</div>
                            <div className="score-to-par">Score</div>
                            <div className="holes">Hole</div>
                        </div>
                        {netLeaderboard.map((player, index) => {
                            const hasScores = player.holes_completed > 0;
                            const scoreData = hasScores ? formatScoreToPar(player.net_score, player.holes_completed) : { text: '-', color: 'black' };
                            const currentRelativePar = getScoreRelativeToPar(player.net_score, player.holes_completed);
                            const previousPlayer = index > 0 ? netLeaderboard[index - 1] : null;
                            const previousRelativePar = previousPlayer ? getScoreRelativeToPar(previousPlayer.net_score, previousPlayer.holes_completed) : null;
                            const showPosition = hasScores && (index === 0 || currentRelativePar !== previousRelativePar);

                            return (
                                <div key={`net-${player.player_id}`} className="table-row">
                                    <div className="rank">{showPosition ? index + 1 : ''}</div>
                                    <div className="player-name">{player.player_name}</div>
                                    <div className="score-to-par" style={{ color: scoreData.color }}>
                                        {scoreData.text}
                                    </div>
                                    <div className="holes">{hasScores ? player.holes_completed : '-'}</div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Leaderboard;
