import React, { useState, useEffect } from 'react';
import { createGroup, getGroupsByTournament, addPlayer, getPlayersByGroup, updatePlayer, deletePlayer } from '../services/api';
import './GroupSelection.css';

const GroupSelection = ({ tournament, onGroupSelected, onBack, onShowLeaderboard, onEditHoles }) => {
    const [groups, setGroups] = useState([]);
    const [showCreateGroup, setShowCreateGroup] = useState(false);
    const [showManagePlayers, setShowManagePlayers] = useState(false);
    const [selectedGroup, setSelectedGroup] = useState(null);
    const [groupPlayers, setGroupPlayers] = useState([]);
    const [groupName, setGroupName] = useState('');
    const [newPlayerForm, setNewPlayerForm] = useState({ player_name: '', handicap: '' });
    const [editingPlayerId, setEditingPlayerId] = useState(null);
    const [editForm, setEditForm] = useState({ player_name: '', handicap: '' });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        loadGroups();
    }, [tournament.id]);

    const loadGroups = async () => {
        try {
            const data = await getGroupsByTournament(tournament.id);
            setGroups(data);
        } catch (err) {
            console.error('Error loading groups:', err);
            setError('Failed to load groups');
        }
    };

    const handleCreateGroup = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            const group = await createGroup({
                tournament_id: tournament.id,
                group_name: groupName,
            });

            // Automatically add 4 default players
            for (let i = 1; i <= 4; i++) {
                await addPlayer({
                    group_id: group.id,
                    player_name: `Player ${i}`,
                    handicap: 0,
                });
            }

            setGroupName('');
            setShowCreateGroup(false);
            loadGroups();
        } catch (err) {
            console.error('Error creating group:', err);
            setError('Failed to create group');
        } finally {
            setLoading(false);
        }
    };

    const handleManagePlayers = async (group) => {
        try {
            const players = await getPlayersByGroup(group.id);
            setGroupPlayers(players);
            setSelectedGroup(group);
            setShowManagePlayers(true);
        } catch (err) {
            console.error('Error loading players:', err);
            setError('Failed to load players');
        }
    };

    const handleAddPlayer = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            await addPlayer({
                group_id: selectedGroup.id,
                player_name: newPlayerForm.player_name,
                handicap: parseInt(newPlayerForm.handicap),
            });
            setNewPlayerForm({ player_name: '', handicap: '' });

            // Reload players
            const players = await getPlayersByGroup(selectedGroup.id);
            setGroupPlayers(players);
            loadGroups();
        } catch (err) {
            console.error('Error adding player:', err);
            setError('Failed to add player');
        } finally {
            setLoading(false);
        }
    };

    const handleEditPlayer = (player) => {
        setEditingPlayerId(player.id);
        setEditForm({
            player_name: player.player_name,
            handicap: player.handicap,
        });
    };

    const handleSaveEdit = async (playerId) => {
        setLoading(true);
        setError(null);

        try {
            await updatePlayer(playerId, {
                player_name: editForm.player_name,
                handicap: parseInt(editForm.handicap),
            });

            // Reload players
            const players = await getPlayersByGroup(selectedGroup.id);
            setGroupPlayers(players);
            setEditingPlayerId(null);
            loadGroups();
        } catch (err) {
            console.error('Error updating player:', err);
            setError('Failed to update player');
        } finally {
            setLoading(false);
        }
    };

    const handleCancelEdit = () => {
        setEditingPlayerId(null);
        setEditForm({ player_name: '', handicap: '' });
    };

    const handleDeletePlayer = async (playerId) => {
        if (!window.confirm('Are you sure you want to remove this player?')) {
            return;
        }

        setLoading(true);
        setError(null);

        try {
            await deletePlayer(playerId);

            // Reload players
            const players = await getPlayersByGroup(selectedGroup.id);
            setGroupPlayers(players);
            loadGroups();
        } catch (err) {
            console.error('Error deleting player:', err);
            setError('Failed to delete player');
        } finally {
            setLoading(false);
        }
    };

    const handleSelectGroup = async (group) => {
        try {
            const players = await getPlayersByGroup(group.id);
            onGroupSelected({ ...group, players });
        } catch (err) {
            console.error('Error loading players:', err);
            setError('Failed to load players');
        }
    };

    const handleCloseManagePlayers = () => {
        setShowManagePlayers(false);
        setSelectedGroup(null);
        setGroupPlayers([]);
        setNewPlayerForm({ player_name: '', handicap: '' });
        setEditingPlayerId(null);
        setEditForm({ player_name: '', handicap: '' });
    };

    return (
        <div className="group-selection">
            <div className="header">
                <button className="btn btn-back" onClick={onBack}>
                    Back
                </button>
                <h2>{tournament.name}</h2>
                <button className="btn btn-primary" onClick={onShowLeaderboard}>
                    Leaderboard
                </button>
            </div>

            {error && <div className="error-message">{error}</div>}

            {!showCreateGroup && !showManagePlayers ? (
                <div className="group-list">
                    <h3>Select Your Group</h3>
                    <div className="group-grid">
                        {groups.map((group) => (
                            <div key={group.id} className="group-card">
                                <h4>{group.group_name}</h4>
                                <p className="player-count">
                                    {group.player_count} {group.player_count === 1 ? 'player' : 'players'}
                                </p>
                                <div className="group-actions">
                                    <button
                                        className="btn btn-primary btn-sm"
                                        onClick={() => handleSelectGroup(group)}
                                    >
                                        Enter Scores
                                    </button>
                                    <button
                                        className="btn btn-secondary btn-sm"
                                        onClick={() => handleManagePlayers(group)}
                                    >
                                        Manage Players
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                    <div className="group-actions">
                        <button
                            className="btn btn-primary"
                            onClick={() => setShowCreateGroup(true)}
                        >
                            Create New Group
                        </button>
                        <button
                            className="btn btn-secondary"
                            onClick={onEditHoles}
                        >
                            Edit Tournament
                        </button>
                    </div>
                </div>
            ) : showCreateGroup ? (
                <div className="create-form">
                    <h3>Create New Group</h3>
                    <p className="form-note">4 default players will be added automatically</p>
                    <form onSubmit={handleCreateGroup}>
                        <div className="form-group">
                            <label htmlFor="groupName">Group Name *</label>
                            <input
                                type="text"
                                id="groupName"
                                value={groupName}
                                onChange={(e) => setGroupName(e.target.value)}
                                placeholder="e.g., Morning Group 1"
                                required
                            />
                        </div>
                        <div className="form-actions">
                            <button
                                type="button"
                                className="btn btn-secondary"
                                onClick={() => setShowCreateGroup(false)}
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                className="btn btn-primary"
                                disabled={loading}
                            >
                                {loading ? 'Creating...' : 'Create Group'}
                            </button>
                        </div>
                    </form>
                </div>
            ) : (
                <div className="manage-players">
                    <h3>Manage Players - {selectedGroup?.group_name}</h3>

                    <div className="players-list">
                        {groupPlayers.map((player) => (
                            <div key={player.id} className="player-item">
                                {editingPlayerId === player.id ? (
                                    <>
                                        <div className="player-edit-form">
                                            <input
                                                type="text"
                                                value={editForm.player_name}
                                                onChange={(e) => setEditForm({ ...editForm, player_name: e.target.value })}
                                                placeholder="Player Name"
                                                className="edit-input"
                                            />
                                            <input
                                                type="number"
                                                value={editForm.handicap}
                                                onChange={(e) => setEditForm({ ...editForm, handicap: e.target.value })}
                                                placeholder="Handicap"
                                                className="edit-input"
                                            />
                                        </div>
                                        <div className="player-edit-actions">
                                            <button
                                                className="btn btn-primary btn-sm"
                                                onClick={() => handleSaveEdit(player.id)}
                                                disabled={loading}
                                            >
                                                Save
                                            </button>
                                            <button
                                                className="btn btn-secondary btn-sm"
                                                onClick={handleCancelEdit}
                                                disabled={loading}
                                            >
                                                Cancel
                                            </button>
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        <div className="player-info">
                                            <strong>{player.player_name}</strong>
                                            <span className="player-handicap">Handicap: {player.handicap}</span>
                                        </div>
                                        <div className="player-actions">
                                            <button
                                                className="btn btn-secondary btn-sm"
                                                onClick={() => handleEditPlayer(player)}
                                                disabled={loading}
                                            >
                                                Edit
                                            </button>
                                            <button
                                                className="btn btn-delete btn-sm"
                                                onClick={() => handleDeletePlayer(player.id)}
                                                disabled={loading}
                                            >
                                                Remove
                                            </button>
                                        </div>
                                    </>
                                )}
                            </div>
                        ))}
                    </div>

                    <div className="add-player-section">
                        <h4>Add New Player</h4>
                        <form onSubmit={handleAddPlayer}>
                            <div className="form-row">
                                <div className="form-group">
                                    <label htmlFor="playerName">Player Name *</label>
                                    <input
                                        type="text"
                                        id="playerName"
                                        value={newPlayerForm.player_name}
                                        onChange={(e) =>
                                            setNewPlayerForm({ ...newPlayerForm, player_name: e.target.value })
                                        }
                                        required
                                    />
                                </div>
                                <div className="form-group">
                                    <label htmlFor="handicap">Handicap *</label>
                                    <input
                                        type="number"
                                        id="handicap"
                                        value={newPlayerForm.handicap}
                                        onChange={(e) =>
                                            setNewPlayerForm({ ...newPlayerForm, handicap: e.target.value })
                                        }
                                        required
                                    />
                                </div>
                            </div>
                            <button
                                type="submit"
                                className="btn btn-primary"
                                disabled={loading}
                            >
                                {loading ? 'Adding...' : 'Add Player'}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default GroupSelection;
