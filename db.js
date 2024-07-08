const mysql = require('mysql2/promise');
require('dotenv').config();

let pool;

async function createPool() {
    return mysql.createPool({
        host: process.env.RAILWAY_MYSQL_HOST,
        port: process.env.RAILWAY_MYSQL_PORT || 3306,
        user: process.env.RAILWAY_MYSQL_USER,
        password: process.env.RAILWAY_MYSQL_PASSWORD,
        database: process.env.RAILWAY_MYSQL_DATABASE,
        connectionLimit: 10,
        queueLimit: 0,
        waitForConnections: true,
        enableKeepAlive: true,
        keepAliveInitialDelay: 0,
    });
}

async function handleDisconnect() {
    try {
        pool = await createPool();
        console.log('Successfully connected to the database. :', pool);
    } catch (err) {
        console.error('Failed to connect to the database:', err);
        setTimeout(handleDisconnect, 2000);
    }
}

handleDisconnect();

module.exports = {
    query: async (sql, params) => {
        if (!pool) {
            throw new Error('Database connection not established');
        }
        try {
            const [results] = await pool.execute(sql, params);
            return results;
        } catch (error) {
            console.error('Database query error:', error);
            throw error;
        }
    },
    handleDisconnect,
};