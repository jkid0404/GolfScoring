import React, { useState, useEffect } from 'react';
import { createGroup, getGroupsByTournament, addPlayer, getPlayersByGroup, updatePlayer, deletePlayer, deleteTournament, getAllMasterPlayers, createMasterPlayer, deleteGroup, updateGroup } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import './GroupSelection.css';

const GroupSelection = ({ tournament, onGroupSelected, onBack, onShowLeaderboard, onEditHoles, userType }) => {
    const { logout } = useAuth();
    const [groups, setGroups] = useState([]);
    const [showCreateGroup, setShowCreateGroup] = useState(false);
    const [showManagePlayers, setShowManagePlayers] = useState(false);
    const [selectedGroup, setSelectedGroup] = useState(null);
    const [groupPlayers, setGroupPlayers] = useState([]);
    const [showAddPlayerToGroup, setShowAddPlayerToGroup] = useState(false);
    const [selectedPlayerToAdd, setSelectedPlayerToAdd] = useState('');
    const [editingStartingHole, setEditingStartingHole] = useState(false);
    const [newStartingHole, setNewStartingHole] = useState(1);
    const [setNewPlayerForm] = useState({ player_name: '', handicap: '' });
    const [editingPlayerId, setEditingPlayerId] = useState(null);
    const [editForm, setEditForm] = useState({ player_name: '', handicap: '' });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    // Master players and player selection for group creation
    const [masterPlayers, setMasterPlayers] = useState([]);
    const [selectedPlayers, setSelectedPlayers] = useState(['']); // Start with 1 player slot
    const [startingHole, setStartingHole] = useState(1);
    const [showAddNewPlayer, setShowAddNewPlayer] = useState(false);
    const [newMasterPlayerForm, setNewMasterPlayerForm] = useState({ player_name: '', ghin: '', handicap: '' });

    useEffect(() => {
        loadGroups();
        loadMasterPlayers();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [tournament.id]);

    const loadGroups = async () => {
        try {
            const data = await getGroupsByTournament(tournament.id);

            // Load players for each group
            const groupsWithPlayers = await Promise.all(
                data.map(async (group) => {
                    try {
                        const players = await getPlayersByGroup(group.id);
                        return { ...group, players };
                    } catch (err) {
                        console.error(`Error loading players for group ${group.id}:`, err);
                        return { ...group, players: [] };
                    }
                })
            );

            setGroups(groupsWithPlayers);
        } catch (err) {
            console.error('Error loading groups:', err);
            setError('Failed to load groups');
        }
    };

    const loadMasterPlayers = async () => {
        try {
            const data = await getAllMasterPlayers();
            setMasterPlayers(data);
        } catch (err) {
            console.error('Error loading master players:', err);
            // Don't set error state - just log it and continue with empty list
            setMasterPlayers([]);
        }
    };

    const handlePlayerSelection = (index, value) => {
        if (value === 'add_new') {
            setShowAddNewPlayer(true);
        } else {
            const newSelection = [...selectedPlayers];
            newSelection[index] = value;
            setSelectedPlayers(newSelection);
        }
    };

    const handleAddPlayerSlot = () => {
        if (selectedPlayers.length < 4) {
            setSelectedPlayers([...selectedPlayers, '']);
        }
    };

    const handleRemovePlayerSlot = (index) => {
        if (selectedPlayers.length > 1) {
            const newSelection = selectedPlayers.filter((_, i) => i !== index);
            setSelectedPlayers(newSelection);
        }
    };

    const handleAddNewMasterPlayer = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            await createMasterPlayer({
                player_name: newMasterPlayerForm.player_name,
                ghin: newMasterPlayerForm.ghin,
                handicap: parseInt(newMasterPlayerForm.handicap) || 0,
            });

            // Reload master players
            await loadMasterPlayers();

            // Reset form and hide dialog
            setNewMasterPlayerForm({ player_name: '', ghin: '', handicap: '' });
            setShowAddNewPlayer(false);
        } catch (err) {
            console.error('Error creating master player:', err);
            setError('Failed to create master player');
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteTournament = async () => {
        if (window.confirm(`Are you sure you want to delete the tournament from ${new Date(tournament.date).toLocaleDateString()}? This will delete all groups, players, and scores associated with this tournament.`)) {
            try {
                await deleteTournament(tournament.id);
                // Navigate back to tournament selection
                onBack();
            } catch (err) {
                console.error('Error deleting tournament:', err);
                setError('Failed to delete tournament');
            }
        }
    };

    const handleCreateGroup = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            // Use a placeholder name - the code will be the primary identifier
            const group = await createGroup({
                tournament_id: tournament.id,
                group_name: `Group_${Date.now()}`,
                starting_hole: startingHole,
            });

            // Add selected players to the group
            for (let i = 0; i < selectedPlayers.length; i++) {
                const masterPlayerId = selectedPlayers[i];
                if (masterPlayerId) {
                    // Find the master player
                    const masterPlayer = masterPlayers.find(p => p.id === parseInt(masterPlayerId));
                    if (masterPlayer) {
                        await addPlayer({
                            group_id: group.id,
                            player_name: masterPlayer.player_name,
                            handicap: masterPlayer.handicap || 0,
                        });
                    }
                }
            }

            setSelectedPlayers(['']);
            setStartingHole(1);
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
            setNewStartingHole(group.starting_hole || 1);
            setShowManagePlayers(true);
        } catch (err) {
            console.error('Error loading players:', err);
            setError('Failed to load players');
        }
    };

    const handleUpdateStartingHole = async () => {
        setLoading(true);
        setError(null);

        try {
            await updateGroup(selectedGroup.id, {
                starting_hole: newStartingHole,
            });

            // Update the selected group and reload groups
            setSelectedGroup({ ...selectedGroup, starting_hole: newStartingHole });
            setEditingStartingHole(false);
            loadGroups();
        } catch (err) {
            console.error('Error updating starting hole:', err);
            setError('Failed to update starting hole');
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

    const handleDeleteGroup = async () => {
        if (!window.confirm(`Are you sure you want to delete ${selectedGroup?.group_name}? This will delete all players and scores associated with this group.`)) {
            return;
        }

        setLoading(true);
        setError(null);

        try {
            await deleteGroup(selectedGroup.id);

            // Close manage players view and reload groups
            setShowManagePlayers(false);
            setSelectedGroup(null);
            setGroupPlayers([]);
            loadGroups();
        } catch (err) {
            console.error('Error deleting group:', err);
            setError('Failed to delete group');
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

    const handleAddPlayerToGroup = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            const masterPlayer = masterPlayers.find(p => p.id === parseInt(selectedPlayerToAdd));
            if (masterPlayer) {
                await addPlayer({
                    group_id: selectedGroup.id,
                    player_name: masterPlayer.player_name,
                    handicap: masterPlayer.handicap || 0,
                });

                // Reload players
                const players = await getPlayersByGroup(selectedGroup.id);
                setGroupPlayers(players);
                setSelectedPlayerToAdd('');
                setShowAddPlayerToGroup(false);
                loadGroups();
            }
        } catch (err) {
            console.error('Error adding player:', err);
            setError('Failed to add player');
        } finally {
            setLoading(false);
        }
    };

    const handleCloseManagePlayers = () => {
        setShowManagePlayers(false);
        setSelectedGroup(null);
        setGroupPlayers([]);
        setNewPlayerForm({ player_name: '', handicap: '' });
        setEditingPlayerId(null);
        setEditForm({ player_name: '', handicap: '' });
        setShowAddPlayerToGroup(false);
        setSelectedPlayerToAdd('');
        setEditingStartingHole(false);
        setNewStartingHole(1);
    };

    return (
        <div className="group-selection">
            <div className="header">
                <button className="btn btn-back" onClick={onBack}>
                    Back
                </button>
                <h2>{new Date(tournament.date).toLocaleDateString()}</h2>
                <div style={{ display: 'flex', gap: '10px' }}>
                    <button className="btn btn-primary" onClick={onShowLeaderboard}>
                        Leaderboard
                    </button>
                    <button className="btn btn-secondary" onClick={logout}>
                        Logout
                    </button>
                </div>
            </div>

            {error && <div className="error-message">{error}</div>}

            {!showCreateGroup && !showManagePlayers ? (
                <div className="group-list">
                    <h3>Select Your Group</h3>
                    <div className="group-grid">
                        {groups.map((group) => (
                            <div key={group.id} className="group-card" style={{ display: 'flex', flexDirection: 'column' }}>
                                <div style={{ flex: 1 }}>
                                    {group.code && (
                                        <div
                                            style={{
                                                marginBottom: '10px',
                                                padding: '12px',
                                                backgroundColor: '#f0f0f0',
                                                borderRadius: '4px',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'space-between',
                                                gap: '8px'
                                            }}
                                        >
                                            <span style={{ fontSize: '20px', fontWeight: '700', letterSpacing: '2px' }}>
                                                {group.code}
                                            </span>
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    navigator.clipboard.writeText(group.code);
                                                }}
                                                style={{
                                                    padding: '6px 12px',
                                                    fontSize: '12px',
                                                    backgroundColor: '#007bff',
                                                    color: 'white',
                                                    border: 'none',
                                                    borderRadius: '4px',
                                                    cursor: 'pointer'
                                                }}
                                            >
                                                Copy
                                            </button>
                                        </div>
                                    )}
                                    {group.players && group.players.length > 0 ? (
                                        <div style={{ marginBottom: '10px' }}>
                                            {group.players.map((player, index) => (
                                                <div
                                                    key={player.id}
                                                    style={{
                                                        padding: '6px 0',
                                                        borderBottom: index < group.players.length - 1 ? '1px solid #eee' : 'none',
                                                        fontSize: '14px'
                                                    }}
                                                >
                                                    {player.player_name} <span style={{ color: '#666', fontSize: '12px' }}>(HCP: {player.handicap})</span>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <p className="player-count" style={{ marginBottom: '10px', color: '#999' }}>
                                            No players added
                                        </p>
                                    )}
                                </div>
                                <div className="group-actions">
                                    {userType === 'admin' && (
                                        <button
                                            className="btn btn-primary btn-sm"
                                            onClick={() => handleSelectGroup(group)}
                                        >
                                            Enter Scores
                                        </button>
                                    )}
                                    <button
                                        className="btn btn-secondary btn-sm"
                                        onClick={() => handleManagePlayers(group)}
                                    >
                                        Manage Group
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
                        {userType === 'admin' && (
                            <button
                                className="btn btn-delete"
                                onClick={handleDeleteTournament}
                            >
                                Delete Tournament
                            </button>
                        )}
                    </div>
                </div>
            ) : showCreateGroup ? (
                <div className="create-form">
                    <h3>Create New Group</h3>

                    {showAddNewPlayer ? (
                        <div>
                            <h4>Add New Player</h4>
                            <form onSubmit={handleAddNewMasterPlayer}>
                                <div className="form-group">
                                    <label htmlFor="newPlayerName">Player Name *</label>
                                    <input
                                        type="text"
                                        id="newPlayerName"
                                        value={newMasterPlayerForm.player_name}
                                        onChange={(e) => setNewMasterPlayerForm({ ...newMasterPlayerForm, player_name: e.target.value })}
                                        placeholder="Player Name"
                                        required
                                    />
                                </div>
                                <div className="form-group">
                                    <label htmlFor="newPlayerGhin">GHIN</label>
                                    <input
                                        type="text"
                                        id="newPlayerGhin"
                                        value={newMasterPlayerForm.ghin}
                                        onChange={(e) => setNewMasterPlayerForm({ ...newMasterPlayerForm, ghin: e.target.value })}
                                        placeholder="GHIN Number (optional)"
                                    />
                                </div>
                                <div className="form-group">
                                    <label htmlFor="newPlayerHandicap">Handicap *</label>
                                    <input
                                        type="number"
                                        id="newPlayerHandicap"
                                        value={newMasterPlayerForm.handicap}
                                        onChange={(e) => setNewMasterPlayerForm({ ...newMasterPlayerForm, handicap: e.target.value })}
                                        placeholder="Handicap"
                                        required
                                    />
                                </div>
                                <div className="form-actions">
                                    <button
                                        type="button"
                                        className="btn btn-secondary"
                                        onClick={() => {
                                            setShowAddNewPlayer(false);
                                            setNewMasterPlayerForm({ player_name: '', ghin: '', handicap: '' });
                                        }}
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        className="btn btn-primary"
                                        disabled={loading}
                                    >
                                        {loading ? 'Adding...' : 'Add Player'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    ) : (
                        <form onSubmit={handleCreateGroup}>
                            <div style={{
                                padding: '12px',
                                backgroundColor: '#e8f4f8',
                                borderRadius: '4px',
                                marginBottom: '20px',
                                border: '1px solid #b3d9ea'
                            }}>
                                <p style={{ margin: 0, fontSize: '14px', color: '#0c5460' }}>
                                    <strong>ℹ️ Group Code:</strong> A unique 6-character code will be automatically generated for this group
                                </p>
                            </div>

                            {userType === 'admin' && (
                                <div className="form-group">
                                    <label htmlFor="startingHole">Starting Hole *</label>
                                    <select
                                        id="startingHole"
                                        value={startingHole}
                                        onChange={(e) => setStartingHole(parseInt(e.target.value))}
                                        required
                                        style={{
                                            width: '100%',
                                            padding: '8px',
                                            fontSize: '16px',
                                            borderRadius: '4px',
                                            border: '1px solid #ddd'
                                        }}
                                    >
                                        {[...Array(18)].map((_, i) => (
                                            <option key={i + 1} value={i + 1}>
                                                Hole {i + 1}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            )}

                            <h4>Select Players</h4>
                            {selectedPlayers.map((selectedPlayerId, index) => (
                                <div key={index} style={{ display: 'flex', gap: '10px', alignItems: 'flex-end', marginBottom: '15px' }}>
                                    <div className="form-group" style={{ flex: 1, margin: 0 }}>
                                        <label htmlFor={`player${index + 1}`}>Player {index + 1}</label>
                                        <select
                                            id={`player${index + 1}`}
                                            value={selectedPlayerId}
                                            onChange={(e) => handlePlayerSelection(index, e.target.value)}
                                            className="player-select"
                                        >
                                            <option value="">-- Select Player --</option>
                                            {masterPlayers.map((player) => (
                                                <option key={player.id} value={player.id}>
                                                    {player.player_name} (HCP: {player.handicap || 0}{player.ghin ? `, GHIN: ${player.ghin}` : ''})
                                                </option>
                                            ))}
                                            <option value="add_new">+ Add New Player...</option>
                                        </select>
                                    </div>
                                    {selectedPlayers.length > 1 && (
                                        <button
                                            type="button"
                                            className="btn btn-delete btn-sm"
                                            onClick={() => handleRemovePlayerSlot(index)}
                                            style={{ marginBottom: '0' }}
                                        >
                                            Remove
                                        </button>
                                    )}
                                </div>
                            ))}

                            {selectedPlayers.length < 4 && (
                                <button
                                    type="button"
                                    className="btn btn-secondary"
                                    onClick={handleAddPlayerSlot}
                                    style={{ marginBottom: '20px' }}
                                >
                                    + Add Player
                                </button>
                            )}

                            <div className="form-actions">
                                <button
                                    type="button"
                                    className="btn btn-secondary"
                                    onClick={() => {
                                        setShowCreateGroup(false);
                                        setSelectedPlayers(['']);
                                        setStartingHole(1);
                                    }}
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
                    )}
                </div>
            ) : (
                <div className="manage-players">
                    <h3>Manage Group</h3>

                    {userType === 'admin' && (
                        <div style={{
                            padding: '12px',
                            backgroundColor: '#f8f9fa',
                            borderRadius: '4px',
                            marginBottom: '20px',
                            border: '1px solid #dee2e6'
                        }}>
                            {!editingStartingHole ? (
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px' }}>
                                    <div style={{ flex: 1 }}>
                                        <strong>Starting Hole:</strong> <span style={{ marginLeft: '10px' }}>Hole {selectedGroup?.starting_hole || 1}</span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                                        <button
                                            className="btn btn-secondary btn-sm"
                                            onClick={() => setEditingStartingHole(true)}
                                            style={{ minWidth: 'auto' }}
                                        >
                                            Edit
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div>
                                    <label htmlFor="editStartingHole" style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>Starting Hole</label>
                                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                                        <select
                                            id="editStartingHole"
                                            value={newStartingHole}
                                            onChange={(e) => setNewStartingHole(parseInt(e.target.value))}
                                            style={{
                                                flex: 1,
                                                padding: '8px',
                                                fontSize: '16px',
                                                borderRadius: '4px',
                                                border: '1px solid #ddd'
                                            }}
                                        >
                                            {[...Array(18)].map((_, i) => (
                                                <option key={i + 1} value={i + 1}>
                                                    Hole {i + 1}
                                                </option>
                                            ))}
                                        </select>
                                        <button
                                            className="btn btn-primary btn-sm"
                                            onClick={handleUpdateStartingHole}
                                            disabled={loading}
                                        >
                                            Save
                                        </button>
                                        <button
                                            className="btn btn-secondary btn-sm"
                                            onClick={() => {
                                                setEditingStartingHole(false);
                                                setNewStartingHole(selectedGroup?.starting_hole || 1);
                                            }}
                                            disabled={loading}
                                        >
                                            Cancel
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

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
                                            {userType === 'admin' && (
                                                <button
                                                    className="btn btn-secondary btn-sm"
                                                    onClick={() => handleEditPlayer(player)}
                                                    disabled={loading}
                                                >
                                                    Edit
                                                </button>
                                            )}
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

                    {groupPlayers.length < 4 && (
                        <div style={{ marginTop: '20px', marginBottom: '20px' }}>
                            {!showAddPlayerToGroup ? (
                                <button
                                    className="btn btn-primary"
                                    onClick={() => setShowAddPlayerToGroup(true)}
                                >
                                    + Add Player
                                </button>
                            ) : (
                                <form onSubmit={handleAddPlayerToGroup}>
                                    <div className="form-group">
                                        <label htmlFor="addPlayerSelect">Select Player to Add</label>
                                        <select
                                            id="addPlayerSelect"
                                            value={selectedPlayerToAdd}
                                            onChange={(e) => setSelectedPlayerToAdd(e.target.value)}
                                            required
                                            style={{
                                                width: '100%',
                                                padding: '8px',
                                                fontSize: '16px',
                                                borderRadius: '4px',
                                                border: '1px solid #ddd'
                                            }}
                                        >
                                            <option value="">-- Select Player --</option>
                                            {masterPlayers.map((player) => (
                                                <option key={player.id} value={player.id}>
                                                    {player.player_name} (HCP: {player.handicap || 0}{player.ghin ? `, GHIN: ${player.ghin}` : ''})
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    <div style={{ display: 'flex', gap: '10px' }}>
                                        <button
                                            type="button"
                                            className="btn btn-secondary"
                                            onClick={() => {
                                                setShowAddPlayerToGroup(false);
                                                setSelectedPlayerToAdd('');
                                            }}
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            type="submit"
                                            className="btn btn-primary"
                                            disabled={loading}
                                        >
                                            {loading ? 'Adding...' : 'Add Player'}
                                        </button>
                                    </div>
                                </form>
                            )}
                        </div>
                    )}

                    <div className="manage-players-actions">
                        <button
                            className="btn btn-secondary"
                            onClick={handleCloseManagePlayers}
                        >
                            Back
                        </button>
                        <button
                            className="btn btn-delete"
                            onClick={handleDeleteGroup}
                            disabled={loading}
                        >
                            Delete Group
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default GroupSelection;
