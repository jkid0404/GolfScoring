const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
require('dotenv').config();

const { getDatabase, initializeDatabase } = require('./config/databaseAdapter');
const tournamentsRouter = require('./routes/tournaments');
const groupsRouter = require('./routes/groups');
const playersRouter = require('./routes/players');
const scoresRouter = require('./routes/scores');
const coursesRouter = require('./routes/courses');
const playersMasterRouter = require('./routes/playersMaster');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
    cors: {
        origin: process.env.FRONTEND_URL || 'http://localhost:3000',
        methods: ['GET', 'POST']
    }
});

const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Make io available to routes
app.set('io', io);

// Routes
app.use('/api/tournaments', tournamentsRouter);
app.use('/api/groups', groupsRouter);
app.use('/api/players', playersRouter);
app.use('/api/scores', scoresRouter);
app.use('/api/courses', coursesRouter);
app.use('/api/players-master', playersMasterRouter);

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', message: 'Server is running' });
});

// Socket.IO connection handling
io.on('connection', (socket) => {
    console.log('New client connected:', socket.id);

    // Join tournament room
    socket.on('join_tournament', (tournamentId) => {
        socket.join(`tournament_${tournamentId}`);
        console.log(`Client ${socket.id} joined tournament ${tournamentId}`);
    });

    // Leave tournament room
    socket.on('leave_tournament', (tournamentId) => {
        socket.leave(`tournament_${tournamentId}`);
        console.log(`Client ${socket.id} left tournament ${tournamentId}`);
    });

    socket.on('disconnect', () => {
        console.log('Client disconnected:', socket.id);
    });
});

// Initialize database and start server
(async () => {
    try {
        // Use initializeDatabase if available (Azure SQL), otherwise use getDatabase (SQLite)
        if (initializeDatabase) {
            await initializeDatabase();
        } else {
            await getDatabase();
        }
        console.log('Database initialized successfully!');
    } catch (error) {
        console.error('Database initialization error:', error);
    }

    // Start server
    server.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
        console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
        console.log(`Frontend URL: ${process.env.FRONTEND_URL || 'http://localhost:3000'}`);
        console.log(`Database type: ${process.env.DB_TYPE || 'sqlite'}`);
    });
})();
