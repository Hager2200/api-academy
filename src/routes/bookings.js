const express = require('express');
const router = express.Router();

const parseBookingData = (bookingData) => {
  const [day, time] = bookingData.split('|');
  return { day, time };
};

// GET /bookings
router.get('/', async (req, res) => {
  try {
    const { swimmer_id, coach_id, booking_id } = req.query;
    const { role, id: userId } = req.user; // الاعتماد على التوكن لمعرفة المستخدم الحالي
    const db = req.db;

    // ── MANAGER (هو الوحيد المسموح له الفلترة بـ params) ──────────────────────
    if (role === 'manager') {
      if (!swimmer_id && !coach_id && !booking_id) {
        const [bookings] = await db.query(`
          SELECT b.*,
            sw.first_name AS swimmer_first, sw.last_name AS swimmer_last,
            c.first_name AS coach_first, c.last_name AS coach_last
          FROM booking b
          JOIN swimmer sw ON b.swimmer_id = sw.id
          JOIN coach c ON b.coach_id = c.id
          ORDER BY b.id DESC
        `);
        return res.status(200).json({ status: 'success', data: bookings.map(formatFull) });
      }
      if (swimmer_id) {
        const [bookings] = await db.query(`
          SELECT b.*, c.first_name AS coach_first, c.last_name AS coach_last
          FROM booking b JOIN coach c ON b.coach_id = c.id
          WHERE b.swimmer_id = ? ORDER BY b.id DESC
        `, [parseInt(swimmer_id)]);
        return res.status(200).json({ status: 'success', data: bookings.map(formatCoachOnly) });
      }
      if (coach_id) {
        const [bookings] = await db.query(`
          SELECT b.*, sw.first_name AS swimmer_first, sw.last_name AS swimmer_last, sw.age, sw.level
          FROM booking b JOIN swimmer sw ON b.swimmer_id = sw.id
          WHERE b.coach_id = ? ORDER BY b.id DESC
        `, [parseInt(coach_id)]);
        return res.status(200).json({ status: 'success', data: bookings.map(formatSwimmerOnly) });
      }
      if (booking_id) {
        const [rows] = await db.query(`
          SELECT b.*,
            sw.first_name AS swimmer_first, sw.last_name AS swimmer_last,
            c.first_name AS coach_first, c.last_name AS coach_last
          FROM booking b
          JOIN swimmer sw ON b.swimmer_id = sw.id
          JOIN coach c ON b.coach_id = c.id
          WHERE b.id = ? LIMIT 1
        `, [parseInt(booking_id)]);
        if (!rows[0]) return res.status(404).json({ status: 'error', message: 'Booking not found' });
        return res.status(200).json({ status: 'success', data: [formatFull(rows[0])] });
      }
    }

    // ── COACH (يجلب بياناته المربوطة بالتوكن تلقائياً) ────────────────────────
    if (role === 'coach') {
      const [bookings] = await db.query(`
        SELECT b.*, sw.first_name AS swimmer_first, sw.last_name AS swimmer_last, sw.age, sw.level
        FROM booking b JOIN swimmer sw ON b.swimmer_id = sw.id
        WHERE b.coach_id = ? ORDER BY b.id DESC
      `, [userId]);
      return res.status(200).json({ status: 'success', data: bookings.map(formatSwimmerOnly) });
    }

    // ── SWIMMER (يجلب بياناته المربوطة بالتوكن تلقائياً) ───────────────────────
    if (role === 'swimmer') {
      const [bookings] = await db.query(`
        SELECT b.*, c.first_name AS coach_first, c.last_name AS coach_last
        FROM booking b JOIN coach c ON b.coach_id = c.id
        WHERE b.swimmer_id = ? ORDER BY b.id DESC
      `, [userId]);
      return res.status(200).json({ status: 'success', data: bookings.map(formatCoachOnly) });
    }

    return res.status(403).json({ status: 'error', message: 'Unauthorized' });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ status: 'error', message: error.message });
  }
});

// POST /bookings
router.post('/', async (req, res) => {
  try {
    const { swimmer_id, coach_id, day, time, status } = req.body;
    const { role, id: userId } = req.user;
    const db = req.db;

    if (role === 'coach') {
      return res.status(403).json({ status: 'error', message: 'Coach cannot create bookings' });
    }
    if (role !== 'manager' && role !== 'swimmer') {
      return res.status(403).json({ status: 'error', message: 'Unauthorized' });
    }

    // إذا كان سباح، نأخذ معرفه من التوكن مباشرة لحمايته من التلاعب
    const resolvedSwimmerId = role === 'swimmer' ? userId : swimmer_id;

    if (!resolvedSwimmerId || !coach_id || !day || !time) {
      return res.status(400).json({ status: 'error', message: 'coach_id, day, and time are required' });
    }

    const bookingData = `${day}|${time}`;

    const [avail] = await db.query(
      `SELECT id FROM coach_availability WHERE coach_id = ? AND working_day = ? AND working_time = ? LIMIT 1`,
      [parseInt(coach_id), day, time]
    );
    if (!avail[0]) {
      return res.status(400).json({ status: 'error', message: 'Coach is not available at this day and time' });
    }

    const [existing] = await db.query(
      `SELECT id FROM booking WHERE swimmer_id = ? AND booking_data = ? LIMIT 1`,
      [parseInt(resolvedSwimmerId), bookingData]
    );
    if (existing[0]) {
      return res.status(409).json({ status: 'error', message: 'Booking already exists for this time' });
    }

    const bookingStatus = role === 'swimmer' ? 'pending' : (status || 'pending');

    const [result] = await db.query(
      `INSERT INTO booking (swimmer_id, coach_id, booking_data, status) VALUES (?, ?, ?, ?)`,
      [parseInt(resolvedSwimmerId), parseInt(coach_id), bookingData, bookingStatus]
    );

    return res.status(201).json({ status: 'success', message: 'Booking created successfully', booking_id: result.insertId });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ status: 'error', message: error.message });
  }
});

