import fs from 'fs';
console.log('pharmacy.db size:', fs.statSync('pharmacy.db').size);
console.log('database.sqlite size:', fs.statSync('database.sqlite').size);
