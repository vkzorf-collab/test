const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const { User } = require('./User');

const Application = sequelize.define('Application', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    nickname: {
        type: DataTypes.STRING(100),
        allowNull: false
    },
    telegram: {
        type: DataTypes.STRING(50),
        allowNull: false
    },
    category: {
        type: DataTypes.STRING(50),
        allowNull: false
    },
    description: {
        type: DataTypes.TEXT,
        allowNull: false
    },
    links: {
        type: DataTypes.JSON,
        allowNull: true,
        defaultValue: []
    },
    avatar: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    status: {
        type: DataTypes.ENUM('pending', 'approved', 'rejected'),
        defaultValue: 'pending'
    },
    rejectionReason: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    processedAt: {
        type: DataTypes.DATE,
        allowNull: true
    },
    processedBy: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
            model: User,
            key: 'id'
        }
    },
    userId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: User,
            key: 'id'
        }
    }
}, {
    tableName: 'applications',
    timestamps: true
});

// Связи
Application.belongsTo(User, { foreignKey: 'userId' });
User.hasMany(Application, { foreignKey: 'userId' });

module.exports = { Application };