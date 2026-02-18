# Golf Tournament Scoring Web App

A real-time golf tournament scoring application built with React, Node.js, and SQLite. Features live leaderboard updates using WebSockets.

## Features

- Create and manage golf tournaments
- Organize players into groups
- Enter scores hole-by-hole for each player
- Real-time leaderboard with gross and net scores
- Support for player handicaps
- Live updates across multiple devices using WebSockets
- Responsive design for mobile and desktop

## Technology Stack

- **Frontend**: React with Socket.IO client
- **Backend**: Node.js with Express and Socket.IO
- **Database**: SQLite (file-based, no setup required)
- **Real-time**: WebSockets via Socket.IO

## Prerequisites

Before running the application, you need:

1. Node.js (v14 or higher)
2. npm or yarn package manager

That's it! SQLite is included and requires no additional setup.

## Setup Instructions

### 1. Backend Setup

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. The SQLite database will be automatically created when you start the server. No configuration needed!

4. Start the backend server:
   ```bash
   npm start
   ```

   For development with auto-reload:
   ```bash
   npm run dev
   ```

   The server will run on http://localhost:5000 and create a `golf_scoring.db` file for data storage.

### 2. Frontend Setup

1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the React development server:
   ```bash
   npm start
   ```

   The application will open in your browser at http://localhost:3000

## Usage

### Creating a Tournament

1. From the home page, click "Create New Tournament"
2. Enter tournament details (name, date, course name)
3. Click "Create Tournament"

### Setting Up Groups

1. Select a tournament
2. Click "Create New Group" to add a group
3. For each group, click "Add Player" to add players with their handicaps

### Entering Scores

1. Select a group from the tournament
2. Click "Enter Scores" for the group
3. Select a player
4. Enter scores for each hole (1-18)
5. Click "Save" after each hole or "Save All Scores" to submit all at once

### Viewing the Leaderboard

1. Click "Leaderboard" from the score entry screen
2. View overall standings and group-specific rankings
3. The leaderboard updates automatically when scores are entered
4. Check the "Live" indicator to confirm real-time connection status

## API Endpoints

### Tournaments
- `POST /api/tournaments` - Create a tournament
- `GET /api/tournaments` - Get all tournaments
- `GET /api/tournaments/:id` - Get specific tournament

### Groups
- `POST /api/groups` - Create a group
- `GET /api/groups/tournament/:tournamentId` - Get groups for a tournament
- `GET /api/groups/:id` - Get specific group with players

### Players
- `POST /api/players` - Add a player
- `GET /api/players/group/:groupId` - Get players in a group
- `GET /api/players/:id` - Get specific player

### Scores
- `POST /api/scores` - Submit/update a score
- `GET /api/scores/player/:playerId` - Get scores for a player
- `GET /api/scores/leaderboard/:tournamentId` - Get tournament leaderboard

## WebSocket Events

- `join_tournament` - Client joins a tournament room
- `leave_tournament` - Client leaves a tournament room
- `score_updated` - Broadcast when a score is submitted

## Project Structure

```
GolfScoring/
├── backend/
│   ├── config/
│   │   └── database.js          # Azure SQL connection
│   ├── routes/
│   │   ├── tournaments.js       # Tournament endpoints
│   │   ├── groups.js            # Group endpoints
│   │   ├── players.js           # Player endpoints
│   │   └── scores.js            # Score and leaderboard endpoints
│   ├── server.js                # Express + Socket.IO server
│   ├── package.json
│   ├── .env.example
│   └── .env                     # Your local config (not in git)
├── frontend/
│   ├── public/
│   │   └── index.html
│   ├── src/
│   │   ├── components/
│   │   │   ├── TournamentSetup.js    # Tournament selection/creation
│   │   │   ├── GroupSelection.js     # Group management
│   │   │   ├── ScoreEntry.js         # Score input interface
│   │   │   └── Leaderboard.js        # Real-time standings
│   │   ├── services/
│   │   │   ├── api.js                # REST API client
│   │   │   └── socket.js             # WebSocket client
│   │   ├── App.js
│   │   ├── App.css
│   │   └── index.js
│   └── package.json
├── database/
│   └── init.sql                 # Database schema
└── README.md
```

## Troubleshooting

### Backend won't start
- Check that your `.env` file has correct Azure SQL credentials
- Verify your IP is allowed in Azure SQL firewall rules
- Ensure port 5000 is not in use by another application

### Frontend can't connect to backend
- Verify backend is running on port 5000
- Check that CORS is properly configured in `server.js`
- Look for errors in browser console (F12)

### Real-time updates not working
- Check the connection status indicator on the leaderboard
- Verify WebSocket connection in browser Network tab
- Ensure Socket.IO is properly configured on both client and server

### Database connection fails
- Test connection to Azure SQL using Azure Data Studio or SQL Server Management Studio
- Verify connection string in `.env` file
- Check that the database exists and tables are created

## Development

### Running in Development Mode

Backend with auto-reload:
```bash
cd backend
npm run dev
```

Frontend with hot reload:
```bash
cd frontend
npm start
```

### Building for Production

Frontend:
```bash
cd frontend
npm run build
```

The build files will be in `frontend/build/` directory.

## License

MIT

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.
