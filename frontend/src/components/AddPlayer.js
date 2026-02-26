import React, { useState } from 'react';
import { createMasterPlayer } from '../services/api';
import './AddPlayer.css';

const AddPlayer = ({ onBack, onPlayerAdded }) => {
    const [formData, setFormData] = useState({
        player_name: '',
        email: '',
        ghin: '',
        handicap: ''
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(false);

    const handleInputChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
        setError(null);
        setSuccess(false);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            await createMasterPlayer({
                player_name: formData.player_name,
                email: formData.email,
                ghin: formData.ghin,
                handicap: parseInt(formData.handicap) || 0
            });

            setSuccess(true);

            // Reset form
            setFormData({
                player_name: '',
                email: '',
                ghin: '',
                handicap: ''
            });

            // Notify parent if callback provided
            if (onPlayerAdded) {
                onPlayerAdded();
            }
        } catch (err) {
            console.error('Error adding player:', err);
            setError('Failed to add player. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="add-player">
            <div className="header">
                <button className="btn btn-back" onClick={onBack}>
                    Back
                </button>
                <h2>Add New Player</h2>
                <div style={{ width: '80px' }}></div>
            </div>

            {error && <div className="error-message">{error}</div>}
            {success && (
                <div className="success-message">
                    Player added successfully! You can add another or go back.
                </div>
            )}

            <div className="add-player-form">
                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label htmlFor="player_name">Player Name *</label>
                        <input
                            type="text"
                            id="player_name"
                            name="player_name"
                            value={formData.player_name}
                            onChange={handleInputChange}
                            placeholder="Enter player's full name"
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label htmlFor="email">Email</label>
                        <input
                            type="email"
                            id="email"
                            name="email"
                            value={formData.email}
                            onChange={handleInputChange}
                            placeholder="Enter email address (optional)"
                        />
                    </div>

                    <div className="form-group">
                        <label htmlFor="ghin">GHIN Number</label>
                        <input
                            type="text"
                            id="ghin"
                            name="ghin"
                            value={formData.ghin}
                            onChange={handleInputChange}
                            placeholder="Enter GHIN number (optional)"
                        />
                    </div>

                    <div className="form-group">
                        <label htmlFor="handicap">Handicap *</label>
                        <input
                            type="number"
                            id="handicap"
                            name="handicap"
                            value={formData.handicap}
                            onChange={handleInputChange}
                            placeholder="Enter handicap"
                            required
                        />
                    </div>

                    <div className="form-actions">
                        <button
                            type="submit"
                            className="btn btn-primary"
                            disabled={loading}
                        >
                            {loading ? 'Adding Player...' : 'Add Player'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default AddPlayer;
