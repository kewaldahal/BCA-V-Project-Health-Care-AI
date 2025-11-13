const express = require('express');
const cors = require('cors');
require('dotenv').config();
require('./database.js'); // Initializes DB connection

const authRoutes = require('./routes/authRoutes');
const aiRoutes = require('./routes/aiRoutes');
const authMiddleware = require('./middleware/auth');

const app = express();

app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Public routes
app.use('/auth', authRoutes);

// Protected routes
app.use('/ai', authMiddleware, aiRoutes);

app.get('/', (req, res) => {
    res.send('Health AI Backend is running!');
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});