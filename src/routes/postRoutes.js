const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const Post = require('../models/Post');
const User = require('../models/User');
const Notification = require('../models/Notification'); // Added for Notifications
const authMiddleware = require('../middleware/authMiddleware');

// =================================================================
// 1. CREATE 'images' FOLDER AT THE BACKEND ROOT
// =================================================================
const uploadDir = path.join(__dirname, '../../images');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

// =================================================================
// 2. MULTER SETUP
// =================================================================
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + path.extname(file.originalname));
    }
});
const upload = multer({ storage });

// =================================================================
// 3. SOCKET.IO SETUP
// =================================================================
let ioInstance;
const setSocketInstance = (io) => {
    ioInstance = io;
};

// ---------------------------------------------------------
// CREATE POST (UPDATED WITH PRIVACY)
// ---------------------------------------------------------
router.post('/create', authMiddleware, upload.single('image'), async (req, res) => {
    try {
        const { content, privacy } = req.body; 
        let filename = null;
        if (req.file) {
            filename = req.file.filename;
        }

        const newPost = new Post({
            content: content || '',
            image: filename,
            privacy: privacy || 'public',
            user: req.user.id
        });

        await newPost.save();
        await newPost.populate('user', '_id username email avatar');

        if (ioInstance) {
            ioInstance.emit('receive_post', newPost);
        }

        res.status(201).json({
            success: true,
            message: 'Post created successfully',
            post: newPost
        });

    } catch (error) {
        console.error('❌ ERROR:', error.message);
        res.status(500).json({ error: error.message });
    }
});

// ---------------------------------------------------------
// GET POSTS (UPDATED WITH PRIVACY FILTER)
// ---------------------------------------------------------
router.get('/', authMiddleware, async (req, res) => {
    try {
        const currentUser = await User.findById(req.user.id);
        const allPosts = await Post.find()
            .sort({ createdAt: -1 })
            .populate('user', '_id username email avatar')
            .populate('comments.user', 'username email avatar');

        // Filter posts based on privacy
        const visiblePosts = allPosts.filter(post => {
            if (post.privacy === 'public') return true;
            if (post.privacy === 'friends') {
                const isFriend = currentUser.friends.some(friendId => 
                    friendId.toString() === post.user._id.toString()
                );
                return isFriend || post.user._id.toString() === req.user.id;
            }
            return false;
        });

        res.json({ success: true, count: visiblePosts.length, posts: visiblePosts });
    } catch (error) {
        console.error('Get Posts Error:', error.message);
        res.status(500).json({ error: 'Server error fetching posts' });
    }
});

// ---------------------------------------------------------
// LIKE POST (UPDATED WITH NOTIFICATION)
// ---------------------------------------------------------
router.put('/:id/like', authMiddleware, async (req, res) => {
    const post = await Post.findById(req.params.id).populate('user');
    if (!post) return res.status(404).json({ error: 'Post not found' });
    
    const isLiked = post.likes.some(id => id.toString() === req.user.id);
    
    if (isLiked) {
        post.likes = post.likes.filter(id => id.toString() !== req.user.id);
    } else {
        post.likes.push(req.user.id);
        if (post.user._id.toString() !== req.user.id) {
            const notification = new Notification({
                recipient: post.user._id,
                sender: req.user.id,
                type: 'like',
                postId: post._id
            });
            await notification.save();
            if (ioInstance) {
                ioInstance.to(post.user._id.toString()).emit('new_notification', notification);
            }
        }
    }
    await post.save();
    res.json({ success: true, likesCount: post.likes.length });
});

// ---------------------------------------------------------
// COMMENT POST (UPDATED WITH NOTIFICATION)
// ---------------------------------------------------------
router.post('/:id/comment', authMiddleware, async (req, res) => {
    const { text } = req.body;
    if (!text) return res.status(400).json({ error: 'Comment text is required' });
    const post = await Post.findById(req.params.id).populate('user');
    if (!post) return res.status(404).json({ error: 'Post not found' });
    post.comments.push({ user: req.user.id, text });
    await post.save();
    await post.populate('comments.user', 'username email');
    
    if (post.user._id.toString() !== req.user.id) {
        const notification = new Notification({
            recipient: post.user._id,
            sender: req.user.id,
            type: 'comment',
            postId: post._id
        });
        await notification.save();
        if (ioInstance) {
            ioInstance.to(post.user._id.toString()).emit('new_notification', notification);
        }
    }

    if (ioInstance) {
        const newComment = post.comments[post.comments.length - 1];
        ioInstance.emit('receive_comment', { postId: req.params.id, comment: newComment });
    }

    res.status(201).json({ success: true, comments: post.comments });
});

// ---------------------------------------------------------
// DELETE POST
// ---------------------------------------------------------
router.delete('/:id', authMiddleware, async (req, res) => {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ error: 'Post not found' });
    if (post.user.toString() !== req.user.id) {
        return res.status(403).json({ error: 'Not authorized' });
    }
    await post.deleteOne();
    res.json({ success: true, message: 'Post deleted' });
});

// =================================================================
// 4. EXPORT
// =================================================================
module.exports = { router, setSocketInstance };