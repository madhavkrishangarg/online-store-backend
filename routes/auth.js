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

router.post('/new_user', async (req, res) => {
//     userID,int,NO,PRI,,auto_increment
// first_name,varchar(20),NO,"",,""
// last_name,varchar(20),YES,"",,""
// user_address,varchar(50),NO,"",,""
// email_id,varchar(20),NO,UNI,,""
// phone_number,bigint,NO,UNI,,""
// pass,varchar(65),NO,"",,""
// privilege_status,varchar(10),NO,"",normal,""

    const { first_name, last_name, user_address, email_id, phone_number, pass, priviledge_status } = req.body;

    db.query(
        `INSERT INTO user (first_name, last_name, user_address, email_id, phone_number, pass, privilege_status) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [first_name, last_name, user_address, email_id, phone_number, pass, priviledge_status],
        (err, results) => {
            if (err) {
                console.error('Database error:', err);
                return res.status(500).send('Internal server error');
            }
            res.send({ userID: results.insertId });
        }
    );
    db.query("Commit;")
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
