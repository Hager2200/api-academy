require('dotenv').config();
const express = require('express');
const cors = require('cors');
const db = require('./db');

// Routes
const authRoutes = require('./routes/auth');
const bookingsRoutes = require('./routes/bookings');
const classesRoutes = require('./routes/classes');
const teamsRoutes = require('./routes/teams');
const coachRoutes = require('./routes/coach');
const scheduleRoutes = require('./routes/schedule');

const app = express();

app.use(cors());
app.use(express.json());

// Make db available to routes
app.use((req, res, next) => {
    req.db = db;
    next();
});

// API Documentation (root)
app.get('/', (req, res) => {
    res.json({
        status: 'success',
        message: 'Welcome to Swim Academy API',
        roles: {
            manager: 'Full access to all data',
            coach: 'Can update/delete bookings for their swimmers',
            swimmer: 'Can add, update, delete own bookings'
        }
    });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/bookings', bookingsRoutes);
app.use('/api/classes', classesRoutes);
app.use('/api/teams', teamsRoutes);
app.use('/api/coach', coachRoutes);
app.use('/api/schedule', scheduleRoutes);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});