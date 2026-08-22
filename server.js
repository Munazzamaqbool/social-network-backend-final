const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const http = require('http');
const { Server } = require('socket.io');
require('dotenv').config();

// 1. IMPORT ROUTES
const authRoutes = require('./src/routes/authRoutes');
const { router: postRoutes, setSocketInstance } = require('./src/routes/postRoutes');
const userRoutes = require('./src/routes/userRoutes');
const friendRoutes = require('./src/routes/friendRoutes');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "http://localhost:5173",
    methods: ["GET", "POST", "PUT", "DELETE"]
  }
});

// Middleware
app.use(express.json());
app.use(cors());

// Serve images
app.use('/images', express.static(path.join(__dirname, 'images'), {
  setHeaders: (res) => {
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
  }
}));

// Database Connection
const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ MongoDB Connected Successfully');
    } catch (error) {
        console.error('❌ MongoDB Connection Error:', error.message);
        process.exit(1);
    }
};
connectDB();

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/posts', postRoutes);
app.use('/api/users', userRoutes);
app.use('/api/friends', friendRoutes);

// Test Route
app.get('/', (req, res) => {
    res.send('Backend API is running successfully!');
});

// ============================================================
// ✅ SOCKET.IO REAL-TIME LOGIC (With Private Rooms)
// ============================================================
io.on('connection', (socket) => {
  console.log('🔗 A user connected:', socket.id);

  // Join a private room based on user ID (for notifications)
  socket.on('join_notifications', (userId) => {
    socket.join(userId);
    console.log(`📩 User ${userId} joined their notification room`);
  });

  // Broadcast new posts to everyone else
  socket.on('new_post', (postData) => {
    socket.broadcast.emit('receive_post', postData);
  });

  // Broadcast new comments to everyone else
  socket.on('new_comment', (commentData) => {
    socket.broadcast.emit('receive_comment', commentData);
  });

  socket.on('disconnect', () => {
    console.log('❌ A user disconnected:', socket.id);
  });
});

// PASS THE SOCKET INSTANCE TO THE ROUTES
setSocketInstance(io); 

// Start Server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
});