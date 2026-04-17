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

export function getHijriDate(date: Date, offset?: number) {
  const m = moment(date);
  // Re-implement adjustment logic here just for the date
  // Since we need to know if the sunset transition happened, this gets tricky with just a Date object
  // Let's keep it simple: assume moment-hijri handles the conversion of the passed date
  const offsetValue = offset !== undefined ? offset : DEFAULT_HIJRI_OFFSET;
  const hijriDate = m.add(offsetValue, 'days').format('iDD');
  
  // Convert Western numerals to Arabic numerals
  const arabicNumerals = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
  return hijriDate.split('').map(digit => {
    const num = parseInt(digit);
    return isNaN(num) ? digit : arabicNumerals[num];
  }).join('');
}

export function getHijriMonthName(offset?: number) {
  return getAdjustedMoment(offset).format('iMMMM');
}


export function getFullHijriDate(offset?: number) {
  const date = getAdjustedMoment(offset).format('iMMMM iDD, iYYYY');
  // Replace Ramadhan with Ramadan if needed, but moment-hijri uses Ramadhan
  return date.replace('Ramadhan', 'Ramadan');
}

export function getGregorianDate(hijriYear: string, hijriMonth: string, hijriDay: string): string {
  // Format: iYYYY-iMM-iDD
  return moment(`${hijriYear}-${hijriMonth}-${hijriDay}`, 'iYYYY-iMM-iDD').format('YYYY-MM-DD');
}
