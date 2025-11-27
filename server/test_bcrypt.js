import * as bcrypt from 'bcryptjs';
console.log('bcrypt imported:', bcrypt);
try {
    const hash = bcrypt.hashSync('test', 10);
    console.log('Hash success:', hash);
} catch (e) {
    console.error('Hash failed:', e);
}
