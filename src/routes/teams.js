const express = require('express');

const router = express.Router();

// GET /teams — all roles
router.get('/', async (req, res) => {
  try {
    const db = req.db;

    const [teams] = await db.query(`
      SELECT t.id, t.team_name, t.day, t.time, c.first_name, c.last_name
      FROM team t
      JOIN coach c ON t.coach_id = c.id
      ORDER BY t.day ASC, t.time ASC
    `);

    const formatted = teams.map(t => ({
      id: t.id,
      team_name: t.team_name,
      day: t.day,
      time: t.time,
      coach_name: `${t.first_name} ${t.last_name}`,
    }));

    return res.status(200).json({ status: 'success', data: formatted });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ status: 'error', message: error.message });
  }
});

// POST /teams — manager only
router.post('/', async (req, res) => {
  try {
    const role = req.user.role;
    if (role !== 'manager') {
      return res.status(403).json({ status: 'error', message: 'Unauthorized: Only manager can add teams' });
    }

    const { team_name, day, time, coach_id } = req.body;
    const db = req.db;

    if (!team_name || !day || !time || !coach_id) {
      return res.status(400).json({ status: 'error', message: 'team_name, day, time, and coach_id are required' });
    }

    await db.query(
      `INSERT INTO team (team_name, day, time, coach_id) VALUES (?, ?, ?, ?)`,
      [team_name, day, time, parseInt(coach_id)]
    );

    return res.status(201).json({ status: 'success', message: 'Team added' });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ status: 'error', message: error.message });
  }
});

// PUT /teams/:id — manager only
router.put('/:id', async (req, res) => {
  try {
    const role = req.user.role;
    if (role !== 'manager') {
      return res.status(403).json({ status: 'error', message: 'Unauthorized: Only manager can update teams' });
    }

    const { id } = req.params;
    const { team_name, day, time, coach_id } = req.body;
    const db = req.db;

    await db.query(
      `UPDATE team SET team_name = ?, day = ?, time = ?, coach_id = ? WHERE id = ?`,
      [team_name, day, time, parseInt(coach_id), parseInt(id)]
    );

    return res.status(200).json({ status: 'success', message: 'Team updated' });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ status: 'error', message: error.message });
  }
});

// DELETE /teams/:id — manager only
router.delete('/:id', async (req, res) => {
  try {
    const role = req.user.role;
    if (role !== 'manager') {
      return res.status(403).json({ status: 'error', message: 'Unauthorized: Only manager can delete teams' });
    }

    const { id } = req.params;
    const db = req.db;

    await db.query(`DELETE FROM team WHERE id = ?`, [parseInt(id)]);
    return res.status(200).json({ status: 'success', message: 'Team deleted' });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ status: 'error', message: error.message });
  }
});

module.exports = router;
