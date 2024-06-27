const mysql = require('mysql2');
require('dotenv').config();

let db;

function handleDisconnect() {
    db = mysql.createConnection({
        host: process.env.RAILWAY_MYSQL_HOST,
        port: process.env.RAILWAY_MYSQL_PORT || NaN,
        user: process.env.RAILWAY_MYSQL_USER,
        password: process.env.RAILWAY_MYSQL_PASSWORD,
        database: process.env.RAILWAY_MYSQL_DATABASE,
    });

    db.connect(err => {
        if (err) {
            console.error('Error connecting to database:', err.stack);
            setTimeout(handleDisconnect, 2000);
        } else {
            console.log(`Connected to database as ID ${db.threadId}`);
        }
    });

    db.on('error', err => {
        console.error('Database error:', err);
        if (err.code === 'PROTOCOL_CONNECTION_LOST') {
            handleDisconnect(); // Reconnect on connection loss
        } else {
            throw err;
        }
    });
}

handleDisconnect();

module.exports = db;
