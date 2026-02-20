# Azure Deployment Guide

## Architecture
- **Frontend**: Azure Static Web Apps
- **Backend**: Azure App Service
- **Database**: Azure SQL Database

## Prerequisites
- Azure account with active subscription
- Azure CLI installed: `az login`
- Node.js and npm installed locally

## Step 1: Create Azure SQL Database

1. Go to Azure Portal > Create a resource > SQL Database
2. Create new SQL server with these settings:
   - Server name: `golf-scoring-sql-server`
   - Location: Choose your region
   - Authentication: SQL authentication
   - Admin login: Choose a username
   - Password: Choose a strong password

3. Create database:
   - Database name: `golf_scoring`
   - Compute tier: Basic (cheapest for testing)
   - Backup storage redundancy: Locally redundant

4. Configure firewall:
   - Add your client IP
   - Add rule: Name="AllowAzureServices", Start IP=0.0.0.0, End IP=0.0.0.0

5. Get connection string:
   - Go to your database > Connection strings
   - Copy the ADO.NET connection string

## Step 2: Initialize Database Schema

Run this SQL script in Azure Data Studio or Query Editor:

```sql
-- Create tournaments table
CREATE TABLE tournaments (
    id INT PRIMARY KEY IDENTITY(1,1),
    name NVARCHAR(255) NOT NULL,
    date DATE NOT NULL,
    course_name NVARCHAR(255),
    par_values NVARCHAR(MAX) DEFAULT '{"1":4,"2":4,"3":4,"4":4,"5":4,"6":4,"7":4,"8":4,"9":4,"10":4,"11":4,"12":4,"13":4,"14":4,"15":4,"16":4,"17":4,"18":4}',
    handicap_indices NVARCHAR(MAX) DEFAULT '{"1":1,"2":2,"3":3,"4":4,"5":5,"6":6,"7":7,"8":8,"9":9,"10":10,"11":11,"12":12,"13":13,"14":14,"15":15,"16":16,"17":17,"18":18}',
    course_rating FLOAT DEFAULT 72.0,
    slope INT DEFAULT 113,
    game_scoring NVARCHAR(50) DEFAULT 'Individual',
    created_at DATETIME DEFAULT GETDATE()
);

-- Create groups table
CREATE TABLE groups (
    id INT PRIMARY KEY IDENTITY(1,1),
    tournament_id INT NOT NULL,
    group_name NVARCHAR(100) NOT NULL,
    created_at DATETIME DEFAULT GETDATE(),
    FOREIGN KEY (tournament_id) REFERENCES tournaments(id)
);

-- Create players table
CREATE TABLE players (
    id INT PRIMARY KEY IDENTITY(1,1),
    group_id INT NOT NULL,
    player_name NVARCHAR(100) NOT NULL,
    handicap INT DEFAULT 0,
    FOREIGN KEY (group_id) REFERENCES groups(id)
);

-- Create scores table
CREATE TABLE scores (
    id INT PRIMARY KEY IDENTITY(1,1),
    player_id INT NOT NULL,
    group_id INT NOT NULL,
    tournament_id INT NOT NULL,
    hole_number INT NOT NULL CHECK (hole_number BETWEEN 1 AND 18),
    strokes INT NOT NULL,
    created_at DATETIME DEFAULT GETDATE(),
    updated_at DATETIME DEFAULT GETDATE(),
    FOREIGN KEY (player_id) REFERENCES players(id),
    FOREIGN KEY (group_id) REFERENCES groups(id),
    FOREIGN KEY (tournament_id) REFERENCES tournaments(id)
);

-- Create players_master table
CREATE TABLE players_master (
    id INT PRIMARY KEY IDENTITY(1,1),
    player_name NVARCHAR(100) NOT NULL,
    ghin NVARCHAR(50),
    handicap INT DEFAULT 0,
    created_at DATETIME DEFAULT GETDATE()
);

-- Create courses table
CREATE TABLE courses (
    id INT PRIMARY KEY IDENTITY(1,1),
    course_name NVARCHAR(255) NOT NULL UNIQUE,
    par_values NVARCHAR(MAX) DEFAULT '{"1":4,"2":4,"3":4,"4":4,"5":4,"6":4,"7":4,"8":4,"9":4,"10":4,"11":4,"12":4,"13":4,"14":4,"15":4,"16":4,"17":4,"18":4}',
    handicap_indices NVARCHAR(MAX) DEFAULT '{"1":1,"2":2,"3":3,"4":4,"5":5,"6":6,"7":7,"8":8,"9":9,"10":10,"11":11,"12":12,"13":13,"14":14,"15":15,"16":16,"17":17,"18":18}',
    course_rating FLOAT DEFAULT 72.0,
    slope INT DEFAULT 113,
    created_at DATETIME DEFAULT GETDATE()
);

-- Create indexes
CREATE INDEX idx_scores_player ON scores(player_id);
CREATE INDEX idx_scores_tournament ON scores(tournament_id);
CREATE INDEX idx_players_group ON players(group_id);
CREATE INDEX idx_groups_tournament ON groups(tournament_id);
```

## Step 3: Deploy Backend to Azure App Service

### Option A: Using Azure Portal

