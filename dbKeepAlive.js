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


const keepAliveInterval = 2 * 60 * 1000;
setInterval(keepAlive, keepAliveInterval);

module.exports = keepAlive;