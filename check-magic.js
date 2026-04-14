import fs from 'fs';
const buffer = fs.readFileSync('pharmacy.db');
console.log(buffer.slice(0, 32).toString('hex'));
console.log(buffer.slice(0, 32).toString('utf8'));
