import React, { useState, useEffect } from 'react';
import { getLeaderboard, getTournament } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import socketService from '../services/socket';
import './Leaderboard.css';

const Leaderboard = ({ tournament, onBack }) => {
    const { logout, userType } = useAuth();
    const [leaderboard, setLeaderboard] = useState([]);
    const [skinsDetails, setSkinsDetails] = useState([]);
    const [isBestBall, setIsBestBall] = useState(false);
    const [tournamentData, setTournamentData] = useState(tournament);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [showGross, setShowGross] = useState(true);
    const [showNet, setShowNet] = useState(true);
    const [showSkins, setShowSkins] = useState(true);

    useEffect(() => {
        loadLeaderboard();
        loadTournamentData();

        // Connect to socket and join tournament room
        socketService.connect();
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
        // eslint-disable-next-line react-hooks/exhaustive-deps
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

            // Handle new response format with players and skinsDetails
            if (data.players && data.skinsDetails !== undefined) {
                setLeaderboard(data.players);
                setSkinsDetails(data.skinsDetails);
                setIsBestBall(data.isBestBall || false);
            } else {
                // Fallback for old format
                setLeaderboard(data);
                setSkinsDetails([]);
                setIsBestBall(false);
            }

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

    const formatScoreToPar = (score, holesCompleted, effectivePar) => {
        if (holesCompleted === 0) return { text: 'E', color: 'green' };

        let parForHolesPlayed;
        if (effectivePar !== undefined) {
            // Use effective par for 1,2,3 format
            parForHolesPlayed = effectivePar;
        } else {
            // Calculate par normally for other formats
            const totalPar = getTotalPar();
            parForHolesPlayed = (totalPar / 18) * holesCompleted;
        }

        const diff = score - parForHolesPlayed;

        if (diff === 0) return { text: 'E', color: 'green' };
        if (diff > 0) return { text: `+${diff}`, color: 'black' };
        return { text: `${diff}`, color: 'red' };
    };

    const getScoreRelativeToPar = (score, holesCompleted, effectivePar) => {
        if (holesCompleted === 0) return 0;

        let parForHolesPlayed;
        if (effectivePar !== undefined) {
            // Use effective par for 1,2,3 format
            parForHolesPlayed = effectivePar;
        } else {
            // Calculate par normally for other formats
            const totalPar = getTotalPar();
            parForHolesPlayed = (totalPar / 18) * holesCompleted;
        }

        return score - parForHolesPlayed;
    };

    const getGrossLeaderboard = () => {
        return [...leaderboard].sort((a, b) => {
            // Players with no scores go to the bottom
            if (a.holes_completed === 0 && b.holes_completed > 0) return 1;
            if (b.holes_completed === 0 && a.holes_completed > 0) return -1;

            // Calculate score relative to par for both players
            const aRelativePar = getScoreRelativeToPar(a.total_strokes, a.holes_completed, a.effective_par);
            const bRelativePar = getScoreRelativeToPar(b.total_strokes, b.holes_completed, b.effective_par);

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
            const aRelativePar = getScoreRelativeToPar(a.net_score, a.holes_completed, a.effective_par);
            const bRelativePar = getScoreRelativeToPar(b.net_score, b.holes_completed, b.effective_par);

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

    const formatSkinsHole = (holeData) => {
        if (!holeData) return '-';

        if (holeData.status === 'unplayed') {
            return '-';
        }

        if (holeData.status === 'won') {
            return `${holeData.winner} - ${holeData.scoreName}`;
        }

        if (holeData.status === 'tied') {
            return `${holeData.scoreName} (${holeData.tiedCount} tied)`;
        }

        return '-';
    };

    if (loading && leaderboard.length === 0) {
        return (
            <div className="leaderboard">
                <div className="header">
                    {userType !== 'tournament' && onBack && (
                        <button className="btn btn-back" onClick={onBack}>
                            Back
                        </button>
                    )}
                    {(userType === 'tournament' || !onBack) && (
                        <button className="btn btn-back" onClick={logout}>
                            Logout
                        </button>
                    )}
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
                {userType !== 'tournament' && onBack && (
                    <button className="btn btn-back" onClick={onBack}>
                        Back
                    </button>
                )}
                {(userType === 'tournament' || !onBack) && (
                    <button className="btn btn-back" onClick={logout}>
                        Logout
                    </button>
                )}
                <div className="header-info">
                    <h2>Leaderboard</h2>
                    <p className="tournament-name">{tournament.name}</p>
                    {tournamentData?.course_name && (
                        <p className="course-name">{tournamentData.course_name}</p>
                    )}
                </div>
            </div>

            {error && <div className="error-message">{error}</div>}

            <div className="leaderboard-content-three">
                <div className="leaderboard-section">
                    <h3 onClick={() => setShowGross(!showGross)} className="collapsible-header">
                        <span>{showGross ? '▼' : '▶'}</span> Gross Leaderboard
                    </h3>
                    {showGross && (
                        <div className="leaderboard-table">
                        <div className="table-header">
                            <div className="rank">Pos</div>
                            <div className="player-name">Player</div>
                            <div className="score-to-par">Score</div>
                            <div className="holes">Hole</div>
                        </div>
                        {grossLeaderboard.map((player, index) => {
                            const hasScores = player.holes_completed > 0;
                            const scoreData = hasScores ? formatScoreToPar(player.total_strokes, player.holes_completed, player.effective_par) : { text: '-', color: 'black' };
                            const currentRelativePar = getScoreRelativeToPar(player.total_strokes, player.holes_completed, player.effective_par);
                            const previousPlayer = index > 0 ? grossLeaderboard[index - 1] : null;
                            const previousRelativePar = previousPlayer ? getScoreRelativeToPar(previousPlayer.total_strokes, previousPlayer.holes_completed, previousPlayer.effective_par) : null;
                            const showPosition = hasScores && (index === 0 || currentRelativePar !== previousRelativePar);

                            const displayName = isBestBall ? `${player.group_name} (${player.player_names})` : player.player_name;
                            const key = isBestBall ? `gross-${player.group_id}` : `gross-${player.player_id}`;

                            return (
                                <div key={key} className="table-row">
                                    <div className="rank">{showPosition ? index + 1 : ''}</div>
                                    <div className="player-name">{displayName}</div>
                                    <div className="score-to-par" style={{ color: scoreData.color }}>
                                        {scoreData.text}
                                    </div>
                                    <div className="holes">{hasScores ? player.holes_completed : '-'}</div>
                                </div>
                            );
                        })}
                        </div>
                    )}
                </div>

                <div className="leaderboard-section">
                    <h3 onClick={() => setShowNet(!showNet)} className="collapsible-header">
                        <span>{showNet ? '▼' : '▶'}</span> Net Leaderboard
                    </h3>
                    {showNet && (
                        <div className="leaderboard-table">
                        <div className="table-header">
                            <div className="rank">Pos</div>
                            <div className="player-name">Player</div>
                            <div className="score-to-par">Score</div>
                            <div className="holes">Hole</div>
                        </div>
                        {netLeaderboard.map((player, index) => {
                            const hasScores = player.holes_completed > 0;
                            const scoreData = hasScores ? formatScoreToPar(player.net_score, player.holes_completed, player.effective_par) : { text: '-', color: 'black' };
                            const currentRelativePar = getScoreRelativeToPar(player.net_score, player.holes_completed, player.effective_par);
                            const previousPlayer = index > 0 ? netLeaderboard[index - 1] : null;
                            const previousRelativePar = previousPlayer ? getScoreRelativeToPar(previousPlayer.net_score, previousPlayer.holes_completed, previousPlayer.effective_par) : null;
                            const showPosition = hasScores && (index === 0 || currentRelativePar !== previousRelativePar);

                            const displayName = isBestBall ? `${player.group_name} (${player.player_names})` : player.player_name;
                            const key = isBestBall ? `net-${player.group_id}` : `net-${player.player_id}`;

                            return (
                                <div key={key} className="table-row">
                                    <div className="rank">{showPosition ? index + 1 : ''}</div>
                                    <div className="player-name">{displayName}</div>
                                    <div className="score-to-par" style={{ color: scoreData.color }}>
                                        {scoreData.text}
                                    </div>
                                    <div className="holes">{hasScores ? player.holes_completed : '-'}</div>
                                </div>
                            );
                        })}
                        </div>
                    )}
                </div>

                <div className="leaderboard-section skins-section">
                    <h3 onClick={() => setShowSkins(!showSkins)} className="collapsible-header">
                        <span>{showSkins ? '▼' : '▶'}</span> Skins
                    </h3>
                    {showSkins && (
                        <div className="skins-table">
                        <div className="skins-header">
                            <div className="skins-hole">Hole</div>
                            <div className="skins-result">Result</div>
                        </div>
                        {skinsDetails.map((holeData) => (
                            <div key={`skin-hole-${holeData.hole}`} className="skins-row">
                                <div className="skins-hole">{holeData.hole}</div>
                                <div className="skins-result">{formatSkinsHole(holeData)}</div>
                            </div>
                        ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Leaderboard;
