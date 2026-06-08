const express = require('express');
const router = express.Router();

// GET /api/users/list?type=swimmer OR ?type=coach
router.get('/list', async (req, res) => {
  try {
    const { role } = req.user;
    const { type } = req.query; // بنستقبل النوع من اللينك
    const db = req.db;

    // الراوت ده للمدير بس عشان يقدر يسجل حضور للناس
    if (role !== 'manager') {
      return res.status(403).json({ status: 'error', message: 'Unauthorized: Only manager can view all users' });
    }

    // التأكد إن النوع المبعوت سليم
    if (!type || !['coach', 'swimmer'].includes(type)) {
      return res.status(400).json({ status: 'error', message: 'Invalid or missing type. Use type=coach or type=swimmer' });
    }

    // هنجيب البيانات من الجدول بناءً على الكلمة اللي مبعوته في الـ type
    const [users] = await db.query(
      `SELECT id, first_name, last_name FROM \`${type}\` ORDER BY first_name ASC`
    );

    const formattedUsers = users.map(u => ({
      id: u.id,
      name: `${u.first_name} ${u.last_name}`
    }));

    return res.status(200).json({ status: 'success', data: formattedUsers });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ status: 'error', message: error.message });
  }
});

module.exports = router;