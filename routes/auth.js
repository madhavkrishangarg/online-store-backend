const express = require('express');
const router = express.Router();
const db = require('../db');
const bcrypt = require('bcrypt');

router.post('/auth_cust', async (req, res) => {
    console.log("Request from frontend", req.body);
    const { email, password } = req.body;

    try {
        db.query(
            `SELECT userID, pass FROM user WHERE email_id = ?`,
            [email],
            async (err, results) => {
                if (err) {
                    console.error('Database error:', err);
                    return res.status(500).send({ status: 500, message: 'Internal server error' });
                }

                if (results.length > 0) {
                    const user = results[0];
                    const match = await bcrypt.compare(password, user.pass);
                    console.log("Match", match);
                    if (match) {
                        return res.send({ userID: user.userID });
                    } else {
                        return res.status(401).send({ status: 401, message: 'Invalid username or password' });
                    }
                } else {
                    return res.status(401).send({ status: 401, message: 'Invalid username or password' });
                }
            }
        );
    } catch (error) {
        console.error('Error in auth_cust:', error);
        return res.status(500).send({ status: 500, message: 'Internal server error' });
    }
});

router.post('/new_user', async (req, res) => {
    console.log("Request from frontend", req.body);

    const { first_name, last_name, user_address, email_id, phone_number, pass, priviledge_status } = req.body;
    const hashedPass = await bcrypt.hash(pass, 10);

    try {
        db.query(
            `INSERT INTO user (first_name, last_name, user_address, email_id, phone_number, pass, privilege_status) VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [first_name, last_name, user_address, email_id, phone_number, hashedPass, priviledge_status],
            (err, results) => {
                if (err) {
                    if (err.errno === 1062) {
                        return res.status(409).send({ status: 409, message: 'Email or phone number already in use' });
                    } else {
                        console.error('Database error:', err);
                        return res.status(500).send({ status: 500, message: 'Internal server error' });
                    }
                }
                console.log("Results", results);
                return res.send({ userID: results.insertId });
            }
        );
        db.query("COMMIT;");
    } catch (error) {
        console.error('Error in new_user:', error);
        return res.status(500).send({ status: 500, message: 'Internal server error' });
    }
});

router.post('/auth_admin', async (req, res) => {
    console.log("Request from frontend", req.body);
    const { username, password } = req.body;

    try {
        db.query(
            `SELECT adminID, pass FROM admin WHERE username = ?`,
            [username],
            async (err, results) => {
                if (err) {
                    console.error('Database error:', err);
                    return res.status(500).send({ status: 500, message: 'Internal server error' });
                }

                if (results.length > 0) {
                    const admin = results[0];
                    const match = await bcrypt.compare(password, admin.pass);
                    console.log("Match", match);
                    if (match) {
                        return res.send({ adminID: admin.adminID });
                    } else {
                        return res.status(401).send({ status: 401, message: 'Invalid username or password' });
                    }
                } else {
                    return res.status(401).send({ status: 401, message: 'Invalid username or password' });
                }
            }
        );
    } catch (error) {
        console.error('Error in auth_admin:', error);
        return res.status(500).send({ status: 500, message: 'Internal server error' });
    }
});

module.exports = router;
