const express = require('express');
const bcrypt = require('bcryptjs');

const router = express.Router();

// POST /auth/login
router.post('/auth/login', async (req, res) => {
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
          return res.status(200).json({
            status: 'success',
            message: 'Login successful',
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

// POST /auth/register
router.post('/auth/register', async (req, res) => {
  try {
    const { role, email, password, confirm_password, first_name, last_name, phone, gender, age, level } = req.body;
    const db = req.db;

    if (!role || !email || !password || !confirm_password || !first_name || !last_name) {
      return res.status(400).json({ status: 'error', message: 'All fields are required' });
    }

    if (password !== confirm_password) {
      return res.status(400).json({ status: 'error', message: 'Passwords do not match' });
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

// POST /auth/profile
router.post('/auth/profile', async (req, res) => {
  try {
    const { user_id, role } = req.body;
    const db = req.db;

    if (!user_id || !role) {
      return res.status(400).json({ status: 'error', message: 'user_id and role are required' });
    }

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
