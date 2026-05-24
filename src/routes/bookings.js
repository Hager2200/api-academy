const express = require('express');

const router = express.Router();

const parseBookingData = (bookingData) => {
  const [day, time] = bookingData.split('|');
  return { day, time };
};

// GET /bookings
router.get('/', async (req, res) => {
  try {
    const { role, swimmer_id, coach_id, booking_id, logged_coach_id } = req.query;
    const db = req.db;

    // ── MANAGER: full access ──────────────────────────────────────────────────
    if (role === 'manager') {
      // No filters → all bookings
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
        const formatted = bookings.map(b => ({
          id: b.id,
          day: parseBookingData(b.booking_data).day,
          time: parseBookingData(b.booking_data).time,
          status: b.status,
          swimmer_id: b.swimmer_id,
          coach_id: b.coach_id,
          swimmer_name: `${b.swimmer_first} ${b.swimmer_last}`,
          coach_name: `${b.coach_first} ${b.coach_last}`,
        }));
        return res.status(200).json({ status: 'success', data: formatted });
      }

      // Filter by swimmer_id
      if (swimmer_id) {
        const [bookings] = await db.query(`
          SELECT b.*, c.first_name AS coach_first, c.last_name AS coach_last
          FROM booking b
          JOIN coach c ON b.coach_id = c.id
          WHERE b.swimmer_id = ?
          ORDER BY b.id DESC
        `, [parseInt(swimmer_id)]);
        const formatted = bookings.map(b => ({
          id: b.id,
          day: parseBookingData(b.booking_data).day,
          time: parseBookingData(b.booking_data).time,
          status: b.status,
          coach_id: b.coach_id,
          coach_name: `${b.coach_first} ${b.coach_last}`,
        }));
        return res.status(200).json({ status: 'success', data: formatted });
      }

      // Filter by coach_id
      if (coach_id) {
        const [bookings] = await db.query(`
          SELECT b.*, sw.first_name AS swimmer_first, sw.last_name AS swimmer_last, sw.age, sw.level
          FROM booking b
          JOIN swimmer sw ON b.swimmer_id = sw.id
          WHERE b.coach_id = ?
          ORDER BY b.id DESC
        `, [parseInt(coach_id)]);
        const formatted = bookings.map(b => ({
          id: b.id,
          day: parseBookingData(b.booking_data).day,
          time: parseBookingData(b.booking_data).time,
          status: b.status,
          swimmer_id: b.swimmer_id,
          swimmer_name: `${b.swimmer_first} ${b.swimmer_last}`,
          age: b.age,
          level: b.level,
        }));
        return res.status(200).json({ status: 'success', data: formatted });
      }

      // Filter by booking_id
      if (booking_id) {
        const [rows] = await db.query(`
          SELECT b.*,
            sw.first_name AS swimmer_first, sw.last_name AS swimmer_last,
            c.first_name AS coach_first, c.last_name AS coach_last
          FROM booking b
          JOIN swimmer sw ON b.swimmer_id = sw.id
          JOIN coach c ON b.coach_id = c.id
          WHERE b.id = ?
          LIMIT 1
        `, [parseInt(booking_id)]);
        if (!rows[0]) return res.status(404).json({ status: 'error', message: 'Booking not found' });
        const b = rows[0];
        return res.status(200).json({
          status: 'success',
          data: [{
            id: b.id,
            day: parseBookingData(b.booking_data).day,
            time: parseBookingData(b.booking_data).time,
            status: b.status,
            swimmer_id: b.swimmer_id,
            coach_id: b.coach_id,
            swimmer_name: `${b.swimmer_first} ${b.swimmer_last}`,
            coach_name: `${b.coach_first} ${b.coach_last}`,
          }],
        });
      }
    }

    // ── COACH: only their own swimmers' bookings ──────────────────────────────
    if (role === 'coach') {
      if (!logged_coach_id) {
        return res.status(400).json({ status: 'error', message: 'logged_coach_id is required' });
      }

      // Coach can only query bookings where coach_id = their own id
      const resolvedCoachId = parseInt(logged_coach_id);

      const [bookings] = await db.query(`
        SELECT b.*, sw.first_name AS swimmer_first, sw.last_name AS swimmer_last, sw.age, sw.level
        FROM booking b
        JOIN swimmer sw ON b.swimmer_id = sw.id
        WHERE b.coach_id = ?
        ORDER BY b.id DESC
      `, [resolvedCoachId]);

      const formatted = bookings.map(b => ({
        id: b.id,
        day: parseBookingData(b.booking_data).day,
        time: parseBookingData(b.booking_data).time,
        status: b.status,
        swimmer_id: b.swimmer_id,
        swimmer_name: `${b.swimmer_first} ${b.swimmer_last}`,
        age: b.age,
        level: b.level,
      }));

      return res.status(200).json({ status: 'success', data: formatted });
    }

    // ── SWIMMER: only their own bookings ──────────────────────────────────────
    if (role === 'swimmer') {
      if (!swimmer_id) {
        return res.status(400).json({ status: 'error', message: 'swimmer_id is required' });
      }

      const [bookings] = await db.query(`
        SELECT b.*, c.first_name AS coach_first, c.last_name AS coach_last
        FROM booking b
        JOIN coach c ON b.coach_id = c.id
        WHERE b.swimmer_id = ?
        ORDER BY b.id DESC
      `, [parseInt(swimmer_id)]);

      const formatted = bookings.map(b => ({
        id: b.id,
        day: parseBookingData(b.booking_data).day,
        time: parseBookingData(b.booking_data).time,
        status: b.status,
        coach_id: b.coach_id,
        coach_name: `${b.coach_first} ${b.coach_last}`,
      }));

      return res.status(200).json({ status: 'success', data: formatted });
    }

    return res.status(403).json({ status: 'error', message: 'Unauthorized or missing parameters' });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ status: 'error', message: error.message });
  }
});

