const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const authenticate = require('../middleware/authenticate'); // تم إضافة الميدل وير هنا لحماية الراوتس الداخلية

const router = express.Router();

// 1️⃣ POST /api/auth/login (بدون تغيير)
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const db = req.db;

    if (!email || !password) {
      return res.status(400).json({ status: 'error', message: 'Email and password are required' });
    }

    const tables = ['manager', 'coach', 'swimmer'];

    for (const table of tables) {
      const [rows] = await db.query(`SELECT * FROM \`${table}\` WHERE email = ? LIMIT 1`, [email]);
      const user = rows[0];

      if (user) {
        const isValid = await bcrypt.compare(password, user.password);
        if (isValid) {
          const { password: _, ...userWithoutPassword } = user;
          userWithoutPassword.role = table;
          userWithoutPassword.name = `${userWithoutPassword.first_name} ${userWithoutPassword.last_name}`;
          const token = jwt.sign(
            { user_id: user.id, role: table, email: user.email },
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
          );
          return res.status(200).json({
            status: 'success',
            message: 'Login successful',
            token,
            user: userWithoutPassword,
          });
        }
      }
    }

    return res.status(401).json({ status: 'error', message: 'Invalid email or password' });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ status: 'error', message: error.message });
  }
});

// 2️⃣ POST /api/auth/register (تم التعديل لمنع تكرار الإيميل عبر كل الجداول)
router.post('/register', async (req, res) => {
  try {
    const { role, email, password, confirm_password, first_name, last_name, phone, gender, age, level } = req.body;
    const db = req.db;

    if (!role || !email || !password || !confirm_password || !first_name || !last_name) {
      return res.status(400).json({ status: 'error', message: 'All fields are required' });
    }

    if (password !== confirm_password) {
      return res.status(400).json({ status: 'error', message: 'Passwords do not match' });
    }

    // 🔒 [التعديل هنا] - التأكد إن الإيميل غير مستخدم في أي دور (Role) تاني في النظام
    const tables = ['manager', 'coach', 'swimmer'];
    for (const table of tables) {
      const [existing] = await db.query(`SELECT id FROM \`${table}\` WHERE email = ? LIMIT 1`, [email]);
      if (existing.length > 0) {
        // لو الإيميل موجود في أي جدول، نوقف التسجيل فوراً
        return res.status(409).json({ status: 'error', message: 'Email already exists in the system' });
      }
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    try {
      if (role === 'manager') {
        await db.query(
          `INSERT INTO manager (first_name, last_name, phone, email, password) VALUES (?, ?, ?, ?, ?)`,
          [first_name, last_name, phone || null, email, hashedPassword]
        );
      } else if (role === 'coach') {
        await db.query(
          `INSERT INTO coach (first_name, last_name, gender, phone, email, password) VALUES (?, ?, ?, ?, ?, ?)`,
          [first_name, last_name, gender || 'Male', phone || null, email, hashedPassword]
        );
      } else if (role === 'swimmer') {
        await db.query(
          `INSERT INTO swimmer (first_name, last_name, gender, age, phone, level, email, password) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [first_name, last_name, gender || 'Male', age ? parseInt(age) : null, phone || null, level || null, email, hashedPassword]
        );
      } else {
        return res.status(400).json({ status: 'error', message: 'Invalid role' });
      }

      return res.status(201).json({
        status: 'success',
        message: `${role.charAt(0).toUpperCase() + role.slice(1)} registered successfully`,
      });
    } catch (dbError) {
      // كاتش إضافي في حالة حدوث خطأ من قاعدة البيانات
      if (dbError.code === 'ER_DUP_ENTRY') {
        return res.status(409).json({ status: 'error', message: 'Email already exists' });
      }
      throw dbError;
    }
  } catch (error) {
    console.error(error);
    return res.status(500).json({ status: 'error', message: error.message });
  }
});

// 3️⃣ POST /api/auth/profile 🔐 (مؤمن بالتوكين من التعديل السابق)
router.post('/profile', authenticate, async (req, res) => {
  try {
    // قمنا بسحب الـ id والـ role من التوكين الموثوق الفك تشفيره وليس من الـ body
    const { id: user_id, role } = req.user; 
    const db = req.db;

    // التحقق من الصلاحية (موجود تلقائياً من الميدل وير ولكن للتأكيد)
    const validRoles = ['manager', 'coach', 'swimmer'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({ status: 'error', message: 'Invalid role' });
    }

    const [rows] = await db.query(`SELECT * FROM \`${role}\` WHERE id = ? LIMIT 1`, [parseInt(user_id)]);
    const user = rows[0];

    if (!user) {
      return res.status(404).json({ status: 'error', message: 'User not found' });
    }

    const { password: _, ...userWithoutPassword } = user;

    if (role === 'manager') {
      const [coaches] = await db.query(`SELECT id, first_name, last_name FROM coach ORDER BY first_name ASC`);
      const formattedCoaches = coaches.map(c => ({
        id: c.id,
        name: `${c.first_name} ${c.last_name}`,
      }));
      return res.status(200).json({
        status: 'success',
        data: userWithoutPassword,
        coaches: formattedCoaches,
      });
    } else {
      return res.status(200).json({
        status: 'success',
        data: userWithoutPassword,
      });
    }
  } catch (error) {
    console.error(error);
    return res.status(500).json({ status: 'error', message: error.message });
  }
});

module.exports = router;