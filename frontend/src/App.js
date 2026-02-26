import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import TournamentSetup from './components/TournamentSetup';
import GroupSelection from './components/GroupSelection';
import ScoreEntry from './components/ScoreEntry';
import Leaderboard from './components/Leaderboard';
import Login from './components/Login';
import AdminSignup from './components/AdminSignup';
import './App.css';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

function AppContent() {
    const { isAuthenticated, userType, tournamentData, groupData } = useAuth();
    const [currentView, setCurrentView] = useState('login');
    const [selectedTournament, setSelectedTournament] = useState(null);
    const [selectedGroup, setSelectedGroup] = useState(null);
    const [editingTournament, setEditingTournament] = useState(null);
    const [needsAdminSignup, setNeedsAdminSignup] = useState(false);
    const [checkingAdmin, setCheckingAdmin] = useState(true);

    // Check if admin exists on mount
    useEffect(() => {
        const checkAdminExists = async () => {
            try {
                const response = await axios.get(`${API_BASE_URL}/auth/admin-exists`);
                setNeedsAdminSignup(!response.data.exists);
            } catch (error) {
                console.error('Error checking admin existence:', error);
            } finally {
                setCheckingAdmin(false);
            }
        };

        checkAdminExists();
    }, []);

    // Update view based on authentication state
    useEffect(() => {
        if (isAuthenticated) {
            if (userType === 'admin') {
                setCurrentView('tournament');
            } else if (userType === 'group') {
                setSelectedTournament(tournamentData);
                setSelectedGroup(groupData);
                setCurrentView('score');
            } else if (userType === 'tournament') {
                setSelectedTournament(tournamentData);
                setCurrentView('leaderboard');
            }
        } else {
            setCurrentView('login');
            setSelectedTournament(null);
            setSelectedGroup(null);
        }
    }, [isAuthenticated, userType, tournamentData, groupData]);

    // Check if user can access a view
    const canAccessView = (view) => {
        if (userType === 'admin') return true;
        if (userType === 'tournament') return view === 'leaderboard';
        if (userType === 'group') return ['score', 'leaderboard'].includes(view);
        return false;
    };

    const handleTournamentSelected = (tournament) => {
        setSelectedTournament(tournament);
        setCurrentView('group');
    };

    const handleGroupSelected = (group) => {
        setSelectedGroup(group);
        setCurrentView('score');
    };

    const handleBackToTournament = () => {
        setSelectedTournament(null);
        setSelectedGroup(null);
        setEditingTournament(null);
        setCurrentView('tournament');
    };

    const handleBackToGroup = () => {
        setSelectedGroup(null);
        setCurrentView('group');
    };

    const handleShowLeaderboard = () => {
        if (canAccessView('leaderboard')) {
            setCurrentView('leaderboard');
        }
    };

    const handleEditHoles = () => {
        setEditingTournament(selectedTournament);
        setCurrentView('editHoles');
    };

    const handleBackFromLeaderboard = () => {
        if (selectedGroup) {
            setCurrentView('score');
        } else if (selectedTournament) {
            setCurrentView('group');
        } else {
            setCurrentView('tournament');
        }
    };

    const handleBackFromEditHoles = (updatedTournament) => {
        // Update the selected tournament with the edited data
        if (updatedTournament && updatedTournament.id) {
            setSelectedTournament(updatedTournament);
        }
        setEditingTournament(null);
        setCurrentView('group');
    };

    const handleAdminSignupComplete = () => {
        setNeedsAdminSignup(false);
        setCurrentView('login');
    };

    // Show loading while checking admin status
    if (checkingAdmin) {
        return (
            <div className="App">
                <div style={{ padding: '20px', textAlign: 'center' }}>
                    Loading...
                </div>
            </div>
        );
    }

    // Show admin signup if no admin exists
    if (needsAdminSignup && !isAuthenticated) {
        return (
            <div className="App">
                <AdminSignup onSignupComplete={handleAdminSignupComplete} />
            </div>
        );
    }

    return (
        <div className="App">
            {!isAuthenticated && currentView === 'login' && (
                <Login />
            )}

            {isAuthenticated && currentView === 'tournament' && (
                <TournamentSetup onTournamentSelected={handleTournamentSelected} />
            )}

            {isAuthenticated && currentView === 'group' && selectedTournament && (
                <GroupSelection
                    tournament={selectedTournament}
                    onGroupSelected={handleGroupSelected}
                    onBack={handleBackToTournament}
                    onShowLeaderboard={handleShowLeaderboard}
                    onEditHoles={handleEditHoles}
                />
            )}

            {isAuthenticated && currentView === 'score' && selectedTournament && selectedGroup && (
                <ScoreEntry
                    tournament={selectedTournament}
                    group={selectedGroup}
                    onBack={userType === 'admin' ? handleBackToGroup : null}
                    onShowLeaderboard={handleShowLeaderboard}
                />
            )}

            {isAuthenticated && currentView === 'leaderboard' && selectedTournament && (
                <Leaderboard
                    tournament={selectedTournament}
                    onBack={userType === 'tournament' ? null : handleBackFromLeaderboard}
                />
            )}

            {isAuthenticated && currentView === 'editHoles' && editingTournament && (
                <TournamentSetup
                    onTournamentSelected={handleBackFromEditHoles}
                    editingTournament={editingTournament}
                />
            )}
        </div>
    );
}

function App() {
    return (
        <AuthProvider>
            <AppContent />
        </AuthProvider>
    );
}

export default App;
