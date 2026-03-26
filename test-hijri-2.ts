import moment from 'moment-hijri';

moment.locale('en');

const date = moment('2026-03-20');
console.log('2026-03-20 Hijri (no offset):', date.format('iMMMM iDD, iYYYY'));

const offset = -1;
const adjusted = moment('2026-03-20').add(offset, 'days');
console.log('2026-03-20 Hijri (offset -1):', adjusted.format('iMMMM iDD, iYYYY'));

