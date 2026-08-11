/**
 * productionTimeCalculator.js
 *
 * Pure function — zero DB calls, fully unit-testable.
 *
 * Given a stable anchor time and a total hours budget, walks the employee's
 * shift schedule day-by-day and returns the calendar date when work completes.
 *
 * "Stable anchor" design note:
 *   The caller passes a fixed anchor (activeTask.startedAt OR today 09:00).
 *   We do NOT use Date.now() here so Gantt bars remain visually stable
 *   across a demo session rather than shifting every minute.
 *
 * @param {Date}   anchorTime        - Start of calculation (stable, not live clock)
 * @param {number} totalHoursNeeded  - Total production hours to consume
 * @param {Array}  shiftSchedule     - [{date:Date, startTime:"HH:MM", endTime:"HH:MM", isWorkingDay:boolean}]
 * @returns {{ deliveryDate: Date, workingDaysUsed: number, hoursConsumed: number }}
 */
export function computeDeliveryTime(anchorTime, totalHoursNeeded, availabilitySchedule) {
  if (!totalHoursNeeded || totalHoursNeeded <= 0) {
    return { deliveryDate: new Date(anchorTime), workingDaysUsed: 0, hoursConsumed: 0 };
  }

  let remaining      = totalHoursNeeded;
  let workingDays    = 0;
  let hoursConsumed  = 0;
  let deliveryDate   = new Date(anchorTime);

  for (const day of availabilitySchedule) {
    if (!day.isWorkingDay || !day.capacityHours || day.capacityHours <= 0) continue;

    // Standard workday start (we assume 09:00 for the visual anchor timeline)
    const shiftStart = new Date(day.date);
    shiftStart.setHours(9, 0, 0, 0);

    const shiftEnd = new Date(day.date);
    shiftEnd.setHours(9 + Math.floor(day.capacityHours), (day.capacityHours % 1) * 60, 0, 0);

    // First day check: start from max of anchorTime or shiftStart
    const effectiveStart = (workingDays === 0 && anchorTime > shiftStart)
      ? anchorTime
      : shiftStart;

    if (effectiveStart >= shiftEnd) continue;

    const availableMs    = shiftEnd - effectiveStart;
    const availableHours = availableMs / (1000 * 60 * 60);

    if (availableHours <= 0) continue;

    workingDays++;

    if (remaining <= availableHours) {
      const deliveryMs = effectiveStart.getTime() + remaining * 60 * 60 * 1000;
      deliveryDate = new Date(deliveryMs);
      hoursConsumed += remaining;
      remaining = 0;
      break;
    }

    hoursConsumed += availableHours;
    remaining     -= availableHours;
    deliveryDate   = new Date(shiftEnd);
  }

  // Safety extension if calendar ends before consumption finishes
  if (remaining > 0) {
    const lastDay = availabilitySchedule[availabilitySchedule.length - 1];
    if (lastDay) {
      deliveryDate = new Date(lastDay.date);
      deliveryDate.setHours(18, 0, 0, 0); // standard 18:00 cutoff
    }
  }

  return { deliveryDate, workingDaysUsed: workingDays, hoursConsumed };
}
