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

export const deleteTournament = async (id) => {
    const response = await api.delete(`/tournaments/${id}`);
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

export const updateGroup = async (id, groupData) => {
    const response = await api.put(`/groups/${id}`, groupData);
    return response.data;
};

export const deleteGroup = async (id) => {
    const response = await api.delete(`/groups/${id}`);
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

export const updatePlayer = async (id, playerData) => {
    const response = await api.put(`/players/${id}`, playerData);
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

// Course APIs
export const getAllCourses = async () => {
    const response = await api.get('/courses');
    return response.data;
};

export const getCourse = async (id) => {
    const response = await api.get(`/courses/${id}`);
    return response.data;
};

export const createCourse = async (courseData) => {
    const response = await api.post('/courses', courseData);
    return response.data;
};

export const updateCourse = async (id, courseData) => {
    const response = await api.put(`/courses/${id}`, courseData);
    return response.data;
};

export const deleteCourse = async (id) => {
    const response = await api.delete(`/courses/${id}`);
    return response.data;
};

// Master Players APIs
export const getAllMasterPlayers = async () => {
    const response = await api.get('/players-master');
    return response.data;
};

export const getMasterPlayer = async (id) => {
    const response = await api.get(`/players-master/${id}`);
    return response.data;
};

export const createMasterPlayer = async (playerData) => {
    const response = await api.post('/players-master', playerData);
    return response.data;
};

export const updateMasterPlayer = async (id, playerData) => {
    const response = await api.put(`/players-master/${id}`, playerData);
    return response.data;
};

export const deleteMasterPlayer = async (id) => {
    const response = await api.delete(`/players-master/${id}`);
    return response.data;
};

// Auth APIs
export const checkAdminExists = async () => {
    const response = await api.get('/auth/admin-exists');
    return response.data;
};

export const createAdminAccount = async (username, password) => {
    const response = await api.post('/auth/admin-signup', { username, password });
    return response.data;
};

export const loginWithAdmin = async (username, password) => {
    const response = await api.post('/auth/admin', { username, password });
    return response.data;
};

export const loginWithTournamentCode = async (code) => {
    const response = await api.post('/auth/tournament-code', { code });
    return response.data;
};

export const loginWithGroupCode = async (code) => {
    const response = await api.post('/auth/group-code', { code });
    return response.data;
};

export default api;