1. Create App Service:
   - Go to Azure Portal > Create a resource > Web App
   - Name: `golf-scoring-backend` (must be globally unique)
   - Runtime: Node 18 LTS
   - Region: Same as your database
   - Pricing plan: Basic B1 or Free F1 for testing

2. Configure environment variables:
   - Go to your App Service > Configuration > Application settings
   - Add these settings:
     ```
     DB_TYPE=azure_sql
     DB_SERVER=your-server-name.database.windows.net
     DB_DATABASE=golf_scoring
     DB_USER=your-username
     DB_PASSWORD=your-password
     DB_ENCRYPT=true
     PORT=8080
     NODE_ENV=production
     FRONTEND_URL=https://your-static-web-app.azurestaticapps.net
     ```

3. Deploy code:
   ```bash
   cd backend
   npm install
   zip -r deploy.zip .
   ```
   - Upload via Azure Portal > Deployment Center > ZIP Deploy

### Option B: Using Azure CLI

```bash
cd backend
npm install

# Create App Service Plan
az appservice plan create --name golf-scoring-plan --resource-group your-rg --sku B1 --is-linux

# Create Web App
az webapp create --resource-group your-rg --plan golf-scoring-plan --name golf-scoring-backend --runtime "NODE:18-lts"

# Configure environment variables
az webapp config appsettings set --resource-group your-rg --name golf-scoring-backend --settings \
  DB_TYPE=azure_sql \
  DB_SERVER=your-server.database.windows.net \
  DB_DATABASE=golf_scoring \
  DB_USER=your-username \
  DB_PASSWORD=your-password \
  DB_ENCRYPT=true \
  NODE_ENV=production \
  FRONTEND_URL=https://your-static-web-app.azurestaticapps.net

# Deploy code
az webapp deployment source config-zip --resource-group your-rg --name golf-scoring-backend --src deploy.zip
```

4. Enable WebSockets:
   - App Service > Configuration > General settings
   - Web sockets: On
   - Save

5. Get backend URL: `https://golf-scoring-backend.azurewebsites.net`

## Step 4: Deploy Frontend to Azure Static Web Apps

### Option A: Using Azure Portal (with GitHub)

1. Create Static Web App:
   - Go to Azure Portal > Create a resource > Static Web App
   - Name: `golf-scoring-app`
   - Region: Choose closest region
   - Deployment: GitHub (sign in to GitHub)
   - Organization: Your GitHub username
   - Repository: Create new repo or select existing
   - Branch: main
   - Build presets: React
   - App location: `/frontend`
   - Api location: (leave empty)
   - Output location: `build`

2. Update environment variable:
   - Edit `frontend/.env.production`
   - Replace with your actual backend URL:
     ```
     REACT_APP_API_URL=https://golf-scoring-backend.azurewebsites.net/api
     ```

3. Commit and push to GitHub:
   ```bash
   git add .
   git commit -m "Configure for Azure deployment"
   git push
   ```

4. GitHub Actions will automatically build and deploy

### Option B: Using Azure CLI

```bash
cd frontend

# Update .env.production with your backend URL
echo "REACT_APP_API_URL=https://golf-scoring-backend.azurewebsites.net/api" > .env.production

# Build the app
npm install
npm run build

# Deploy to Static Web Apps
az staticwebapp create \
  --name golf-scoring-app \
  --resource-group your-rg \
  --source build \
  --location "centralus" \
  --branch main \
  --app-location "/frontend" \
  --output-location "build"
```

5. Get frontend URL: `https://golf-scoring-app.azurestaticapps.net`

## Step 5: Configure CORS

Update backend CORS settings to allow your frontend:

1. Edit `backend/server.js` CORS configuration to include your Static Web App URL
2. Or set `FRONTEND_URL` environment variable in App Service

## Step 6: Test the Deployment

1. Visit your Static Web App URL
2. Create a tournament
3. Add groups and players
4. Enter scores
5. View leaderboard

## Troubleshooting

### Backend Issues
- Check App Service logs: `az webapp log tail --name golf-scoring-backend --resource-group your-rg`
- Verify database connection in App Service Console
- Ensure firewall allows Azure services

### Frontend Issues
- Check Static Web App build logs in GitHub Actions
- Verify API URL in browser console
- Check CORS settings if API calls fail

### Database Issues
- Test connection string in local app first
- Verify firewall rules include your IP
- Check database user permissions

## Cost Optimization

- **Development**: Use Free tiers
  - App Service: F1 Free
  - SQL Database: Basic tier
  - Static Web Apps: Free tier

- **Production**: Scale up as needed
  - App Service: B1 Basic ($13/month)
  - SQL Database: S0 Standard ($15/month)
  - Static Web Apps: Free tier (sufficient for most)

## Updating the App

### Backend updates:
```bash
cd backend
zip -r deploy.zip .
az webapp deployment source config-zip --resource-group your-rg --name golf-scoring-backend --src deploy.zip
```

### Frontend updates:
- Push to GitHub (auto-deploys via GitHub Actions)
- Or use Azure CLI: `az staticwebapp deploy`

## Security Best Practices

1. Use Azure Key Vault for secrets
2. Enable HTTPS only
3. Configure authentication (Azure AD) if needed
4. Set up monitoring and alerts
5. Regularly update dependencies
6. Use connection string encryption
7. Implement rate limiting
8. Enable Application Insights for monitoring
