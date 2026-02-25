import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const AuthContext = createContext(null);

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};

export const AuthProvider = ({ children }) => {
    const [authState, setAuthState] = useState({
        isAuthenticated: false,
        userType: null, // 'tournament' | 'group' | 'admin'
        tournamentId: null,
        groupId: null,
        tournamentData: null,
        groupData: null
    });

    // Load auth state from localStorage on mount
    useEffect(() => {
        const savedAuthState = localStorage.getItem('authState');
        if (savedAuthState) {
            try {
                const parsed = JSON.parse(savedAuthState);
                setAuthState(parsed);
            } catch (error) {
                console.error('Error loading auth state:', error);
                localStorage.removeItem('authState');
            }
        }
    }, []);

    // Save auth state to localStorage whenever it changes
    useEffect(() => {
        if (authState.isAuthenticated) {
            localStorage.setItem('authState', JSON.stringify(authState));
        } else {
            localStorage.removeItem('authState');
        }
    }, [authState]);

    const loginWithTournamentCode = async (code) => {
        try {
            const response = await axios.post(`${API_BASE_URL}/auth/tournament-code`, { code });
            const { userType, tournamentId, tournamentData } = response.data;

            setAuthState({
                isAuthenticated: true,
                userType,
                tournamentId,
                groupId: null,
                tournamentData,
                groupData: null
            });

            return { success: true };
        } catch (error) {
            console.error('Tournament code login error:', error);
            return {
                success: false,
                error: error.response?.data?.error || 'Invalid tournament code'
            };
        }
    };

    const loginWithGroupCode = async (code) => {
        try {
            const response = await axios.post(`${API_BASE_URL}/auth/group-code`, { code });
            const { userType, tournamentId, groupId, tournamentData, groupData } = response.data;

            setAuthState({
                isAuthenticated: true,
                userType,
                tournamentId,
                groupId,
                tournamentData,
                groupData
            });

            return { success: true };
        } catch (error) {
            console.error('Group code login error:', error);
            return {
                success: false,
                error: error.response?.data?.error || 'Invalid group code'
            };
        }
    };

    const loginWithAdmin = async (username, password) => {
        try {
            const response = await axios.post(`${API_BASE_URL}/auth/admin`, { username, password });
            const { userType } = response.data;

            setAuthState({
                isAuthenticated: true,
                userType,
                tournamentId: null,
                groupId: null,
                tournamentData: null,
                groupData: null
            });

            return { success: true };
        } catch (error) {
            console.error('Admin login error:', error);
            return {
                success: false,
                error: error.response?.data?.error || 'Invalid credentials'
            };
        }
    };

    const logout = () => {
        setAuthState({
            isAuthenticated: false,
            userType: null,
            tournamentId: null,
            groupId: null,
            tournamentData: null,
            groupData: null
        });
    };

    const value = {
        ...authState,
        loginWithTournamentCode,
        loginWithGroupCode,
        loginWithAdmin,
        logout
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
