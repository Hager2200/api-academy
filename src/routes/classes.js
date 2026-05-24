const express = require('express');

const router = express.Router();

// GET /classes
router.get('/', async (req, res) => {
  try {
    const db = req.db;

    const [classes] = await db.query(`
      SELECT cl.id, cl.day, cl.time, cl.class_level,
        c.first_name, c.last_name
      FROM class cl
      JOIN coach c ON cl.coach_id = c.id
      ORDER BY cl.day ASC, cl.time ASC
    `);

    const formatted = classes.map(c => ({
      id: c.id,
      day: c.day,
      time: c.time,
      class_level: c.class_level,
      coach_name: `${c.first_name} ${c.last_name}`,
    }));

    return res.status(200).json({ status: 'success', data: formatted });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ status: 'error', message: error.message });
  }
});

// POST /classes
router.post('/', async (req, res) => {
  try {
    const { day, time, class_level, coach_id } = req.body;
    const db = req.db;

    if (!day || !time || !class_level || !coach_id) {
      return res.status(400).json({ status: 'error', message: 'day, time, class_level, and coach_id are required' });
    }

    await db.query(
      `INSERT INTO class (day, time, class_level, coach_id) VALUES (?, ?, ?, ?)`,
      [day, time, class_level, parseInt(coach_id)]
    );

    return res.status(201).json({ status: 'success', message: 'Class added' });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ status: 'error', message: error.message });
  }
});

// PUT /classes/:id
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { day, time, class_level, coach_id } = req.body;
    const db = req.db;

    if (!id) {
      return res.status(400).json({ status: 'error', message: 'id is required' });
    }

    await db.query(
      `UPDATE class SET day = ?, time = ?, class_level = ?, coach_id = ? WHERE id = ?`,
      [day, time, class_level, parseInt(coach_id), parseInt(id)]
    );

    return res.status(200).json({ status: 'success', message: 'Class updated' });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ status: 'error', message: error.message });
  }
});

// DELETE /classes/:id
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const db = req.db;

    if (!id) {
      return res.status(400).json({ status: 'error', message: 'id is required' });
    }

    await db.query(`DELETE FROM class WHERE id = ?`, [parseInt(id)]);
    return res.status(200).json({ status: 'success', message: 'Class deleted' });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ status: 'error', message: error.message });
  }
});

module.exports = router;
