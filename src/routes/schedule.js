const express = require('express');

const router = express.Router();

const DAYS_ORDER = {
  Saturday: 0,
  Sunday: 1,
  Monday: 2,
  Tuesday: 3,
  Wednesday: 4,
  Thursday: 5,
  Friday: 6,
};

const parseBookingData = (bookingData) => {
  const [day, time] = bookingData.split('|');
  return { day, time };
};

// POST /schedule
router.post('/', async (req, res) => {
  try {
    const { role, coach_id, swimmer_id, logged_coach_id, logged_swimmer_id } = req.body;
    const db = req.db;

    // ── COACH: can only view their own schedule ───────────────────────────────
    if (role === 'coach') {
      if (!logged_coach_id) {
        return res.status(400).json({ status: 'error', message: 'logged_coach_id is required' });
      }

      // Prevent coach from viewing another coach's schedule
      if (coach_id && parseInt(coach_id) !== parseInt(logged_coach_id)) {
        return res.status(403).json({ status: 'error', message: 'You can only view your own schedule' });
      }

      const resolvedCoachId = parseInt(logged_coach_id);

      const [teams] = await db.query(`
        SELECT t.team_name, t.day, t.time, c.first_name, c.last_name
        FROM team t
        JOIN coach c ON t.coach_id = c.id
        WHERE t.coach_id = ?
        ORDER BY t.day ASC, t.time ASC
      `, [resolvedCoachId]);

      const [bookings] = await db.query(`
        SELECT b.booking_data, b.status,
          sw.first_name, sw.last_name, sw.gender, sw.age, sw.level
        FROM booking b
        JOIN swimmer sw ON b.swimmer_id = sw.id
        WHERE b.coach_id = ?
      `, [resolvedCoachId]);

      let classesSchedule = bookings.map(b => ({
        day: parseBookingData(b.booking_data).day,
        time: parseBookingData(b.booking_data).time,
        gender: b.gender,
        name: `${b.first_name} ${b.last_name}`,
        age: b.age,
        level: b.level,
        status: b.status,
      }));

      classesSchedule.sort((a, b) => {
        const dc = DAYS_ORDER[a.day] - DAYS_ORDER[b.day];
        return dc !== 0 ? dc : a.time.localeCompare(b.time);
      });

      return res.status(200).json({
        status: 'success',
        role: 'coach',
        data: {
          teams_schedule: teams.map(t => ({
            team_name: t.team_name,
            day: t.day,
            time: t.time,
            coach_name: `${t.first_name} ${t.last_name}`,
          })),
          classes_schedule: classesSchedule,
        },
      });
    }

    // ── SWIMMER: can only view their own schedule ─────────────────────────────
    if (role === 'swimmer') {
      if (!logged_swimmer_id) {
        return res.status(400).json({ status: 'error', message: 'logged_swimmer_id is required' });
      }

      // Prevent swimmer from viewing another swimmer's schedule
      if (swimmer_id && parseInt(swimmer_id) !== parseInt(logged_swimmer_id)) {
        return res.status(403).json({ status: 'error', message: 'You can only view your own schedule' });
      }

      const resolvedSwimmerId = parseInt(logged_swimmer_id);

      const [bookings] = await db.query(`
        SELECT b.id, b.booking_data, b.status,
          c.id AS coach_id, c.first_name, c.last_name
        FROM booking b
        JOIN coach c ON b.coach_id = c.id
        WHERE b.swimmer_id = ?
      `, [resolvedSwimmerId]);

      const schedule = bookings.map(b => ({
        id: b.id,
        day: parseBookingData(b.booking_data).day,
        time: parseBookingData(b.booking_data).time,
        status: b.status,
        coach_name: `${b.first_name} ${b.last_name}`,
        coach_id: b.coach_id,
      }));

      schedule.sort((a, b) => {
        const dc = DAYS_ORDER[a.day] - DAYS_ORDER[b.day];
        return dc !== 0 ? dc : a.time.localeCompare(b.time);
      });

      const coachNames = [...new Set(schedule.map(s => s.coach_name))];
      const coachNameDisplay = coachNames.length > 0 ? coachNames.join(', ') : 'Not assigned yet';

      return res.status(200).json({
        status: 'success',
        role: 'swimmer',
        data: {
          coach_name: coachNameDisplay,
          coaches: coachNames,
          schedule,
        },
      });
    }

    // ── MANAGER: can view any coach or swimmer schedule ───────────────────────
    if (role === 'manager') {
      if (coach_id) {
        const [teams] = await db.query(`
          SELECT t.team_name, t.day, t.time, c.first_name, c.last_name
          FROM team t
          JOIN coach c ON t.coach_id = c.id
          WHERE t.coach_id = ?
          ORDER BY t.day ASC, t.time ASC
        `, [parseInt(coach_id)]);

        const [bookings] = await db.query(`
          SELECT b.booking_data, b.status,
            sw.first_name, sw.last_name, sw.gender, sw.age, sw.level
          FROM booking b
          JOIN swimmer sw ON b.swimmer_id = sw.id
          WHERE b.coach_id = ?
        `, [parseInt(coach_id)]);

        let classesSchedule = bookings.map(b => ({
          day: parseBookingData(b.booking_data).day,
          time: parseBookingData(b.booking_data).time,
          gender: b.gender,
          name: `${b.first_name} ${b.last_name}`,
          age: b.age,
          level: b.level,
          status: b.status,
        }));

        classesSchedule.sort((a, b) => {
          const dc = DAYS_ORDER[a.day] - DAYS_ORDER[b.day];
          return dc !== 0 ? dc : a.time.localeCompare(b.time);
        });

        return res.status(200).json({
          status: 'success',
          role: 'coach',
          data: {
            teams_schedule: teams.map(t => ({
              team_name: t.team_name,
              day: t.day,
              time: t.time,
              coach_name: `${t.first_name} ${t.last_name}`,
            })),
            classes_schedule: classesSchedule,
          },
        });
      }

      if (swimmer_id) {
        const [bookings] = await db.query(`
          SELECT b.id, b.booking_data, b.status,
            c.id AS coach_id, c.first_name, c.last_name
          FROM booking b
          JOIN coach c ON b.coach_id = c.id
          WHERE b.swimmer_id = ?
        `, [parseInt(swimmer_id)]);

        const schedule = bookings.map(b => ({
          id: b.id,
          day: parseBookingData(b.booking_data).day,
          time: parseBookingData(b.booking_data).time,
          status: b.status,
          coach_name: `${b.first_name} ${b.last_name}`,
          coach_id: b.coach_id,
        }));

        schedule.sort((a, b) => {
          const dc = DAYS_ORDER[a.day] - DAYS_ORDER[b.day];
          return dc !== 0 ? dc : a.time.localeCompare(b.time);
        });

        const coachNames = [...new Set(schedule.map(s => s.coach_name))];

        return res.status(200).json({
          status: 'success',
          role: 'swimmer',
          data: {
            coach_name: coachNames.length > 0 ? coachNames.join(', ') : 'Not assigned yet',
            coaches: coachNames,
            schedule,
          },
        });
      }

      return res.status(400).json({ status: 'error', message: 'Please provide either coach_id or swimmer_id' });
    }

    return res.status(403).json({ status: 'error', message: 'Unauthorized' });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ status: 'error', message: error.message });
  }
});

module.exports = router;
