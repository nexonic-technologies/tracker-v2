// Backend/src/scripts/seedDefaultAttendancePolicy.js
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import AttendancePolicy from '../models/AttendancePolicy.js';
import { Shift } from '../models/Shift.js';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/tracker';

async function seedDefaultPolicy() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);

    // 1. Ensure default shift exists
    let defaultShift = await Shift.findOne({ name: 'Standard Morning Shift' });
    if (!defaultShift) {
      defaultShift = await Shift.create({
        name: 'Standard Morning Shift',
        startTime: '09:30',
        endTime: '18:00',
        breakDuration: 60,
        workingHours: 8.0,
        weeklyOff: ['Sunday'],
        alternateWeeklyOff: 'SecondFourthSaturday',
        isActive: true
      });
      console.log('✅ Standard Morning Shift created:', defaultShift._id);
    } else {
      console.log('ℹ️ Standard Morning Shift already exists:', defaultShift._id);
    }

    // 2. Ensure default policy exists
    let defaultPolicy = await AttendancePolicy.findOne({ name: 'Default Corporate Policy' });
    if (!defaultPolicy) {
      defaultPolicy = await AttendancePolicy.create({
        name: 'Default Corporate Policy',
        description: 'Standard company-wide attendance and punctuality policy',
        status: 'Active',
        version: 1,
        assignmentType: 'Company',
        shiftConfig: {
          defaultShiftId: defaultShift._id,
          allowFlexibleTiming: false,
          graceMinutesCheckIn: 15,
          graceMinutesCheckOut: 15
        },
        attendanceRules: {
          fullDayMinHours: 8.0,
          halfDayMinHours: 4.0,
          absentMinHours: 2.0,
          lateMarkCutoffMins: 15,
          earlyExitCutoffMins: 15,
          lateMarksForHalfDay: 3,
          missingPunchAction: 'RegularizationRequired'
        },
        overtimeRules: {
          enabled: true,
          overtimeThresholdMins: 480,
          minOvertimeMins: 60,
          maxOvertimeMinsPerDay: 240,
          roundToNearestMins: 15,
          weekdayMultiplier: 1.25,
          weekendMultiplier: 1.5,
          holidayMultiplier: 2.0
        },
        fineAndLopRules: {
          enableLateFines: false,
          lateFineType: 'Fixed',
          lateFineAmount: 0,
          sandwichRuleEnabled: false
        },
        permissionRules: {
          enabled: true,
          monthlyMaxHours: 2.0
        }
      });
      console.log('✅ Default Corporate Policy created:', defaultPolicy._id);
    } else {
      console.log('ℹ️ Default Corporate Policy already exists:', defaultPolicy._id);
    }

    console.log('🎉 Default Attendance Policy Seeding Complete.');
  } catch (err) {
    console.error('❌ Seeding failed:', err);
  } finally {
    await mongoose.disconnect();
  }
}

seedDefaultPolicy();