// POST /bookings — manager & swimmer only
router.post('/', async (req, res) => {
  try {
    const { role, swimmer_id, coach_id, day, time, status } = req.body;
    const db = req.db;

    if (role !== 'manager' && role !== 'swimmer') {
      return res.status(403).json({ status: 'error', message: 'Only manager and swimmer can create bookings' });
    }

    if (!swimmer_id || !coach_id || !day || !time) {
      return res.status(400).json({ status: 'error', message: 'swimmer_id, coach_id, day, and time are required' });
    }

    const bookingData = `${day}|${time}`;

    // Check coach availability
    const [avail] = await db.query(
      `SELECT id FROM coach_availability WHERE coach_id = ? AND working_day = ? AND working_time = ? LIMIT 1`,
      [parseInt(coach_id), day, time]
    );
    if (!avail[0]) {
      return res.status(400).json({ status: 'error', message: 'Coach is not available at this day and time' });
    }

    // Check for duplicate booking
    const [existing] = await db.query(
      `SELECT id FROM booking WHERE swimmer_id = ? AND booking_data = ? LIMIT 1`,
      [parseInt(swimmer_id), bookingData]
    );
    if (existing[0]) {
      return res.status(409).json({ status: 'error', message: 'Booking already exists for this time' });
    }

    // Swimmer cannot set status manually — always pending
    const bookingStatus = role === 'swimmer' ? 'pending' : (status || 'pending');

    const [result] = await db.query(
      `INSERT INTO booking (swimmer_id, coach_id, booking_data, status) VALUES (?, ?, ?, ?)`,
      [parseInt(swimmer_id), parseInt(coach_id), bookingData, bookingStatus]
    );

    return res.status(201).json({
      status: 'success',
      message: 'Booking created successfully',
      booking_id: result.insertId,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ status: 'error', message: error.message });
  }
});

// PUT /bookings/:id
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { role, swimmer_id, coach_id, day, time, status, logged_coach_id, logged_swimmer_id } = req.body;
    const db = req.db;

    if (!id) {
      return res.status(400).json({ status: 'error', message: 'id is required' });
    }

    const [rows] = await db.query(`SELECT * FROM booking WHERE id = ? LIMIT 1`, [parseInt(id)]);
    const booking = rows[0];
    if (!booking) {
      return res.status(404).json({ status: 'error', message: 'Booking not found' });
    }

    // ── COACH ─────────────────────────────────────────────────────────────────
    if (role === 'coach') {
      if (booking.coach_id !== parseInt(logged_coach_id || 0)) {
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

      if (updates.length === 0) {
        return res.status(400).json({ status: 'error', message: 'No fields to update' });
      }

      values.push(parseInt(id));
      await db.query(`UPDATE booking SET ${updates.join(', ')} WHERE id = ?`, values);
      return res.status(200).json({ status: 'success', message: 'Booking updated successfully' });
    }

    // ── SWIMMER ───────────────────────────────────────────────────────────────
    if (role === 'swimmer') {
      // Swimmer can only edit their own booking
      if (booking.swimmer_id !== parseInt(logged_swimmer_id || 0)) {
        return res.status(403).json({ status: 'error', message: 'You can only update your own bookings' });
      }

      // Swimmer cannot change status
      if (!day && !time) {
        return res.status(400).json({ status: 'error', message: 'Swimmer can only update day and/or time' });
      }

      const [curDay, curTime] = booking.booking_data.split('|');
      await db.query(
        `UPDATE booking SET booking_data = ? WHERE id = ?`,
        [`${day || curDay}|${time || curTime}`, parseInt(id)]
      );
      return res.status(200).json({ status: 'success', message: 'Booking updated successfully' });
    }

    // ── MANAGER ───────────────────────────────────────────────────────────────
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

      if (updates.length === 0) {
        return res.status(400).json({ status: 'error', message: 'No fields to update' });
      }

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
    const { role, logged_swimmer_id, logged_coach_id } = req.body;
    const db = req.db;

    if (!id) {
      return res.status(400).json({ status: 'error', message: 'id is required' });
    }

    if (!['manager', 'coach', 'swimmer'].includes(role)) {
      return res.status(403).json({ status: 'error', message: 'Unauthorized' });
    }

    const [rows] = await db.query(`SELECT * FROM booking WHERE id = ? LIMIT 1`, [parseInt(id)]);
    const booking = rows[0];
    if (!booking) {
      return res.status(404).json({ status: 'error', message: 'Booking not found' });
    }

    if (role === 'coach' && booking.coach_id !== parseInt(logged_coach_id || 0)) {
      return res.status(403).json({ status: 'error', message: 'You can only delete bookings for your swimmers' });
    }

    if (role === 'swimmer' && booking.swimmer_id !== parseInt(logged_swimmer_id || 0)) {
      return res.status(403).json({ status: 'error', message: 'You can only delete your own bookings' });
    }

    await db.query(`DELETE FROM booking WHERE id = ?`, [parseInt(id)]);
    return res.status(200).json({ status: 'success', message: 'Booking deleted successfully' });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ status: 'error', message: error.message });
  }
});

module.exports = router;
