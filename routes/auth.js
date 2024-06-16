const express = require('express');
const router = express.Router();
const db = require('../db');
const bcrypt = require('bcrypt');
const { body, validationResult } = require('express-validator'); // For input validation

router.post('/auth_cust', [
    body('email').isEmail(),
    body('password').isLength({ min: 6 })
], async (req, res) => {
    // Validate inputs
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

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

router.post('/new_user', [
    body('first_name').not().isEmpty().trim().escape(),
    body('last_name').not().isEmpty().trim().escape(),
    body('user_address').not().isEmpty().trim().escape(),
    body('email_id').isEmail(),
    body('phone_number').isMobilePhone(),
    body('pass').isLength({ min: 6 }),
    body('priviledge_status')
], async (req, res) => {

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const { first_name, last_name, user_address, email_id, phone_number, pass, priviledge_status } = req.body;

    try {
        const hashedPass = await bcrypt.hash(pass, 10);

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
                return res.send({ userID: results.insertId });
            }
        );
    } catch (error) {
        console.error('Error in new_user:', error);
        return res.status(500).send({ status: 500, message: 'Internal server error' });
    }
});


router.post('/auth_admin', [
    body('username').not().isEmpty().trim().escape(),
    body('password').isLength({ min: 6 })
], async (req, res) => {
    // Validate inputs
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

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