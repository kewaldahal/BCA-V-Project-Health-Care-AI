const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../database.js');

const router = express.Router();
require('dotenv').config();

const JWT_SECRET = process.env.JWT_SECRET || 'your-default-super-secret-key';

// Register
router.post('/register', async (req, res) => {
    const { name, email, password, age, weight, medical_conditions, symptoms } = req.body;

    if (!name || !email || !password || !age || !weight) {
        return res.status(400).json({ "error": "Please provide all required fields." });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const sql = `INSERT INTO users (name, email, password, age, weight, medical_conditions, symptoms) VALUES (?,?,?,?,?,?,?)`;
    const params = [name, email, hashedPassword, age, weight, medical_conditions || '', symptoms || ''];

    db.run(sql, params, function (err, result) {
        if (err) {
            res.status(400).json({ "error": "Email already registered." });
            return;
        }

        const user = { id: this.lastID, email: email, name: name };
        const token = jwt.sign(user, JWT_SECRET, { expiresIn: '1d' });

        res.json({
            message: "success",
            token,
            user,
        });
    });
});

// Login
router.post('/login', (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ "error": "Please provide email and password." });
    }

    const sql = "SELECT * FROM users WHERE email = ?";
    db.get(sql, [email], async (err, user) => {
        if (err) {
            return res.status(400).json({ "error": err.message });
        }
        if (!user) {
            return res.status(400).json({ "error": "Invalid credentials" });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ "error": "Invalid credentials" });
        }
        
        const payload = { id: user.id, email: user.email, name: user.name };
        const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '1d' });

        res.json({
            message: "success",
            token,
            user: payload,
        });
    });
});

module.exports = router;
