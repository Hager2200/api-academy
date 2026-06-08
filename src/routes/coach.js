const express = require('express');
const router = express.Router();

const DAYS_ORDER = {
  Saturday: 0, Sunday: 1, Monday: 2, Tuesday: 3,
  Wednesday: 4, Thursday: 5, Friday: 6,
};

// GET /coach/list
router.get('/list', async (req, res) => {
  try {
    const { role } = req.user;
    const db = req.db;

    if (role !== 'manager') {
      return res.status(403).json({ status: 'error', message: 'Unauthorized: Only manager can view coaches' });
    }

    const [coaches] = await db.query(`SELECT id, first_name, last_name FROM coach ORDER BY first_name ASC`);
    return res.status(200).json({ status: 'success', data: coaches.map(c => ({ id: c.id, name: `${c.first_name} ${c.last_name}` })) });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ status: 'error', message: error.message });
  }
});

// GET /coach/days
router.get('/days', async (req, res) => {
  try {
    const { role } = req.user;
    if (role === 'swimmer') return res.status(403).json({ status: 'error', message: 'Unauthorized' });
    return res.status(200).json({ status: 'success', data: ['Saturday', 'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'] });
  } catch (error) {
    return res.status(500).json({ status: 'error', message: error.message });
  }
});

// GET /coach/times
router.get('/times', async (req, res) => {
  try {
    const { role } = req.user;
    if (role === 'swimmer') return res.status(403).json({ status: 'error', message: 'Unauthorized' });
    return res.status(200).json({ status: 'success', data: ['8 AM', '9 AM', '10 AM', '11 AM', '12 PM', '1 PM', '2 PM', '3 PM', '4 PM', '5 PM', '6 PM', '7 PM', '8 PM'] });
  } catch (error) {
    return res.status(500).json({ status: 'error', message: error.message });
  }
});

// GET /coach/availability (معدل 🛠️ - لا يتطلب coach_id للمدرب نفسه)
router.get('/availability', async (req, res) => {
  try {
    const { coach_id } = req.query;
    const { role, id: userId } = req.user;
    const db = req.db;

    if (role === 'swimmer') {
      return res.status(403).json({ status: 'error', message: 'Unauthorized' });
    }

    let resolvedCoachId;
    if (role === 'coach') {
      resolvedCoachId = userId; // يقرأ تلقائياً من التوكن ولا يحتاج لـ query param
    } else if (role === 'manager') {
      if (!coach_id) {
        return res.status(400).json({ status: 'error', message: 'coach_id is required for manager' });
      }
      resolvedCoachId = parseInt(coach_id);
    }

    const [availability] = await db.query(
      `SELECT * FROM coach_availability WHERE coach_id = ? ORDER BY working_day ASC, working_time ASC`,
      [resolvedCoachId]
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

// POST /coach/setup (معدل 🛠️ - لا يتطلب coach_id في الـ body للمدرب)
router.post('/setup', async (req, res) => {
  try {
    const { coach_id, days, times } = req.body;
    const { role, id: userId } = req.user;
    const db = req.db;

    if (role === 'swimmer') {
      return res.status(403).json({ status: 'error', message: 'Unauthorized: Swimmers cannot modify coach schedules' });
    }

    if (!days || !times) {
      return res.status(400).json({ status: 'error', message: 'days and times are required' });
    }

    let resolvedCoachId;
    if (role === 'coach') {
      resolvedCoachId = userId; // يعتمد التوكن مباشرة ويحمي البيانات
    } else if (role === 'manager') {
      if (!coach_id) {
        return res.status(400).json({ status: 'error', message: 'coach_id is required for manager' });
      }
      resolvedCoachId = parseInt(coach_id);
    }

    await db.query(`DELETE FROM coach_availability WHERE coach_id = ?`, [resolvedCoachId]);

    const insertData = [];
    for (const day of days) {
      for (const time of times) {
        insertData.push([resolvedCoachId, day, time]);
      }
    }

    if (insertData.length > 0) {
      await db.query(`INSERT INTO coach_availability (coach_id, working_day, working_time) VALUES ?`, [insertData]);
    }

    return res.status(200).json({ status: 'success', message: 'Coach schedule saved' });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ status: 'error', message: error.message });
  }
});

module.exports = router;