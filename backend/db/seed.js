const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const { dbAsync } = require('./database');

async function seedDatabase() {
  console.log('🌱 Starting Database Initialization and Seeding for SIH26040...');

  // 1. Drop and Recreate Schema
  await dbAsync.exec(`
    DROP TABLE IF EXISTS readings;
    DROP TABLE IF EXISTS alerts;
    DROP TABLE IF EXISTS maintenance_logs;
    DROP TABLE IF EXISTS users;
    DROP TABLE IF EXISTS units;
  `);
  const schemaSql = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf-8');
  await dbAsync.exec(schemaSql);
  console.log('✅ Tables created successfully.');

  // Clean old data
  await dbAsync.run(`DELETE FROM readings`);
  await dbAsync.run(`DELETE FROM alerts`);
  await dbAsync.run(`DELETE FROM maintenance_logs`);
  await dbAsync.run(`DELETE FROM units`);
  await dbAsync.run(`DELETE FROM users`);

  // 2. Seed Units (NMIET Live Station + Offline Units)
  const units = [
    {
      id: 'JH-RAN-001',
      name: 'NMIET Smart Water Purification & IoT Station',
      district: 'NMIET',
      block: 'Talegaon Dabhade',
      panchayat: 'NMIET Campus',
      village: 'NMIET Engineering College',
      location_type: 'Campus IoT Water Station',
      latitude: 18.7312,
      longitude: 73.6756,
      status: 'SAFE',
      filter_health: 98,
      cartridge_install_date: '2026-08-01',
      last_maintenance_date: '2026-08-25',
      contact_person: 'NMIET IoT Team',
      contact_phone: '+91-9876543210',
      daily_target_litres: 3000,
      purified_today_litres: 2450
    },
    {
      id: 'JH-RAN-002',
      name: 'Ranchi Model Hand Pump Station (Impure Water Sample)',
      district: 'Ranchi',
      block: 'Ratu / Kanke',
      panchayat: 'Kathitand',
      village: 'Kathitand Basti',
      location_type: 'Contaminated Hand Pump (Demo Station)',
      latitude: 23.3980,
      longitude: 85.2285,
      status: 'UNSAFE',
      filter_health: 12,
      cartridge_install_date: '2026-03-01',
      last_maintenance_date: '2026-05-15',
      contact_person: 'Anita Kumari (Headmistress)',
      contact_phone: '+91-9470129384',
      daily_target_litres: 1800,
      purified_today_litres: 420
    },
    {
      id: 'JH-DHN-001',
      name: 'Jharia Coalfield Community Water Kiosk',
      district: 'Dhanbad',
      block: 'Jharia',
      panchayat: 'Bhaga',
      village: 'Bhaga Colony',
      location_type: 'Village Square',
      latitude: 23.7420,
      longitude: 86.4180,
      status: 'OFFLINE',
      filter_health: 14,
      cartridge_install_date: '2026-05-10',
      last_maintenance_date: '2026-07-02',
      contact_person: 'Bikram Singh (VWSC Member)',
      contact_phone: '+91-9835198273',
      daily_target_litres: 3500,
      purified_today_litres: 2100
    },
    {
      id: 'JH-DHN-002',
      name: 'Gobindpur Health Sub-Centre Station',
      district: 'Dhanbad',
      block: 'Gobindpur',
      panchayat: 'Khairpal',
      village: 'Khairpal',
      location_type: 'Community Health Centre',
      latitude: 23.8340,
      longitude: 86.5160,
      status: 'OFFLINE',
      filter_health: 72,
      cartridge_install_date: '2026-06-20',
      last_maintenance_date: '2026-08-12',
      contact_person: 'Dr. S. K. Choudhary (Medical Officer)',
      contact_phone: '+91-9430198421',
      daily_target_litres: 2000,
      purified_today_litres: 1650
    },
    {
      id: 'JH-BOK-001',
      name: 'Chas Rural Anganwadi Water Point',
      district: 'Bokaro',
      block: 'Chas',
      panchayat: 'Kura',
      village: 'Kura Tola',
      location_type: 'Anganwadi',
      latitude: 23.6360,
      longitude: 86.1780,
      status: 'OFFLINE',
      filter_health: 81,
      cartridge_install_date: '2026-07-10',
      last_maintenance_date: '2026-08-18',
      contact_person: 'Sunita Soren (Anganwadi Sevika)',
      contact_phone: '+91-9934129841',
      daily_target_litres: 1200,
      purified_today_litres: 950
    },
    {
      id: 'JH-KHU-001',
      name: 'Murhu Tribal Community Water Station',
      district: 'Khunti',
      block: 'Murhu',
      panchayat: 'Dungra',
      village: 'Dungra',
      location_type: 'Community Hand Pump',
      latitude: 22.9820,
      longitude: 85.3120,
      status: 'OFFLINE',
      filter_health: 65,
      cartridge_install_date: '2026-06-15',
      last_maintenance_date: '2026-08-05',
      contact_person: 'Birsa Munda (Gram Pradhan)',
      contact_phone: '+91-9471182390',
      daily_target_litres: 2200,
      purified_today_litres: 1780
    },
    {
      id: 'JH-HAZ-001',
      name: 'Barhi Highway Junction Pure Water Post',
      district: 'Hazaribagh',
      block: 'Barhi',
      panchayat: 'Barhi North',
      village: 'Barhi Bazaar',
      location_type: 'Village Square',
      latitude: 24.2980,
      longitude: 85.4210,
      status: 'OFFLINE',
      filter_health: 58,
      cartridge_install_date: '2026-06-01',
      last_maintenance_date: '2026-07-28',
      contact_person: 'Pankaj Kumar (Panchayat Sachiv)',
      contact_phone: '+91-9835728391',
      daily_target_litres: 3000,
      purified_today_litres: 800
    },
    {
      id: 'JH-DUM-001',
      name: 'Jama Tribal Residential School Unit',
      district: 'Dumka',
      block: 'Jama',
      panchayat: 'Chikkania',
      village: 'Chikkania',
      location_type: 'Primary School',
      latitude: 24.3410,
      longitude: 87.2350,
      status: 'OFFLINE',
      filter_health: 89,
      cartridge_install_date: '2026-07-25',
      last_maintenance_date: '2026-08-25',
      contact_person: 'Manish Hembrom (Warden)',
      contact_phone: '+91-9431872341',
      daily_target_litres: 2400,
      purified_today_litres: 1950
    }
  ];

  for (const u of units) {
    await dbAsync.run(
      `INSERT INTO units (
        id, name, district, block, panchayat, village, location_type,
        latitude, longitude, status, filter_health, cartridge_install_date,
        last_maintenance_date, contact_person, contact_phone, daily_target_litres, purified_today_litres
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        u.id, u.name, u.district, u.block, u.panchayat, u.village, u.location_type,
        u.latitude, u.longitude, u.status, u.filter_health, u.cartridge_install_date,
        u.last_maintenance_date, u.contact_person, u.contact_phone, u.daily_target_litres, u.purified_today_litres
      ]
    );
  }
  console.log(`✅ Seeded ${units.length} Jharkhand monitoring units.`);

  // 3. Seed Users with Different Roles & Official IDs
  const passwordHash = await bcrypt.hash('admin123', 10);
  const users = [
    {
      username: 'phed_officer',
      password_hash: passwordHash,
      full_name: 'Er. Rajesh Ranjan',
      designation: 'Sub-Divisional Officer (SDO)',
      id_card_no: 'JH-PHED-8842',
      department: 'PHED Ranchi Division, Govt. of Jharkhand',
      role: 'PHED_OFFICER',
      district: 'Ranchi',
      block: '*',
      assigned_units: '*',
      phone: '+91-9431123456'
    },
    {
      username: 'admin',
      password_hash: passwordHash,
      full_name: 'Er. Sanjay Swarup',
      designation: 'Chief Engineer & State Water Cell Head',
      id_card_no: 'DWSD-HQ-001',
      department: 'Department of Drinking Water & Sanitation (DW&SD)',
      role: 'ADMIN',
      district: 'Jharkhand State',
      block: '*',
      assigned_units: '*',
      phone: '+91-9431000001'
    },
    {
      username: 'sanjeev_je',
      password_hash: passwordHash,
      full_name: 'Er. Sanjeev Toppo',
      designation: 'Junior Engineer (Kanke Section)',
      id_card_no: 'JH-PHED-JE04',
      department: 'PHED Ranchi Circle, Govt. of Jharkhand',
      role: 'PHED_OFFICER',
      district: 'Ranchi',
      block: 'Kanke, Ratu',
      assigned_units: 'JH-RAN-001,JH-RAN-002',
      phone: '+91-9431102948'
    },
    {
      username: 'gram_panchayat',
      password_hash: passwordHash,
      full_name: 'Rameshwar Mahato',
      designation: 'VWSC Jal Sahiya & Village Water Head',
      id_card_no: 'VWSC-RAN-102',
      department: 'Village Water & Sanitation Committee (VWSC)',
      role: 'GP_VWSC',
      district: 'Ranchi',
      block: 'Kanke',
      assigned_units: 'JH-RAN-001',
      phone: '+91-9876543210'
    },
    {
      username: 'citizen',
      password_hash: passwordHash,
      full_name: 'Aadhaar Verified Citizen',
      designation: 'Resident Household',
      id_card_no: 'CITIZEN-001',
      department: 'Public Citizen Portal',
      role: 'PUBLIC',
      district: 'Ranchi',
      block: 'Kanke',
      assigned_units: 'JH-RAN-001,JH-RAN-002',
      phone: '+91-9988776655'
    }
  ];

  for (const u of users) {
    await dbAsync.run(
      `INSERT INTO users (username, password_hash, full_name, designation, id_card_no, department, role, district, block, assigned_units, phone)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [u.username, u.password_hash, u.full_name, u.designation, u.id_card_no, u.department, u.role, u.district, u.block, u.assigned_units, u.phone]
    );
  }
  console.log(`✅ Seeded ${users.length} system users with RBAC roles & Official IDs.`);

  // 4. Seed 7-Day Historical Readings for each unit
  const now = new Date();
  for (const unit of units) {
    // Generate 7 days x 6 readings/day = 42 readings per unit
    for (let day = 6; day >= 0; day--) {
      for (let slot = 0; slot < 6; slot++) {
        // Distribute readings historically leading up to current moment (day 0, slot 5 = now)
        const readingTime = new Date(now.getTime() - (day * 24 * 3600 * 1000) - ((5 - slot) * 3 * 3600 * 1000));
        const timestampIso = readingTime.toISOString();

        let inletPh, inletTds, inletTurb, inletTemp;
        let outletPh, outletTds, outletTurb, outletTemp;
        let bisStatus = 'SAFE';
        let recCycle = 1;
        let recOutcome = 'RELEASED';
        const isBuffered = day > 1 ? 0 : (slot % 4 === 0 ? 1 : 0); // realistic buffered flags

        // Base variations
        if (unit.id === 'JH-RAN-002' || unit.id === 'JH-DHN-001') {
          // Contaminated / Impure water demo station (Ranchi)
          inletPh = Number((5.2 + Math.random() * 0.3).toFixed(2));
          inletTds = Math.round(1380 + Math.random() * 150);
          inletTurb = Number((9.8 + Math.random() * 2.5).toFixed(2));
          inletTemp = Number((28.5 + Math.random() * 1.5).toFixed(1));

          // Choked / Saturated filter outlet (Critical Contamination - UNSAFE)
          outletPh = Number((5.40 + (Math.random() * 0.2 - 0.1)).toFixed(2)); // Critically Acidic (5.40 pH)
          outletTds = Math.round(1180 + Math.random() * 60); // Toxic TDS (1180 ppm > 500)
          outletTurb = Number((6.80 + Math.random() * 0.4).toFixed(2)); // High Turbidity (6.80 NTU > 1.0)
          outletTemp = inletTemp;
          bisStatus = 'UNSAFE';
          recCycle = 3;
          recOutcome = 'HELD'; // Solenoid valve blocked, water held!
        } else if (unit.id === 'JH-HAZ-001' && day === 0) {
          // Offline unit simulated
          continue;
        } else {
          // Clean / NMIET Station Readings
          inletPh = Number((6.8 + Math.random() * 0.6).toFixed(2));
          inletTds = Math.round(380 + Math.random() * 120);
          inletTurb = Number((3.5 + Math.random() * 2.5).toFixed(2));
          inletTemp = Number((25.0 + Math.random() * 3.0).toFixed(1));

          // Clean purified outlet
          outletPh = Number((7.20 + (Math.random() * 0.2 - 0.1)).toFixed(2));
          outletTds = Math.round(81 + Math.random() * 10);
          outletTurb = Number((0.50 + Math.random() * 0.1).toFixed(2));
          outletTemp = inletTemp;
          bisStatus = 'SAFE';
          recCycle = slot % 3 === 0 ? 2 : 1;
          recOutcome = 'RELEASED';
        }

        await dbAsync.run(
          `INSERT INTO readings (
            unit_id, timestamp, inlet_ph, inlet_tds, inlet_turbidity, inlet_temp,
            outlet_ph, outlet_tds, outlet_turbidity, outlet_temp, bis_status,
            recirculation_cycle, recirculation_outcome, is_buffered
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            unit.id, timestampIso, inletPh, inletTds, inletTurb, inletTemp,
            outletPh, outletTds, outletTurb, outletTemp, bisStatus,
            recCycle, recOutcome, isBuffered
          ]
        );
      }
    }
  }
  console.log(`✅ Seeded historical time-series sensor readings.`);

  // 5. Seed Initial Alerts
  const alerts = [
    {
      unit_id: 'JH-DHN-001',
      parameter: 'TDS',
      severity: 'CRITICAL',
      message: 'Critical Water Quality Alert: Outlet TDS 545 mg/L exceeds BIS 10500 standard limit (500 mg/L). Solenoid valve shut.',
      message_hi: 'गंभीर जल गुणवत्ता चेतावनी: आउटलेट TDS 545 mg/L मानक सीमा (500 mg/L) से अधिक है। सोलेनोइड वाल्व बंद किया गया।',
      value_observed: 545,
      threshold_expected: '≤ 500 mg/L',
      status: 'OPEN'
    },
    {
      unit_id: 'JH-DHN-001',
      parameter: 'Filter Life',
      severity: 'WARNING',
      message: 'Predictive Alert: Filter cartridge life at 14%. Membrane scaling detected in Jharia sector.',
      message_hi: 'पूर्वानुमान चेतावनी: फ़िल्टर कार्ट्रिज जीवन 14% पर है। झरिया क्षेत्र में झिल्ली पर जमाव देखा गया।',
      value_observed: 14,
      threshold_expected: '> 20%',
      status: 'ACKNOWLEDGED',
      acknowledged_by: 'Bikram Singh (VWSC Member)',
      acknowledged_at: '2026-09-02 14:30:00'
    },
    {
      unit_id: 'JH-HAZ-001',
      parameter: 'Power',
      severity: 'WARNING',
      message: 'Telemetry Offline: No ping received in past 4 hours from Barhi unit GSM module.',
      message_hi: 'टेलीमेट्री ऑफलाइन: बरही यूनिट जीएसएम मॉड्यूल से पिछले 4 घंटों में कोई पिंग प्राप्त नहीं हुआ।',
      value_observed: 0,
      threshold_expected: 'Live Ping Every 5m',
      status: 'OPEN'
    },
    {
      unit_id: 'JH-KHU-001',
      parameter: 'Turbidity',
      severity: 'INFO',
      message: 'Recirculation Resolved: Inlet turbidity 6.2 NTU normalized to 0.4 NTU in cycle 2.',
      message_hi: 'पुनर्चक्रण समाधान: इनलेट गंदलापन 6.2 NTU चक्र 2 में 0.4 NTU तक सामान्य हो गया।',
      value_observed: 0.4,
      threshold_expected: '≤ 1.0 NTU',
      status: 'RESOLVED',
      acknowledged_by: 'Er. Rajesh Ranjan',
      acknowledged_at: '2026-09-01 10:15:00',
      resolved_by: 'Birsa Munda',
      resolved_at: '2026-09-01 11:30:00'
    }
  ];

  for (const a of alerts) {
    await dbAsync.run(
      `INSERT INTO alerts (
        unit_id, parameter, severity, message, message_hi, value_observed,
        threshold_expected, status, acknowledged_by, acknowledged_at, resolved_by, resolved_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        a.unit_id, a.parameter, a.severity, a.message, a.message_hi, a.value_observed,
        a.threshold_expected, a.status, a.acknowledged_by || null, a.acknowledged_at || null,
        a.resolved_by || null, a.resolved_at || null
      ]
    );
  }
  console.log(`✅ Seeded sample operational and predictive alerts.`);

  // 6. Seed Maintenance Logs
  const maintenanceLogs = [
    {
      unit_id: 'JH-RAN-001',
      officer_name: 'Sanjeev Toppo (PHED Junior Engineer)',
      officer_role: 'PHED Field Staff',
      action_type: 'Filter Cartridge Replacement',
      notes: 'Quarterly composite sediment and activated carbon filter replaced. Post-test TDS at 165 ppm.',
      parts_replaced: '5 Micron Sediment Filter + Carbon Block',
      prev_filter_health: 22,
      new_filter_health: 100,
      timestamp: '2026-08-20 11:00:00'
    },
    {
      unit_id: 'JH-DHN-002',
      officer_name: 'Manoj Tirkey (Technical Assistant)',
      officer_role: 'Field Technician',
      action_type: 'Sensor Calibration',
      notes: 'pH and Turbidity glass electrode sensors cleaned with buffer solution 7.0 and 4.01.',
      parts_replaced: 'None (Calibration Only)',
      prev_filter_health: 72,
      new_filter_health: 72,
      timestamp: '2026-08-12 15:45:00'
    }
  ];

  for (const m of maintenanceLogs) {
    await dbAsync.run(
      `INSERT INTO maintenance_logs (
        unit_id, officer_name, officer_role, action_type, notes, parts_replaced,
        prev_filter_health, new_filter_health, timestamp
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        m.unit_id, m.officer_name, m.officer_role, m.action_type, m.notes,
        m.parts_replaced, m.prev_filter_health, m.new_filter_health, m.timestamp
      ]
    );
  }
  console.log(`✅ Seeded maintenance logs.`);
  console.log('🎉 Seeding complete successfully!');
}

if (require.main === module) {
  seedDatabase().catch((err) => {
    console.error('❌ Seeding failed:', err);
    process.exit(1);
  });
}

module.exports = { seedDatabase };
