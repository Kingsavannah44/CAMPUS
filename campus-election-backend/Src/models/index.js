const { Sequelize } = require('sequelize');
const config = require('../config/config');


const sequelize = new Sequelize(
config.db.database,
config.db.username,
config.db.password,
{
host: config.db.host,
port: config.db.port,
dialect: config.db.dialect,
logging: config.db.logging
}
);


const db = {};


db.Sequelize = Sequelize;
db.sequelize = sequelize;


// Models
db.User = require('./user')(sequelize, Sequelize);
db.Election = require('./election')(sequelize, Sequelize);
db.Position = require('./position')(sequelize, Sequelize);
db.Candidate = require('./candidate')(sequelize, Sequelize);
db.Vote = require('./vote')(sequelize, Sequelize);


// Associations
// An Election has many Positions
db.Election.hasMany(db.Position, { foreignKey: 'electionId', onDelete: 'CASCADE' });
db.Position.belongsTo(db.Election, { foreignKey: 'electionId' });


// A Position has many Candidates
db.Position.hasMany(db.Candidate, { foreignKey: 'positionId', onDelete: 'CASCADE' });
db.Candidate.belongsTo(db.Position, { foreignKey: 'positionId' });


// User as candidate (optional) -> candidate.userId
db.User.hasOne(db.Candidate, { foreignKey: 'userId' });
db.Candidate.belongsTo(db.User, { foreignKey: 'userId' });


// Votes: User votes for candidate in an election/position
// A Vote belongs to User and Candidate
db.User.hasMany(db.Vote, { foreignKey: 'userId', onDelete: 'CASCADE' });
db.Vote.belongsTo(db.User, { foreignKey: 'userId' });


db.Candidate.hasMany(db.Vote, { foreignKey: 'candidateId', onDelete: 'CASCADE' });
db.Vote.belongsTo(db.Candidate, { foreignKey: 'candidateId' });


module.exports = db;