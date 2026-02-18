import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const api = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Tournament APIs
export const createTournament = async (tournamentData) => {
    const response = await api.post('/tournaments', tournamentData);
    return response.data;
};

export const getTournament = async (id) => {
    const response = await api.get(`/tournaments/${id}`);
    return response.data;
};

export const getAllTournaments = async () => {
    const response = await api.get('/tournaments');
    return response.data;
};

export const updateTournament = async (id, tournamentData) => {
    const response = await api.put(`/tournaments/${id}`, tournamentData);
    return response.data;
};

// Group APIs
export const createGroup = async (groupData) => {
    const response = await api.post('/groups', groupData);
    return response.data;
};

export const getGroupsByTournament = async (tournamentId) => {
    const response = await api.get(`/groups/tournament/${tournamentId}`);
    return response.data;
};

export const getGroup = async (id) => {
    const response = await api.get(`/groups/${id}`);
    return response.data;
};

// Player APIs
export const addPlayer = async (playerData) => {
    const response = await api.post('/players', playerData);
    return response.data;
};

export const getPlayersByGroup = async (groupId) => {
    const response = await api.get(`/players/group/${groupId}`);
    return response.data;
};

export const getPlayer = async (id) => {
    const response = await api.get(`/players/${id}`);
    return response.data;
};

export const deletePlayer = async (id) => {
    const response = await api.delete(`/players/${id}`);
    return response.data;
};

// Score APIs
export const submitScore = async (scoreData) => {
    const response = await api.post('/scores', scoreData);
    return response.data;
};

export const getPlayerScores = async (playerId) => {
    const response = await api.get(`/scores/player/${playerId}`);
    return response.data;
};

export const getLeaderboard = async (tournamentId) => {
    const response = await api.get(`/scores/leaderboard/${tournamentId}`);
    return response.data;
};

export default api;
