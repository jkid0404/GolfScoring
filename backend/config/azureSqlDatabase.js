const sql = require('mssql');
const { DefaultAzureCredential } = require('@azure/identity');
require('dotenv').config();

// Check if using Managed Identity (no username/password)
const useManagedIdentity = !process.env.DB_USER || !process.env.DB_PASSWORD;

let poolPromise;
let credential;

const getPool = async () => {
    if (!poolPromise) {
        let config;

        if (useManagedIdentity) {
            // Use Managed Identity (Azure AD authentication)
            // Get access token for Azure SQL Database
            if (!credential) {
                credential = new DefaultAzureCredential();
            }

            const tokenResponse = await credential.getToken('https://database.windows.net/.default');

            config = {
                server: process.env.DB_SERVER,
                database: process.env.DB_DATABASE,
                port: parseInt(process.env.DB_PORT) || 1433,
                authentication: {
                    type: 'azure-active-directory-access-token',
                    options: {
                        token: tokenResponse.token
                    }
                },
                options: {
                    encrypt: true,
                    trustServerCertificate: false,
                    enableArithAbort: true,
                    connectTimeout: 30000,
                    requestTimeout: 30000
                },
                pool: {
                    max: 10,
                    min: 0,
                    idleTimeoutMillis: 30000
                }
            };
        } else {
            // Use SQL authentication (username/password)
            config = {
                server: process.env.DB_SERVER,
                database: process.env.DB_DATABASE,
                user: process.env.DB_USER,
                password: process.env.DB_PASSWORD,
                port: parseInt(process.env.DB_PORT) || 1433,
                options: {
                    encrypt: true,
                    trustServerCertificate: false,
                    enableArithAbort: true,
                    connectTimeout: 30000,
                    requestTimeout: 30000
                },
                pool: {
                    max: 10,
                    min: 0,
                    idleTimeoutMillis: 30000
                }
            };
        }

        poolPromise = sql.connect(config);
    }
    return poolPromise;
};

const runQuery = async (query, params = []) => {
    try {
        const pool = await getPool();
        const request = pool.request();

        // Add parameters
        params.forEach((param, index) => {
            request.input(`param${index}`, param);
        });

        // Convert ? placeholders to @param0, @param1, etc.
        let azureQuery = query;
        params.forEach((_, index) => {
            azureQuery = azureQuery.replace('?', `@param${index}`);
        });

        // For INSERT queries, add OUTPUT clause to return the inserted ID
        if (azureQuery.trim().toUpperCase().startsWith('INSERT')) {
            // Check if OUTPUT clause already exists
            if (!azureQuery.toUpperCase().includes('OUTPUT')) {
                // Find the position to insert OUTPUT clause (before VALUES)
                const valuesMatch = azureQuery.match(/\)\s+VALUES\s+\(/i);
                if (valuesMatch) {
                    const insertPos = valuesMatch.index + valuesMatch[0].indexOf('VALUES');
                    azureQuery = azureQuery.slice(0, insertPos) + 'OUTPUT INSERTED.id ' + azureQuery.slice(insertPos);
                }
            }
        }

        const result = await request.query(azureQuery);
        return {
            id: result.recordset && result.recordset[0] ? result.recordset[0].id : null,
            changes: result.rowsAffected[0]
        };
    } catch (error) {
        console.error('Azure SQL query error:', error);
        throw error;
    }
};

const getQuery = async (query, params = []) => {
    try {
        const pool = await getPool();
        const request = pool.request();

        // Add parameters
        params.forEach((param, index) => {
            request.input(`param${index}`, param);
        });

        // Convert ? placeholders to @param0, @param1, etc.
        let azureQuery = query;
        params.forEach((_, index) => {
            azureQuery = azureQuery.replace('?', `@param${index}`);
        });

        const result = await request.query(azureQuery);
        return result.recordset[0] || null;
    } catch (error) {
        console.error('Azure SQL query error:', error);
        throw error;
    }
};

const allQuery = async (query, params = []) => {
    try {
        const pool = await getPool();
        const request = pool.request();

        // Add parameters
        params.forEach((param, index) => {
            request.input(`param${index}`, param);
        });

        // Convert ? placeholders to @param0, @param1, etc.
        let azureQuery = query;
        params.forEach((_, index) => {
            azureQuery = azureQuery.replace('?', `@param${index}`);
        });

        const result = await request.query(azureQuery);
        return result.recordset || [];
    } catch (error) {
        console.error('Azure SQL query error:', error);
        throw error;
    }
};

const initializeDatabase = async () => {
    console.log('Using Azure SQL Database');
    try {
        await getPool();
        console.log('Connected to Azure SQL Database');
        console.log('Note: Database schema should be created manually using the SQL script in AZURE_DEPLOYMENT.md');
        return Promise.resolve();
    } catch (error) {
        console.error('Azure SQL connection error:', error);
        return Promise.reject(error);
    }
};

module.exports = {
    getDatabase: getPool,
    runQuery,
    getQuery,
    allQuery,
    initializeDatabase
};
