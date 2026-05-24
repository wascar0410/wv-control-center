const bcryptjs = require('bcryptjs');

const password = 'WVTransportQA2026!Temp';
const hash = bcryptjs.hashSync(password, 10);
console.log('Hash:', hash);
