import React, { useState } from 'react';
import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

function AdminSignup({ onSignupComplete }) {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (!username || !password || !confirmPassword) {
            setError('All fields are required');
            return;
        }

        if (password !== confirmPassword) {
            setError('Passwords do not match');
            return;
        }

        if (password.length < 6) {
            setError('Password must be at least 6 characters long');
            return;
        }

        setLoading(true);

        try {
            await axios.post(`${API_BASE_URL}/auth/admin-signup`, {
                username,
                password
            });

            onSignupComplete();
        } catch (err) {
            console.error('Signup error:', err);
            setError(err.response?.data?.error || 'Failed to create admin account');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={styles.container}>
            <div style={styles.card}>
                <h1 style={styles.title}>Create Admin Account</h1>
                <p style={styles.subtitle}>
                    Welcome! Create your admin account to get started.
                </p>

                <form onSubmit={handleSubmit} style={styles.form}>
                    <div style={styles.inputGroup}>
                        <label style={styles.label}>Username</label>
                        <input
                            type="text"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            style={styles.input}
                            placeholder="Enter username"
                            autoComplete="username"
                        />
                    </div>

                    <div style={styles.inputGroup}>
                        <label style={styles.label}>Password</label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            style={styles.input}
                            placeholder="Enter password"
                            autoComplete="new-password"
                        />
                    </div>

                    <div style={styles.inputGroup}>
                        <label style={styles.label}>Confirm Password</label>
                        <input
                            type="password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            style={styles.input}
                            placeholder="Confirm password"
                            autoComplete="new-password"
                        />
                    </div>

                    {error && <div style={styles.error}>{error}</div>}

                    <button
                        type="submit"
                        style={styles.button}
                        disabled={loading}
                    >
                        {loading ? 'Creating Account...' : 'Create Account'}
                    </button>
                </form>
            </div>
        </div>
    );
}

const styles = {
    container: {
        minHeight: '100vh',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#f5f5f5',
        padding: '20px'
    },
    card: {
        backgroundColor: 'white',
        borderRadius: '8px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        padding: '40px',
        width: '100%',
        maxWidth: '400px'
    },
    title: {
        margin: '0 0 10px 0',
        fontSize: '28px',
        color: '#333',
        textAlign: 'center'
    },
    subtitle: {
        margin: '0 0 30px 0',
        fontSize: '14px',
        color: '#666',
        textAlign: 'center'
    },
    form: {
        display: 'flex',
        flexDirection: 'column',
        gap: '20px'
    },
    inputGroup: {
        display: 'flex',
        flexDirection: 'column',
        gap: '8px'
    },
    label: {
        fontSize: '14px',
        fontWeight: '500',
        color: '#333'
    },
    input: {
        padding: '12px',
        fontSize: '16px',
        border: '1px solid #ddd',
        borderRadius: '4px',
        outline: 'none',
        transition: 'border-color 0.2s'
    },
    button: {
        padding: '12px',
        fontSize: '16px',
        fontWeight: '600',
        color: 'white',
        backgroundColor: '#007bff',
        border: 'none',
        borderRadius: '4px',
        cursor: 'pointer',
        transition: 'background-color 0.2s'
    },
    error: {
        padding: '12px',
        backgroundColor: '#fee',
        color: '#c33',
        borderRadius: '4px',
        fontSize: '14px',
        textAlign: 'center'
    }
};

export default AdminSignup;
