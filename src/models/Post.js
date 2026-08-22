const mongoose = require('mongoose');

const postSchema = new mongoose.Schema({
    content: { type: String, required: true, maxlength: 500 },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    image: { type: String, default: null },
    // ✅ NEW: Privacy Field (Default is 'public')
    privacy: { 
        type: String, 
        enum: ['public', 'friends'], 
        default: 'public' 
    },
    likes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    comments: [{
        user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
        text: { type: String, required: true },
        createdAt: { type: Date, default: Date.now }
    }]
}, { timestamps: true });

module.exports = mongoose.model('Post', postSchema);