const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// ============================================================
// REGISTER FUNCTION
// ============================================================
const register = async (req, res) => {
    try {
        const { username, email, password } = req.body;

        if (!username || !email || !password) {
            return res.status(400).json({ error: 'Please provide all required fields' });
        }

        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ error: 'User with this email already exists' });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const user = new User({
            username,
            email,
            password: hashedPassword,
        });

        await user.save();

        res.status(201).json({
            success: true,
            message: 'User registered successfully',
            data: {
                id: user._id,
                username: user.username,
                email: user.email,
                createdAt: user.createdAt,
            },
        });
    } catch (error) {
        console.error('Registration Error Details:', error);

        if (error.code === 11000) {
            const field = Object.keys(error.keyPattern)[0];
            return res.status(400).json({ 
                error: `This ${field} is already taken. Please use a different one.` 
            });
        }

        if (error.name === 'ValidationError') {
            const errors = Object.values(error.errors).map((val) => val.message);
            return res.status(400).json({ error: errors.join(', ') });
        }

        res.status(500).json({ error: 'Internal Server Error during registration' });
    }
};

// ============================================================
// LOGIN FUNCTION
// ============================================================
const login = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ error: 'Please provide email and password' });
        }

        const user = await User.findOne({ email }).select('+password');
        
        if (!user) {
            return res.status(401).json({ error: 'Invalid credentials (email)' });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ error: 'Invalid credentials (password)' });
        }

        const token = jwt.sign(
            { 
                id: user._id, 
                username: user.username,
                email: user.email 
            }, 
            process.env.JWT_SECRET, 
            { expiresIn: '1d' } 
        );

        res.status(200).json({
            success: true,
            message: 'Login successful',
            token, 
            data: {
                id: user._id,
                username: user.username,
                email: user.email,
            },
        });
    } catch (error) {
        console.error('Login Error:', error.message);
        res.status(500).json({ error: 'Internal Server Error during login' });
    }
};

// ============================================================
// EXPORT
// ============================================================
module.exports = { register, login };