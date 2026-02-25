import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';

function Login() {
    const [loginType, setLoginType] = useState('code'); // 'code' or 'admin'
    const [code, setCode] = useState('');
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const { loginWithTournamentCode, loginWithGroupCode, loginWithAdmin } = useAuth();

    const handleCodeLogin = async (e) => {
        e.preventDefault();
        setError('');

        if (!code) {
            setError('Please enter a code');
            return;
        }

        setLoading(true);

        // Try group code first, then tournament code
        let result = await loginWithGroupCode(code);

        if (!result.success) {
            result = await loginWithTournamentCode(code);
        }

        if (!result.success) {
            setError(result.error || 'Invalid code');
        }

        setLoading(false);
    };

    const handleAdminLogin = async (e) => {
        e.preventDefault();
        setError('');

        if (!username || !password) {
            setError('Please enter username and password');
            return;
        }

        setLoading(true);

        const result = await loginWithAdmin(username, password);

        if (!result.success) {
            setError(result.error || 'Invalid credentials');
        }

        setLoading(false);
    };

    return (
        <div style={styles.container}>
            <div style={styles.card}>
                <h1 style={styles.title}>Tournament Scoring</h1>

                <div style={styles.tabContainer}>
                    <button
                        style={{
                            ...styles.tab,
                            ...(loginType === 'code' ? styles.tabActive : {})
                        }}
                        onClick={() => {
                            setLoginType('code');
                            setError('');
                        }}
                    >
                        Enter Code
                    </button>
                    <button
                        style={{
                            ...styles.tab,
                            ...(loginType === 'admin' ? styles.tabActive : {})
                        }}
                        onClick={() => {
                            setLoginType('admin');
                            setError('');
                        }}
                    >
                        Admin Login
                    </button>
                </div>

                {loginType === 'code' ? (
                    <form onSubmit={handleCodeLogin} style={styles.form}>
                        <div style={styles.inputGroup}>
                            <label style={styles.label}>Tournament or Group Code</label>
                            <input
                                type="text"
                                value={code}
                                onChange={(e) => setCode(e.target.value.toUpperCase())}
                                style={styles.input}
                                placeholder="Enter your code"
                                autoComplete="off"
                            />
                        </div>

                        {error && <div style={styles.error}>{error}</div>}

                        <button
                            type="submit"
                            style={styles.button}
                            disabled={loading}
                        >
                            {loading ? 'Signing in...' : 'Sign In'}
                        </button>
                    </form>
                ) : (
                    <form onSubmit={handleAdminLogin} style={styles.form}>
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
                                autoComplete="current-password"
                            />
                        </div>

                        {error && <div style={styles.error}>{error}</div>}

                        <button
                            type="submit"
                            style={styles.button}
                            disabled={loading}
                        >
                            {loading ? 'Signing in...' : 'Sign In'}
                        </button>
                    </form>
                )}
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
    tabContainer: {
        display: 'flex',
        gap: '10px',
        marginBottom: '20px',
        borderBottom: '2px solid #eee'
    },
    tab: {
        flex: 1,
        padding: '12px',
        fontSize: '14px',
        fontWeight: '500',
        color: '#666',
        backgroundColor: 'transparent',
        border: 'none',
        borderBottom: '2px solid transparent',
        cursor: 'pointer',
        transition: 'all 0.2s',
        marginBottom: '-2px'
    },
    tabActive: {
        color: '#007bff',
        borderBottomColor: '#007bff'
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
    hint: {
        fontSize: '12px',
        color: '#999',
        marginTop: '-4px'
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

export default Login;
