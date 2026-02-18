import React, { useState } from 'react';
import TournamentSetup from './components/TournamentSetup';
import GroupSelection from './components/GroupSelection';
import ScoreEntry from './components/ScoreEntry';
import Leaderboard from './components/Leaderboard';
import './App.css';

function App() {
    const [currentView, setCurrentView] = useState('tournament');
    const [selectedTournament, setSelectedTournament] = useState(null);
    const [selectedGroup, setSelectedGroup] = useState(null);
    const [editingTournament, setEditingTournament] = useState(null);

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
        setCurrentView('leaderboard');
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

    return (
        <div className="App">
            {currentView === 'tournament' && (
                <TournamentSetup onTournamentSelected={handleTournamentSelected} />
            )}

            {currentView === 'group' && selectedTournament && (
                <GroupSelection
                    tournament={selectedTournament}
                    onGroupSelected={handleGroupSelected}
                    onBack={handleBackToTournament}
                    onShowLeaderboard={handleShowLeaderboard}
                    onEditHoles={handleEditHoles}
                />
            )}

            {currentView === 'score' && selectedTournament && selectedGroup && (
                <ScoreEntry
                    tournament={selectedTournament}
                    group={selectedGroup}
                    onBack={handleBackToGroup}
                    onShowLeaderboard={handleShowLeaderboard}
                />
            )}

            {currentView === 'leaderboard' && selectedTournament && (
                <Leaderboard
                    tournament={selectedTournament}
                    onBack={handleBackFromLeaderboard}
                />
            )}

            {currentView === 'editHoles' && editingTournament && (
                <TournamentSetup
                    onTournamentSelected={handleBackFromEditHoles}
                    editingTournament={editingTournament}
                />
            )}
        </div>
    );
}

export default App;
