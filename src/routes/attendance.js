const express = require('express');

const router = express.Router();

// ─── helpers ────────────────────────────────────────────────────────────────

const VALID_ROLES = ['manager', 'coach', 'swimmer'];

const guardRole = (role, res) => {
  if (!VALID_ROLES.includes(role)) {
    res.status(403).json({ status: 'error', message: 'Unauthorized' });
    return false;
  }
  return true;
};

// ─── GET /attendance ─────────────────────────────────────────────────────────
//
//  Manager  → can query anyone  (filter by ?user_id + ?user_type, or get all)
//  Coach    → can only see their own records  (logged_coach_id must match)
//  Swimmer  → can only see their own records  (logged_swimmer_id must match)
//
router.get('/', async (req, res) => {
  try {
    const { role, user_id, user_type, logged_coach_id, logged_swimmer_id } = req.query;
    const db = req.db;

    if (!guardRole(role, res)) return;

    // ── Manager ──────────────────────────────────────────────────────────────
    if (role === 'manager') {
      if (user_id && user_type) {
        // Specific user
        if (!VALID_ROLES.includes(user_type)) {
          return res.status(400).json({ status: 'error', message: 'Invalid user_type' });
        }
        const [rows] = await db.query(
          `SELECT * FROM attendance
           WHERE user_id = ? AND user_type = ?
           ORDER BY date DESC, time ASC`,
          [parseInt(user_id), user_type]
        );
        return res.status(200).json({ status: 'success', data: rows });
      }

      // All records
      const [rows] = await db.query(
        `SELECT * FROM attendance ORDER BY date DESC, time ASC`
      );
      return res.status(200).json({ status: 'success', data: rows });
    }

    // ── Coach ─────────────────────────────────────────────────────────────────
    if (role === 'coach') {
      if (!logged_coach_id) {
        return res.status(400).json({ status: 'error', message: 'logged_coach_id is required' });
      }
      const [rows] = await db.query(
        `SELECT * FROM attendance
         WHERE user_id = ? AND user_type = 'coach'
         ORDER BY date DESC, time ASC`,
        [parseInt(logged_coach_id)]
      );
      return res.status(200).json({ status: 'success', data: rows });
    }

    // ── Swimmer ───────────────────────────────────────────────────────────────
    if (role === 'swimmer') {
      if (!logged_swimmer_id) {
        return res.status(400).json({ status: 'error', message: 'logged_swimmer_id is required' });
      }
      const [rows] = await db.query(
        `SELECT * FROM attendance
         WHERE user_id = ? AND user_type = 'swimmer'
         ORDER BY date DESC, time ASC`,
        [parseInt(logged_swimmer_id)]
      );
      return res.status(200).json({ status: 'success', data: rows });
    }
  } catch (error) {
    console.error(error);
    return res.status(500).json({ status: 'error', message: error.message });
  }
});

