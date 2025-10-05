require('dotenv').config();
module.exports = {
port: process.env.PORT || 4000,
db: {
host: process.env.DATABASE_HOST || 'localhost',
port: process.env.DATABASE_PORT || 3306,
database: process.env.DATABASE_NAME || 'campus_election',
username: process.env.DATABASE_USER || 'root',
password: process.env.DATABASE_PASS || '',
dialect: 'mysql',
logging: false
},
jwt: {
secret: process.env.JWT_SECRET || 'secret',
expiresIn: process.env.JWT_EXPIRES_IN || '7d'
},
bcryptSaltRounds: parseInt(process.env.BCRYPT_SALT_ROUNDS || '10', 10)
};