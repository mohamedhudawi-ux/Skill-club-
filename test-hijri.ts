import moment from 'moment-hijri';

const now = moment('2026-03-19');
console.log('March 19, 2026 (Default):', now.format('iYYYY/iMM/iDD iMMMM'));
console.log('March 19, 2026 (+1 day):', now.clone().add(1, 'days').format('iYYYY/iMM/iDD iMMMM'));
console.log('March 19, 2026 (+2 days):', now.clone().add(2, 'days').format('iYYYY/iMM/iDD iMMMM'));
