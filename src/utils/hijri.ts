import moment from 'moment-hijri';

moment.locale('en');

const DEFAULT_HIJRI_OFFSET = -1; // Base offset for India

/**
 * Returns the current moment adjusted for the Hijri day transition at Maghrib.
 * In Islamic calendar, the new day starts at sunset.
 * We approximate Maghrib at 18:30 (6:30 PM).
 */
function getAdjustedMoment(customOffset?: number) {
  const now = moment();
  const hour = now.hour();
  const minute = now.minute();
  
  const offset = customOffset !== undefined ? customOffset : DEFAULT_HIJRI_OFFSET;
  
  // If it's after 6:30 PM, it's already the next Hijri day
  if (hour > 18 || (hour === 18 && minute >= 30)) {
    return now.add(offset + 1, 'days');
  }
  
  return now.add(offset, 'days');
}

export function getHijriDate(offset?: number) {
  return getAdjustedMoment(offset).format('iYYYY/iMM/iDD');
}

export function getHijriMonthName(offset?: number) {
  return getAdjustedMoment(offset).format('iMMMM');
}

export function getFullHijriDate(offset?: number) {
  const date = getAdjustedMoment(offset).format('iMMMM iDD, iYYYY');
  // Replace Ramadhan with Ramadan if needed, but moment-hijri uses Ramadhan
  return date.replace('Ramadhan', 'Ramadan');
}
