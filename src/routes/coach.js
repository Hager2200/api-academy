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

// GET /coach/list — manager only
router.get('/list', async (req, res) => {
  try {
    const { role } = req.query;
    const db = req.db;

    if (role !== 'manager') {
      return res.status(403).json({ status: 'error', message: 'Unauthorized: Only manager can view coaches' });
    }

    const [coaches] = await db.query(`SELECT id, first_name, last_name FROM coach ORDER BY first_name ASC`);
    const formatted = coaches.map(c => ({ id: c.id, name: `${c.first_name} ${c.last_name}` }));

    return res.status(200).json({ status: 'success', data: formatted });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ status: 'error', message: error.message });
  }
});

// GET /coach/days — manager & coach only
router.get('/days', async (req, res) => {
  try {
    const { role } = req.query;

    if (role !== 'manager' && role !== 'coach') {
      return res.status(403).json({ status: 'error', message: 'Unauthorized' });
    }

    const days = ['Saturday', 'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
    return res.status(200).json({ status: 'success', data: days });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ status: 'error', message: error.message });
  }
});

// GET /coach/times — manager & coach only
router.get('/times', async (req, res) => {
  try {
    const { role } = req.query;

    if (role !== 'manager' && role !== 'coach') {
      return res.status(403).json({ status: 'error', message: 'Unauthorized' });
    }

    const times = ['8 AM', '9 AM', '10 AM', '11 AM', '12 PM', '1 PM', '2 PM', '3 PM', '4 PM', '5 PM', '6 PM', '7 PM', '8 PM'];
    return res.status(200).json({ status: 'success', data: times });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ status: 'error', message: error.message });
  }
});

// GET /coach/availability — manager (any coach) | coach (own only)
router.get('/availability', async (req, res) => {
  try {
    const { role, coach_id, logged_coach_id } = req.query;
    const db = req.db;

    // Swimmer blocked entirely
    if (role === 'swimmer') {
      return res.status(403).json({ status: 'error', message: 'Unauthorized' });
    }

    if (role !== 'manager' && role !== 'coach') {
      return res.status(403).json({ status: 'error', message: 'Unauthorized' });
    }

    if (!coach_id) {
      return res.status(400).json({ status: 'error', message: 'coach_id is required' });
    }

    // Coach can only view their own availability
    if (role === 'coach' && parseInt(coach_id) !== parseInt(logged_coach_id)) {
      return res.status(403).json({ status: 'error', message: 'Coach can only view their own availability' });
    }

    const [availability] = await db.query(
      `SELECT * FROM coach_availability WHERE coach_id = ? ORDER BY working_day ASC, working_time ASC`,
      [parseInt(coach_id)]
    );

    const grouped = {};
    for (const avail of availability) {
      if (!grouped[avail.working_day]) grouped[avail.working_day] = [];
      grouped[avail.working_day].push(avail.working_time);
    }

    const sortedGrouped = {};
    Object.keys(grouped)
      .sort((a, b) => DAYS_ORDER[a] - DAYS_ORDER[b])
      .forEach(key => { sortedGrouped[key] = grouped[key]; });

    return res.status(200).json({ status: 'success', data: availability, grouped: sortedGrouped });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ status: 'error', message: error.message });
  }
});

// POST /coach/setup — manager (any coach) | coach (own only) | swimmer blocked
router.post('/setup', async (req, res) => {
  try {
    const { role, coach_id, days, times, logged_coach_id } = req.body;
    const db = req.db;

    // Swimmer blocked entirely
    if (role === 'swimmer') {
      return res.status(403).json({ status: 'error', message: 'Unauthorized: Swimmers cannot modify coach schedules' });
    }

    if (role !== 'manager' && role !== 'coach') {
      return res.status(403).json({ status: 'error', message: 'Unauthorized' });
    }

    if (!coach_id || !days || !times) {
      return res.status(400).json({ status: 'error', message: 'coach_id, days, and times are required' });
    }

    // Coach can only update their own schedule
    if (role === 'coach' && parseInt(logged_coach_id) !== parseInt(coach_id)) {
      return res.status(403).json({ status: 'error', message: 'Coach can only update their own schedule' });
    }

    await db.query(`DELETE FROM coach_availability WHERE coach_id = ?`, [parseInt(coach_id)]);

    const insertData = [];
    for (const day of days) {
      for (const time of times) {
        insertData.push([parseInt(coach_id), day, time]);
      }
    }

    if (insertData.length > 0) {
      await db.query(
        `INSERT INTO coach_availability (coach_id, working_day, working_time) VALUES ?`,
        [insertData]
      );
    }

    return res.status(200).json({ status: 'success', message: 'Coach schedule saved' });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ status: 'error', message: error.message });
  }
});

module.exports = router;
