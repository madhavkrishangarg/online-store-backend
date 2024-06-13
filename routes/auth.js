const express = require('express');
const router = express.Router();
const db = require('../db');
const bcrypt = require('bcrypt');

router.post('/auth_cust', async (req, res) => {
    const { email, password } = req.body;
    db.query(
        `SELECT userID, pass FROM user WHERE email_id = ?`,
        [email],

        async (err, results) => {
            if (err) {
                console.error('Database error:', err);
                return res.status(500).send('Internal server error');
            }
            if (results.length > 0) {
                const user = results[0];
                const match = await bcrypt.compare(password, user.pass);
                if (match) {
                    res.send({ userID: user.userID });
                } else {
                    res.status(401).send('Invalid username or password');
                }
            } else {
                res.status(401).send('Invalid username or password');
            }
        }
    );
});

router.post('/auth_admin', async (req, res) => {
    const { username, password } = req.body;

    db.query(
        `SELECT adminID, pass FROM admin WHERE username = ?`,
        [username],
        async (err, results) => {
            if (err) {
                console.error('Database error:', err);
                return res.status(500).send('Internal server error');
            }
            if (results.length > 0) {
                const admin = results[0];
                const match = await bcrypt.compare(password, admin.pass);
                if (match) {
                    res.send({ adminID: admin.adminID });
                } else {
                    res.status(401).send('Invalid username or password');
                }
            } else {
                res.status(401).send('Invalid username or password');
            }
        }
    );
});

module.exports = router;
