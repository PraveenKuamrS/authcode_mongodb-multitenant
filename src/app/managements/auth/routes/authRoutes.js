// auth Routes
"use strict";

const express = require('express');
const authService = require('../services/authService');
const router = express.Router();

const prefix = '/api/auth'

router.post(`${prefix}/register`, async (req, res) => {
    try {
        await authService.registerWithEmail(req, res);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;
