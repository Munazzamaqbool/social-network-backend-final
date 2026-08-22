const jwt = require('jsonwebtoken');

module.exports = (req, res, next) => {
    // 1. Get the token from the Authorization header
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Access denied. No token provided.' });
    }

    const token = authHeader.split(' ')[1]; // Extract just the token part

    try {
        // 2. Verify the token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        // 3. Attach the user data to the request object
        req.user = decoded; 
        
        next(); // Pass control to the next function (the actual route)
    } catch (error) {
        return res.status(401).json({ error: 'Invalid or expired token' });
    }
};