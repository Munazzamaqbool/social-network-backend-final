// src/middleware/auth.js
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const auth = async (req, res, next) => {
    try {
        // Get token from header
        const token = req.header('Authorization')?.replace('Bearer ', '');

        if (!token) {
            return res.status(401).json({ 
                error: 'No token provided. Please login.' 
            });
        }

        // Verify token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        // Find user
        const user = await User.findById(decoded.userId)
            .select('-password');

        if (!user) {
            return res.status(401).json({ 
                error: 'User not found. Please login again.' 
            });
        }

        // Attach user to request
        req.user = user;
        req.token = token;
        next();

    } catch (error) {
        console.error('Auth error:', error);
        
        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({ error: 'Invalid token' });
        }
        
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({ error: 'Token expired. Please login again.' });
        }

        res.status(401).json({ error: 'Please authenticate' });
    }
};

module.exports = auth;