// PUT /bookings/:id
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { swimmer_id, coach_id, day, time, status } = req.body;
    const { role, id: userId } = req.user;
    const db = req.db;

    const [rows] = await db.query(`SELECT * FROM booking WHERE id = ? LIMIT 1`, [parseInt(id)]);
    const booking = rows[0];
    if (!booking) return res.status(404).json({ status: 'error', message: 'Booking not found' });

    // ── COACH (يتم التحقق الأمني عبر معرفه بالتوكن) ──────────────────────────
    if (role === 'coach') {
      if (booking.coach_id !== userId) {
        return res.status(403).json({ status: 'error', message: 'You can only update bookings for your swimmers' });
      }
      const updates = [];
      const values = [];
      if (status) { updates.push('status = ?'); values.push(status); }
      if (day || time) {
        const [curDay, curTime] = booking.booking_data.split('|');
        updates.push('booking_data = ?');
        values.push(`${day || curDay}|${time || curTime}`);
      }
      if (updates.length === 0) return res.status(400).json({ status: 'error', message: 'No fields to update' });
      values.push(parseInt(id));
      await db.query(`UPDATE booking SET ${updates.join(', ')} WHERE id = ?`, values);
      return res.status(200).json({ status: 'success', message: 'Booking updated successfully' });
    }

    // ── SWIMMER (يتم التحقق الأمني عبر معرفه بالتوكن) ─────────────────────────
    if (role === 'swimmer') {
      if (booking.swimmer_id !== userId) {
        return res.status(403).json({ status: 'error', message: 'You can only update your own bookings' });
      }
      if (status) {
        return res.status(403).json({ status: 'error', message: 'Swimmer cannot change booking status' });
      }
      if (!day && !time) {
        return res.status(400).json({ status: 'error', message: 'Swimmer can only update day and/or time' });
      }
      const [curDay, curTime] = booking.booking_data.split('|');
      await db.query(`UPDATE booking SET booking_data = ? WHERE id = ?`, [`${day || curDay}|${time || curTime}`, parseInt(id)]);
      return res.status(200).json({ status: 'success', message: 'Booking updated successfully' });
    }

    // ── MANAGER (يسمح له بتغيير الروابط والمعرفات بالكامل) ────────────────────
    if (role === 'manager') {
      const updates = [];
      const values = [];
      if (swimmer_id) { updates.push('swimmer_id = ?'); values.push(parseInt(swimmer_id)); }
      if (coach_id)   { updates.push('coach_id = ?');   values.push(parseInt(coach_id)); }
      if (status)     { updates.push('status = ?');     values.push(status); }
      if (day || time) {
        const [curDay, curTime] = booking.booking_data.split('|');
        updates.push('booking_data = ?');
        values.push(`${day || curDay}|${time || curTime}`);
      }
      if (updates.length === 0) return res.status(400).json({ status: 'error', message: 'No fields to update' });
      values.push(parseInt(id));
      await db.query(`UPDATE booking SET ${updates.join(', ')} WHERE id = ?`, values);
      return res.status(200).json({ status: 'success', message: 'Booking updated successfully' });
    }

    return res.status(403).json({ status: 'error', message: 'Unauthorized' });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ status: 'error', message: error.message });
  }
});

// DELETE /bookings/:id
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { role, id: userId } = req.user;
    const db = req.db;

    const [rows] = await db.query(`SELECT * FROM booking WHERE id = ? LIMIT 1`, [parseInt(id)]);
    const booking = rows[0];
    if (!booking) return res.status(404).json({ status: 'error', message: 'Booking not found' });

    // التحقق الأمني يتم بالكامل عبرuserId المستخرج من التوكن
    if (role === 'coach' && booking.coach_id !== userId) {
      return res.status(403).json({ status: 'error', message: 'You can only delete bookings for your swimmers' });
    }
    if (role === 'swimmer' && booking.swimmer_id !== userId) {
      return res.status(403).json({ status: 'error', message: 'You can only delete your own bookings' });
    }

    await db.query(`DELETE FROM booking WHERE id = ?`, [parseInt(id)]);
    return res.status(200).json({ status: 'success', message: 'Booking deleted successfully' });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ status: 'error', message: error.message });
  }
});

// Formatters (بدون تغيير)
const formatFull = (b) => ({
  id: b.id,
  day: parseBookingData(b.booking_data).day,
  time: parseBookingData(b.booking_data).time,
  status: b.status,
  swimmer_id: b.swimmer_id,
  coach_id: b.coach_id,
  swimmer_name: `${b.swimmer_first} ${b.swimmer_last}`,
  coach_name: `${b.coach_first} ${b.coach_last}`,
});

const formatCoachOnly = (b) => ({
  id: b.id,
  day: parseBookingData(b.booking_data).day,
  time: parseBookingData(b.booking_data).time,
  status: b.status,
  coach_id: b.coach_id,
  coach_name: `${b.coach_first} ${b.coach_last}`,
});

const formatSwimmerOnly = (b) => ({
  id: b.id,
  day: parseBookingData(b.booking_data).day,
  time: parseBookingData(b.booking_data).time,
  status: b.status,
  swimmer_id: b.swimmer_id,
  swimmer_name: `${b.swimmer_first} ${b.swimmer_last}`,
  age: b.age,
  level: b.level,
});

module.exports = router;