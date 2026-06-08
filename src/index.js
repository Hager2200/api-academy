require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
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
const attendanceRoutes = require('./routes/attendance');
const usersRoutes = require('./routes/users'); // 👈 السطر الأول اللي اتضاف هنا

// Middleware
const authenticate = require('./middleware/authenticate');

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

// Public routes (no auth needed)
app.use('/api/auth', authRoutes);

// Protected routes (JWT required)
app.use('/api/bookings',   authenticate, bookingsRoutes);
app.use('/api/classes',    authenticate, classesRoutes);
app.use('/api/teams',      authenticate, teamsRoutes);
app.use('/api/coach',      authenticate, coachRoutes);
app.use('/api/schedule',   authenticate, scheduleRoutes);
app.use('/api/attendance', authenticate, attendanceRoutes);
app.use('/api/users',      authenticate, usersRoutes); // 👈 السطر التاني اللي اتضاف هنا

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});