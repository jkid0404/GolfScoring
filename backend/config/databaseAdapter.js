require('dotenv').config();

const dbType = process.env.DB_TYPE || 'sqlite';

let database;

if (dbType === 'azure_sql') {
    database = require('./azureSqlDatabase');
} else {
    database = require('./database');
}

module.exports = database;
