# Quick Start: Deploy to Azure

## Summary of Changes Made

Your app is now ready for Azure deployment with these changes:

### Files Added:
- `AZURE_DEPLOYMENT.md` - Complete deployment guide
- `frontend/staticwebapp.config.json` - Static Web App configuration
- `frontend/.env.production` - Production environment variables
- `backend/.env.production.example` - Azure SQL configuration template
- `backend/web.config` - IIS configuration for Azure App Service
- `backend/config/azureSqlDatabase.js` - Azure SQL adapter
- `backend/config/databaseAdapter.js` - Database switcher (SQLite/Azure SQL)

### Files Modified:
- `backend/package.json` - Added `mssql` package
- `backend/server.js` - Uses database adapter
- All route files - Use database adapter instead of direct SQLite

### What Works Now:
- ✅ Local development still uses SQLite (no changes needed)
- ✅ Production can use Azure SQL Database
- ✅ Backend switches databases automatically based on `DB_TYPE` env var
- ✅ Frontend can be deployed to Azure Static Web Apps
- ✅ Backend can be deployed to Azure App Service

## Next Steps

### 1. Install Azure SQL dependency
```bash
cd backend
npm install
```

### 2. Test locally (still uses SQLite)
```bash
# Backend
cd backend
npm start

# Frontend
cd frontend
npm start
```

### 3. Deploy to Azure (follow AZURE_DEPLOYMENT.md)

**Option A: Manual Deployment**
- Create Azure SQL Database (15 min)
- Deploy backend to App Service (10 min)
- Deploy frontend to Static Web Apps (10 min)

**Option B: Azure CLI**
- Use commands in AZURE_DEPLOYMENT.md
- Faster but requires Azure CLI setup

### 4. Configure Environment Variables

**Backend (.env.production):**
```
DB_TYPE=azure_sql
DB_SERVER=your-server.database.windows.net
DB_DATABASE=golf_scoring
DB_USER=your-username
DB_PASSWORD=your-password
DB_ENCRYPT=true
NODE_ENV=production
FRONTEND_URL=https://your-app.azurestaticapps.net
```

**Frontend (.env.production):**
```
REACT_APP_API_URL=https://your-backend.azurewebsites.net/api
```

## Estimated Costs

**Development/Testing:**
- Azure SQL Database Basic: ~$5/month
- App Service F1 Free: $0
- Static Web Apps: $0
- **Total: ~$5/month**

**Production:**
- Azure SQL Database S0: ~$15/month
- App Service B1: ~$13/month
- Static Web Apps: $0
- **Total: ~$28/month**

## Important Notes

1. **Database Migration**: You'll need to run the SQL schema script manually in Azure SQL (see AZURE_DEPLOYMENT.md Step 2)

2. **Local Development**: Still works with SQLite - no changes needed

3. **CORS**: Make sure to update CORS settings in backend to include your Static Web App URL

4. **WebSockets**: Enable WebSockets in App Service Configuration for real-time leaderboard updates

5. **Firewall**: Add your IP and Azure services to Azure SQL firewall rules

## Troubleshooting

**Backend won't connect to database:**
- Check firewall rules in Azure SQL
- Verify connection string in App Service Configuration
- Ensure `DB_TYPE=azure_sql` is set

**Frontend can't reach backend:**
- Check CORS configuration
- Verify API URL in .env.production
- Check App Service is running

**Build fails:**
- Run `npm install` in both frontend and backend
- Check Node.js version (18 LTS recommended)

## Support

For detailed instructions, see:
- **AZURE_DEPLOYMENT.md** - Complete step-by-step guide
- **Azure Documentation** - https://docs.microsoft.com/azure

## Roll Back

To revert to local-only mode:
1. Don't set `DB_TYPE` environment variable
2. App will automatically use SQLite
3. All original functionality preserved