// ─── POST /attendance ─────────────────────────────────────────────────────────
//
//  Manager  → can log attendance for anyone (swimmer / coach)
//  Coach    → can only log their OWN attendance
//  Swimmer  → can only log their OWN attendance
//
//  Required body: role, date, time, status ('present' | 'absent')
//  Manager also needs: user_id, user_type
//  Coach  also needs: logged_coach_id
//  Swimmer also needs: logged_swimmer_id
//
router.post('/', async (req, res) => {
  try {
    const {
      role,
      date,
      time,
      status = 'present',
      // manager-specific
      user_id,
      user_type,
      // coach self-log
      logged_coach_id,
      // swimmer self-log
      logged_swimmer_id,
    } = req.body;
    const db = req.db;

    if (!guardRole(role, res)) return;

    if (!date || !time) {
      return res.status(400).json({ status: 'error', message: 'date and time are required' });
    }

    if (!['present', 'absent'].includes(status)) {
      return res.status(400).json({ status: 'error', message: "status must be 'present' or 'absent'" });
    }

    let targetUserId, targetUserType, createdBy, createdByRole;

    // ── Manager ──────────────────────────────────────────────────────────────
    if (role === 'manager') {
      if (!user_id || !user_type) {
        return res.status(400).json({ status: 'error', message: 'user_id and user_type are required for manager' });
      }
      if (!VALID_ROLES.includes(user_type)) {
        return res.status(400).json({ status: 'error', message: 'Invalid user_type' });
      }

      // Verify the target user actually exists
      const [userRows] = await db.query(
        `SELECT id FROM \`${user_type}\` WHERE id = ? LIMIT 1`,
        [parseInt(user_id)]
      );
      if (!userRows[0]) {
        return res.status(404).json({ status: 'error', message: `${user_type} not found` });
      }

      targetUserId   = parseInt(user_id);
      targetUserType = user_type;
      // Manager's own id is not passed in this route for simplicity;
      // use a sentinel value or extend the body to include manager_id if needed.
      createdBy     = parseInt(req.body.manager_id || 0);
      createdByRole = 'manager';
    }

    // ── Coach (self only) ─────────────────────────────────────────────────────
    else if (role === 'coach') {
      if (!logged_coach_id) {
        return res.status(400).json({ status: 'error', message: 'logged_coach_id is required' });
      }
      targetUserId   = parseInt(logged_coach_id);
      targetUserType = 'coach';
      createdBy      = parseInt(logged_coach_id);
      createdByRole  = 'coach';
    }

    // ── Swimmer (self only) ───────────────────────────────────────────────────
    else if (role === 'swimmer') {
      if (!logged_swimmer_id) {
        return res.status(400).json({ status: 'error', message: 'logged_swimmer_id is required' });
      }
      targetUserId   = parseInt(logged_swimmer_id);
      targetUserType = 'swimmer';
      createdBy      = parseInt(logged_swimmer_id);
      createdByRole  = 'swimmer';
    }

    // Check duplicate
    const [existing] = await db.query(
      `SELECT id FROM attendance
       WHERE user_id = ? AND user_type = ? AND date = ? AND time = ? LIMIT 1`,
      [targetUserId, targetUserType, date, time]
    );
    if (existing[0]) {
      return res.status(409).json({ status: 'error', message: 'Attendance already recorded for this date and time' });
    }

    const [result] = await db.query(
      `INSERT INTO attendance (user_id, user_type, date, time, status, created_by, created_by_role)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [targetUserId, targetUserType, date, time, status, createdBy, createdByRole]
    );

    return res.status(201).json({
      status: 'success',
      message: 'Attendance recorded successfully',
      attendance_id: result.insertId,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ status: 'error', message: error.message });
  }
});

// ─── PUT /attendance/:id ──────────────────────────────────────────────────────
//
//  Manager  → can update any record
//  Coach    → can only update their own records
//  Swimmer  → can only update their own records
//
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { role, date, time, status, logged_coach_id, logged_swimmer_id } = req.body;
    const db = req.db;

    if (!guardRole(role, res)) return;

    const [rows] = await db.query(
      `SELECT * FROM attendance WHERE id = ? LIMIT 1`,
      [parseInt(id)]
    );
    const record = rows[0];
    if (!record) {
      return res.status(404).json({ status: 'error', message: 'Attendance record not found' });
    }

    // Ownership check for non-managers
    if (role === 'coach') {
      if (!logged_coach_id || record.user_id !== parseInt(logged_coach_id) || record.user_type !== 'coach') {
        return res.status(403).json({ status: 'error', message: 'You can only update your own attendance' });
      }
    }
    if (role === 'swimmer') {
      if (!logged_swimmer_id || record.user_id !== parseInt(logged_swimmer_id) || record.user_type !== 'swimmer') {
        return res.status(403).json({ status: 'error', message: 'You can only update your own attendance' });
      }
    }

    const updates = [];
    const values  = [];

    if (date)   { updates.push('date = ?');   values.push(date); }
    if (time)   { updates.push('time = ?');   values.push(time); }
    if (status) {
      if (!['present', 'absent'].includes(status)) {
        return res.status(400).json({ status: 'error', message: "status must be 'present' or 'absent'" });
      }
      updates.push('status = ?');
      values.push(status);
    }

    if (updates.length === 0) {
      return res.status(400).json({ status: 'error', message: 'No fields to update' });
    }

    values.push(parseInt(id));
    await db.query(`UPDATE attendance SET ${updates.join(', ')} WHERE id = ?`, values);

    return res.status(200).json({ status: 'success', message: 'Attendance updated successfully' });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ status: 'error', message: error.message });
  }
});

// ─── DELETE /attendance/:id ───────────────────────────────────────────────────
//
//  Manager  → can delete any record
//  Coach    → CANNOT delete (forbidden)
//  Swimmer  → CANNOT delete (forbidden)
//
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { role } = req.body;
    const db = req.db;

    if (!guardRole(role, res)) return;

    if (role !== 'manager') {
      return res.status(403).json({ status: 'error', message: 'Only manager can delete attendance records' });
    }

    const [rows] = await db.query(
      `SELECT id FROM attendance WHERE id = ? LIMIT 1`,
      [parseInt(id)]
    );
    if (!rows[0]) {
      return res.status(404).json({ status: 'error', message: 'Attendance record not found' });
    }

    await db.query(`DELETE FROM attendance WHERE id = ?`, [parseInt(id)]);
    return res.status(200).json({ status: 'success', message: 'Attendance record deleted successfully' });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ status: 'error', message: error.message });
  }
});

module.exports = router;
