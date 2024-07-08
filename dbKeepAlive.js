const db = require('./db');

async function keepAlive() {
    const keepAliveQuery = 'SELECT 1';
    
    try {
        await db.query(keepAliveQuery);
        console.log('Keep-alive query successful');
    } catch (err) {
        console.error('Keep-alive query failed:', err);
        // Attempt to reconnect
        db.handleDisconnect();
    }
}

// Run the keep-alive query every 5 minutes (adjust as needed)
const keepAliveInterval = 5 * 60 * 1000; // 5 minutes in milliseconds
setInterval(keepAlive, keepAliveInterval);

module.exports = keepAlive;