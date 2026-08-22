const express = require('express');
const router = express.Router();
const User = require('../models/User');
const authMiddleware = require('../middleware/authMiddleware');

// @route   POST /api/friends/request/:userId
// @desc    Send a friend request
router.post('/request/:userId', authMiddleware, async (req, res) => {
    try {
        if (req.params.userId === req.user.id) {
            return res.status(400).json({ error: 'You cannot add yourself' });
        }

        const targetUser = await User.findById(req.params.userId);
        const currentUser = await User.findById(req.user.id);

        if (!targetUser) return res.status(404).json({ error: 'User not found' });

        // Check if already friends or already requested
        if (targetUser.friends.includes(req.user.id)) {
            return res.status(400).json({ error: 'Already friends' });
        }
        if (targetUser.friendRequests.includes(req.user.id)) {
            return res.status(400).json({ error: 'Request already sent' });
        }

        targetUser.friendRequests.push(req.user.id);
        await targetUser.save();

        res.json({ success: true, message: 'Friend request sent!' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// @route   POST /api/friends/accept/:userId
// @desc    Accept a friend request
router.post('/accept/:userId', authMiddleware, async (req, res) => {
    try {
        const currentUser = await User.findById(req.user.id);
        const requester = await User.findById(req.params.userId);

        if (!requester) return res.status(404).json({ error: 'User not found' });

        // Remove from requests list
        currentUser.friendRequests = currentUser.friendRequests.filter(
            id => id.toString() !== req.params.userId
        );

        // Add to friends lists (both ways)
        currentUser.friends.push(req.params.userId);
        requester.friends.push(req.user.id);

        await currentUser.save();
        await requester.save();

        res.json({ success: true, message: 'Friend request accepted!' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// @route   GET /api/friends/search/:username
// @desc    Search for users by username
router.get('/search/:username', authMiddleware, async (req, res) => {
    try {
        const users = await User.find({
            username: { $regex: req.params.username, $options: 'i' },
            _id: { $ne: req.user.id } // Exclude yourself
        }).select('username email');
        res.json({ success: true, users });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// @route   GET /api/friends/requests
// @desc    Get incoming friend requests
router.get('/requests', authMiddleware, async (req, res) => {
    try {
        const user = await User.findById(req.user.id)
            .populate('friendRequests', 'username email');
        res.json({ success: true, requests: user.friendRequests });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;