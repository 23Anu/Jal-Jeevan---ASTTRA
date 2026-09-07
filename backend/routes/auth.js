const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { dbAsync } = require('../db/database');
const config = require('../config/keys');

// In-memory OTP storage: key -> { otp, user, expiresAt }
const otpStore = new Map();

// Helper to sanitize identifier (phone or ID card number)
function sanitizeIdentifier(idStr) {
  if (!idStr) return '';
  return idStr.toString().trim();
}

function cleanPhoneNumber(phoneStr) {
  if (!phoneStr) return '';
  // Remove spaces, dashes, plus, parentheses
  const digits = phoneStr.replace(/[^0-9]/g, '');
  // If starts with 91 and has 12 digits, strip 91
  if (digits.length === 12 && digits.startsWith('91')) {
    return digits.substring(2);
  }
  // If starts with 0 and has 11 digits, strip 0
  if (digits.length === 11 && digits.startsWith('0')) {
    return digits.substring(1);
  }
  return digits;
}

function maskPhone(phone) {
  if (!phone) return 'XXXXXX0000';
  const digits = cleanPhoneNumber(phone);
  if (digits.length >= 10) {
    return `+91 ${digits.substring(0, 2)}•••• ••${digits.substring(8)}`;
  }
  return phone;
}

// POST /api/auth/send-otp - Generate & send OTP for Mobile Number or ID Card No
router.post('/send-otp', async (req, res) => {
  try {
    const rawIdentifier = sanitizeIdentifier(req.body.identifier);

    if (!rawIdentifier) {
      return res.status(400).json({ 
        success: false, 
        error: 'Please enter a valid Phone Number or Official Government ID Card No.' 
      });
    }

    const cleanPhone = cleanPhoneNumber(rawIdentifier);
    const upperId = rawIdentifier.toUpperCase();

    // 1. Look up user in database
    let user = null;

    if (cleanPhone.length >= 10) {
      user = await dbAsync.get(
        `SELECT * FROM users WHERE phone LIKE ? OR phone LIKE ?`,
        [`%${cleanPhone}%`, `%${cleanPhone.slice(-10)}%`]
      );
    }

    if (!user) {
      user = await dbAsync.get(
        `SELECT * FROM users WHERE UPPER(id_card_no) = ? OR UPPER(username) = ?`,
        [upperId, upperId.toLowerCase()]
      );
    }

    // 2. If user not found in preset seed, generate a verified temporary officer profile
    if (!user) {
      const isLikelyPhone = /^\d{10}$/.test(cleanPhone);
      user = {
        id: Math.floor(1000 + Math.random() * 9000),
        username: isLikelyPhone ? `officer_${cleanPhone}` : `officer_${upperId.replace(/[^A-Z0-9]/g, '')}`,
        full_name: isLikelyPhone ? `PHED Field Officer (+91-${cleanPhone.slice(-4)})` : `PHED Officer (${upperId})`,
        designation: 'Field Inspection Engineer (DW&SD)',
        id_card_no: isLikelyPhone ? `JH-PHED-${cleanPhone.slice(-4)}` : upperId,
        department: 'PHED Department of Drinking Water & Sanitation, Govt. of Jharkhand',
        role: 'PHED_OFFICER',
        district: 'Ranchi',
        block: 'Kanke',
        assigned_units: '*',
        phone: isLikelyPhone ? `+91-${cleanPhone}` : '+91-9431100000'
      };
    }

    // 3. Generate 6-digit OTP
    const generatedOtp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = Date.now() + 5 * 60 * 1000; // 5 minutes validity

    // Store by both upper ID and clean phone
    const storageKeys = [rawIdentifier.toLowerCase(), cleanPhone, upperId].filter(Boolean);
    for (const key of storageKeys) {
      otpStore.set(key, {
        otp: generatedOtp,
        user,
        expiresAt
      });
    }

    console.log(`\n========================================`);
    console.log(`📲 [GOV OTP SIMULATOR - DW&SD JHARKHAND]`);
    console.log(`To Officer: ${user.full_name} (${user.id_card_no})`);
    console.log(`Phone: ${user.phone}`);
    console.log(`Your Official Verification OTP is: ${generatedOtp}`);
    console.log(`Valid for 5 minutes.`);
    console.log(`========================================\n`);

    res.json({
      success: true,
      message: `OTP sent successfully to registered mobile number ${maskPhone(user.phone)}`,
      otp: generatedOtp, // Included for instant smooth testing/preview
      phone_masked: maskPhone(user.phone),
      officer: {
        id_card_no: user.id_card_no || 'JH-PHED-8842',
        full_name: user.full_name,
        designation: user.designation || 'PHED Officer',
        department: user.department || 'PHED, Govt. of Jharkhand',
        role: user.role
      },
      expires_in_seconds: 300
    });

  } catch (error) {
    console.error('Error in send-otp:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/auth/verify-otp - Verify 6-digit OTP and issue official session token
router.post('/verify-otp', async (req, res) => {
  try {
    const rawIdentifier = sanitizeIdentifier(req.body.identifier);
    const enteredOtp = (req.body.otp || '').toString().trim();

    if (!rawIdentifier || !enteredOtp) {
      return res.status(400).json({ 
        success: false, 
        error: 'Identifier and 6-digit OTP are required' 
      });
    }

    const cleanPhone = cleanPhoneNumber(rawIdentifier);
    const upperId = rawIdentifier.toUpperCase();

    // Check stored OTP by various keys
    let record = otpStore.get(rawIdentifier.toLowerCase()) ||
                 otpStore.get(cleanPhone) ||
                 otpStore.get(upperId);

    // Support Universal Master OTP for rapid testing / evaluation
    const isMasterOtp = enteredOtp === '123456';
    const isValidStoredOtp = record && record.otp === enteredOtp && record.expiresAt > Date.now();

    if (!isValidStoredOtp && !isMasterOtp) {
      return res.status(401).json({
        success: false,
        error: record && record.expiresAt <= Date.now() 
          ? 'OTP has expired. Please request a new OTP.' 
          : 'Invalid OTP code. Please enter the 6-digit OTP sent to your phone.'
      });
    }

    // Determine user profile
    let user = record ? record.user : null;

    if (!user) {
      // Find from DB or create dynamic session
      if (cleanPhone.length >= 10) {
        user = await dbAsync.get(
          `SELECT * FROM users WHERE phone LIKE ? OR phone LIKE ?`,
          [`%${cleanPhone}%`, `%${cleanPhone.slice(-10)}%`]
        );
      }
      if (!user) {
        user = await dbAsync.get(
          `SELECT * FROM users WHERE UPPER(id_card_no) = ? OR UPPER(username) = ?`,
          [upperId, upperId.toLowerCase()]
        );
      }
    }

    if (!user) {
      user = {
        id: 101,
        username: 'phed_officer',
        full_name: 'Er. Rajesh Ranjan',
        designation: 'Sub-Divisional Officer (SDO)',
        id_card_no: 'JH-PHED-8842',
        department: 'PHED Ranchi Division, Govt. of Jharkhand',
        role: 'PHED_OFFICER',
        district: 'Ranchi',
        block: '*',
        assigned_units: '*',
        phone: '+91-9431123456'
      };
    }

    // Generate JWT Token
    const payload = {
      id: user.id,
      username: user.username,
      full_name: user.full_name,
      role: user.role,
      designation: user.designation || 'PHED Officer',
      id_card_no: user.id_card_no || 'JH-PHED-8842',
      department: user.department || 'PHED, Govt. of Jharkhand',
      district: user.district || 'Ranchi',
      block: user.block || '*',
      assigned_units: user.assigned_units || '*',
      phone: user.phone || '+91-9431123456'
    };

    const token = jwt.sign(payload, config.JWT_SECRET, { expiresIn: config.JWT_EXPIRES_IN });

    // Clean up OTP store
    otpStore.delete(rawIdentifier.toLowerCase());
    otpStore.delete(cleanPhone);
    otpStore.delete(upperId);

    res.json({
      success: true,
      message: `Authentication successful! Welcome ${payload.full_name}.`,
      token,
      user: payload
    });

  } catch (error) {
    console.error('Error in verify-otp:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/auth/officers - List registered PHED officers for 1-click test fill
router.get('/officers', async (req, res) => {
  try {
    const officers = await dbAsync.all(
      `SELECT id, username, full_name, designation, id_card_no, department, role, district, phone 
       FROM users 
       WHERE role != 'PUBLIC'
       ORDER BY role DESC, full_name ASC`
    );

    res.json({
      success: true,
      data: officers
    });
  } catch (error) {
    console.error('Error fetching officers:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/auth/login - Role-based password login fallback
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ success: false, error: 'Username and password required' });
    }

    const user = await dbAsync.get(`SELECT * FROM users WHERE username = ?`, [username]);
    if (!user) {
      return res.status(401).json({ success: false, error: 'Invalid credentials' });
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ success: false, error: 'Invalid credentials' });
    }

    const payload = {
      id: user.id,
      username: user.username,
      full_name: user.full_name,
      designation: user.designation,
      id_card_no: user.id_card_no,
      department: user.department,
      role: user.role,
      district: user.district,
      block: user.block,
      assigned_units: user.assigned_units,
      phone: user.phone
    };

    const token = jwt.sign(payload, config.JWT_SECRET, { expiresIn: config.JWT_EXPIRES_IN });

    res.json({
      success: true,
      message: 'Login successful',
      token,
      user: payload
    });
  } catch (error) {
    console.error('Error during login:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/auth/roles - Return demo role accounts for instant switching
router.get('/demo-roles', (req, res) => {
  res.json({
    success: true,
    roles: [
      { role: 'PUBLIC', username: 'citizen', label: 'Citizen / Public User', scope: 'Single Nearest Unit (Open)' },
      { role: 'GP_VWSC', username: 'gram_panchayat', label: 'Gram Panchayat / VWSC', scope: 'Sukhurhutu Panchayat' },
      { role: 'PHED_OFFICER', username: 'phed_officer', label: 'PHED District Officer', scope: 'Ranchi Sub-Division' },
      { role: 'ADMIN', username: 'admin', label: 'State Admin (DWSD)', scope: 'Statewide Access' }
    ]
  });
});

module.exports = router;
