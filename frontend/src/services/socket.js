import { io } from 'socket.io-client';

const SOCKET_URL = process.env.REACT_APP_SOCKET_URL || 'http://localhost:5000';

class SocketService {
    constructor() {
        this.socket = null;
        this.connected = false;
    }

    connect() {
        if (!this.socket) {
            this.socket = io(SOCKET_URL, {
                transports: ['websocket', 'polling'],
            });

            this.socket.on('connect', () => {
                console.log('Socket connected:', this.socket.id);
                this.connected = true;
            });

            this.socket.on('disconnect', () => {
                console.log('Socket disconnected');
                this.connected = false;
            });

            this.socket.on('connect_error', (error) => {
                console.error('Socket connection error:', error);
            });
        }
        return this.socket;
    }

    disconnect() {
        if (this.socket) {
            this.socket.disconnect();
            this.socket = null;
            this.connected = false;
        }
    }

    joinTournament(tournamentId) {
        if (this.socket && tournamentId) {
            this.socket.emit('join_tournament', tournamentId);
            console.log(`Joined tournament ${tournamentId}`);
        }
    }

    leaveTournament(tournamentId) {
        if (this.socket && tournamentId) {
            this.socket.emit('leave_tournament', tournamentId);
            console.log(`Left tournament ${tournamentId}`);
        }
    }

    onScoreUpdate(callback) {
        if (this.socket) {
            this.socket.on('score_updated', callback);
        }
    }

    offScoreUpdate(callback) {
        if (this.socket) {
            this.socket.off('score_updated', callback);
        }
    }

    isConnected() {
        return this.connected;
    }
}

const socketService = new SocketService();
export default socketService;
