const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const User = require('../models/User');
const Post = require('../models/Post'); // <-- ADDED FOR DELETING POSTS
const authMiddleware = require('../middleware/authMiddleware');

// ============================================================
// 1. MULTER SETUP (Reuse the 'images' folder)
// ============================================================
const uploadDir = path.join(__dirname, '../../images');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        cb(null, 'avatar_' + Date.now() + path.extname(file.originalname));
    }
});
const upload = multer({ storage });

// ============================================================
// 2. CONTROLLER FUNCTIONS (MOVED HERE)
// ============================================================
const getUserProfile = async (req, res) => {
    try {
        const user = await User.findById(req.params.id).select('-password');
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        res.status(200).json({
            success: true,
            user: user
        });
    } catch (error) {
        console.error('Get Profile Error:', error.message);
        if (error.kind === 'ObjectId') {
            return res.status(400).json({ error: 'Invalid User ID format' });
        }
        res.status(500).json({ error: 'Server error fetching user profile' });
    }
};

// ============================================================
// 3. ROUTES
// ============================================================

// @route   GET /api/users/me
// @desc    Get currently logged-in user data
// @access  Private
router.get('/me', authMiddleware, async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select('-password');
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        res.json({ success: true, user });
    } catch (error) {
        console.error('Get Me Error:', error.message);
        res.status(500).json({ error: 'Server error fetching profile' });
    }
});

// @route   PUT /api/users/avatar
// @desc    Upload profile picture
// @access  Private
router.put('/avatar', authMiddleware, upload.single('avatar'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }
        const user = await User.findById(req.user.id);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        user.avatar = req.file.filename;
        await user.save();
        res.json({ 
            success: true, 
            message: 'Profile photo updated successfully',
            avatar: req.file.filename 
        });
    } catch (error) {
        console.error('Avatar Upload Error:', error.message);
        res.status(500).json({ error: 'Server error uploading photo' });
    }
});

// @route   GET /api/users/:id
// @desc    Get a user profile by ID
// @access  Private
router.get('/:id', authMiddleware, getUserProfile);

// ============================================================
// ✅ NEW: DELETE ACCOUNT ROUTE
// ============================================================

// @route   DELETE /api/users/delete-account
// @desc    Delete the logged-in user's account and all their posts
// @access  Private
router.delete('/delete-account', authMiddleware, async (req, res) => {
    try {
        const userId = req.user.id;

        // 1. Find the user
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // 2. Delete all posts made by this user
        await Post.deleteMany({ user: userId });

        // 3. Delete the user account
        await User.findByIdAndDelete(userId);

        res.json({ 
            success: true, 
            message: 'Account and all associated posts deleted successfully.' 
        });
    } catch (error) {
        console.error('Delete Account Error:', error.message);
        res.status(500).json({ error: 'Server error deleting account' });
    }
});

module.exports = router;