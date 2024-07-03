const db = require('./db');

function keepAlive() {
    const keepAliveQuery = 'SELECT 1';
    
    db.query(keepAliveQuery, (err) => {
        if (err) {
            console.error('Keep-alive query failed:', err);
        } else {
            console.log('Keep-alive query successful');
        }
    });
}

// Run the keep-alive query every 5 minutes (adjust as needed)
const keepAliveInterval = 5 * 60 * 1000; // 5 minutes in milliseconds
setInterval(keepAlive, keepAliveInterval);

module.exports = keepAlive;