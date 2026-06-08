const express = require('express');
const router = express.Router();

const VALID_ROLES = ['manager', 'coach', 'swimmer'];

const guardRole = (role, res) => {
  if (!VALID_ROLES.includes(role)) {
    res.status(403).json({ status: 'error', message: 'Unauthorized' });
    return false;
  }
  return true;
};

// GET /attendance (معدل 🛠️ - يتجاهل الـ params تماماً للأدوار غير الإدارية)
router.get('/', async (req, res) => {
  try {
    const { user_id, user_type } = req.query;
    const { role, id: userId } = req.user;
    const db = req.db;

    if (!guardRole(role, res)) return;

    // ── Manager (هو الوحيد المسموح له إرسال معرف للبحث عن حضور شخص معين) ───────
    if (role === 'manager') {
      if (user_id && user_type) {
        if (!VALID_ROLES.includes(user_type)) {
          return res.status(400).json({ status: 'error', message: 'Invalid user_type' });
        }
        const [rows] = await db.query(
          `SELECT * FROM attendance WHERE user_id = ? AND user_type = ? ORDER BY date DESC, time ASC`,
          [parseInt(user_id), user_type]
        );
        return res.status(200).json({ status: 'success', data: rows });
      }
      const [rows] = await db.query(`SELECT * FROM attendance ORDER BY date DESC, time ASC`);
      return res.status(200).json({ status: 'success', data: rows });
    }

    // ── Coach (يجلب سجلاته هو فقط من التوكن) ──────────────────────────────────
    if (role === 'coach') {
      const [rows] = await db.query(
        `SELECT * FROM attendance WHERE user_id = ? AND user_type = 'coach' ORDER BY date DESC, time ASC`,
        [userId]
      );
      return res.status(200).json({ status: 'success', data: rows });
    }

    // ── Swimmer (يجلب سجلاته هو فقط من التوكن) ─────────────────────────────────
    if (role === 'swimmer') {
      const [rows] = await db.query(
        `SELECT * FROM attendance WHERE user_id = ? AND user_type = 'swimmer' ORDER BY date DESC, time ASC`,
        [userId]
      );
      return res.status(200).json({ status: 'success', data: rows });
    }
  } catch (error) {
    console.error(error);
    return res.status(500).json({ status: 'error', message: error.message });
  }
});

// POST /attendance (معدل 🛠️ - الكوتش والسباح يسجلون حضورهم الشخصي بدون تمرير معرفات)
router.post('/', async (req, res) => {
  try {
    const { date, time, status = 'present', user_id, user_type } = req.body;
    const { role, id: userId } = req.user;
    const db = req.db;

    if (!guardRole(role, res)) return;

    if (!date || !time) {
      return res.status(400).json({ status: 'error', message: 'date and time are required' });
    }

    if (!['present', 'absent'].includes(status)) {
      return res.status(400).json({ status: 'error', message: "status must be 'present' or 'absent'" });
    }

    let targetUserId, targetUserType, createdBy, createdByRole;

    if (role === 'manager') {
      if (!user_id || !user_type) {
        return res.status(400).json({ status: 'error', message: 'user_id and user_type are required for manager' });
      }
      if (!VALID_ROLES.includes(user_type)) {
        return res.status(400).json({ status: 'error', message: 'Invalid user_type' });
      }
      const [userRows] = await db.query(`SELECT id FROM \`${user_type}\` WHERE id = ? LIMIT 1`, [parseInt(user_id)]);
      if (!userRows[0]) return res.status(404).json({ status: 'error', message: `${user_type} not found` });
      targetUserId   = parseInt(user_id);
      targetUserType = user_type;
      createdBy      = userId;
      createdByRole  = 'manager';
    } else if (role === 'coach') {
      targetUserId   = userId;
      targetUserType = 'coach';
      createdBy      = userId;
      createdByRole  = 'coach';
    } else if (role === 'swimmer') {
      targetUserId   = userId;
      targetUserType = 'swimmer';
      createdBy      = userId;
      createdByRole  = 'swimmer';
    }

    const [existing] = await db.query(
      `SELECT id FROM attendance WHERE user_id = ? AND user_type = ? AND date = ? AND time = ? LIMIT 1`,
      [targetUserId, targetUserType, date, time]
    );
    if (existing[0]) {
      return res.status(409).json({ status: 'error', message: 'Attendance already recorded for this date and time' });
    }

    const [result] = await db.query(
      `INSERT INTO attendance (user_id, user_type, date, time, status, created_by, created_by_role) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [targetUserId, targetUserType, date, time, status, createdBy, createdByRole]
    );

    return res.status(201).json({ status: 'success', message: 'Attendance recorded successfully', attendance_id: result.insertId });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ status: 'error', message: error.message });
  }
});

// PUT /attendance/:id (معدل 🛠️ - التحقق الأمني من ملكية السجل يتم بالتوكن ولا يتأثر بالـ body)
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { date, time, status } = req.body;
    const { role, id: userId } = req.user;
    const db = req.db;

    if (!guardRole(role, res)) return;

    const [rows] = await db.query(`SELECT * FROM attendance WHERE id = ? LIMIT 1`, [parseInt(id)]);
    const record = rows[0];
    if (!record) return res.status(404).json({ status: 'error', message: 'Attendance record not found' });

    if (role === 'coach' && (record.user_id !== userId || record.user_type !== 'coach')) {
      return res.status(403).json({ status: 'error', message: 'You can only update your own attendance' });
    }
    if (role === 'swimmer' && (record.user_id !== userId || record.user_type !== 'swimmer')) {
      return res.status(403).json({ status: 'error', message: 'You can only update your own attendance' });
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

    if (updates.length === 0) return res.status(400).json({ status: 'error', message: 'No fields to update' });

    values.push(parseInt(id));
    await db.query(`UPDATE attendance SET ${updates.join(', ')} WHERE id = ?`, values);

    return res.status(200).json({ status: 'success', message: 'Attendance updated successfully' });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ status: 'error', message: error.message });
  }
});

// DELETE /attendance/:id
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { role } = req.user;
    const db = req.db;

    if (!guardRole(role, res)) return;

    if (role !== 'manager') {
      return res.status(403).json({ status: 'error', message: 'Only manager can delete attendance records' });
    }

    const [rows] = await db.query(`SELECT id FROM attendance WHERE id = ? LIMIT 1`, [parseInt(id)]);
    if (!rows[0]) return res.status(404).json({ status: 'error', message: 'Attendance record not found' });

    await db.query(`DELETE FROM attendance WHERE id = ?`, [parseInt(id)]);
    return res.status(200).json({ status: 'success', message: 'Attendance record deleted successfully' });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ status: 'error', message: error.message });
  }
});

module.exports = router;