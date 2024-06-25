const mysql = require('mysql2');
require('dotenv').config();

const db = mysql.createConnection({
    host: process.env.RAILWAY_MYSQL_HOST,
    port: process.env.RAILWAY_MYSQL_PORT,
    user: process.env.RAILWAY_MYSQL_USER,
    password: process.env.RAILWAY_MYSQL_PASSWORD,
    database: process.env.RAILWAY_MYSQL_DATABASE,
});

db.connect(err => {
    if (err) {
        console.error('Database connection failed: ' + err.stack);
        return;
    }
    console.log('Connected to Railway MySQL database.');
});

module.exports = db;
