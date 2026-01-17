const { Sequelize } = require('sequelize');
require('dotenv').config();

const sequelize = new Sequelize(
    process.env.DB_NAME || 'noolshy_fame',
    process.env.DB_USER || 'root',
    process.env.DB_PASSWORD || '',
    {
        host: process.env.DB_HOST || 'localhost',
        port: process.env.DB_PORT || 3306,
        dialect: 'mysql',
        logging: process.env.NODE_ENV === 'development' ? console.log : false,
        pool: {
            max: 5,
            min: 0,
            acquire: 30000,
            idle: 10000
        }
    }
);

// Тестирование подключения
async function testConnection() {
    try {
        await sequelize.authenticate();
        console.log('Подключение к БД успешно установлено');
        return true;
    } catch (error) {
        console.error('Ошибка подключения к БД:', error);
        return false;
    }
}

// Синхронизация моделей
async function syncModels() {
    try {
        await sequelize.sync({ alter: process.env.NODE_ENV === 'development' });
        console.log('Модели синхронизированы');
    } catch (error) {
        console.error('Ошибка синхронизации моделей:', error);
    }
}

// Инициализация
async function initialize() {
    const connected = await testConnection();
    if (connected) {
        await syncModels();
        
        // Создание администратора по умолчанию если нет пользователей
        const { User } = require('./models/User');
        const bcrypt = require('bcryptjs');
        
        const adminExists = await User.findOne({ where: { username: 'admin' } });
        if (!adminExists) {
            const hashedPassword = await bcrypt.hash('admin123', 10);
            await User.create({
                username: 'admin',
                email: 'admin@noolshy.com',
                password: hashedPassword,
                role: 'admin'
            });
            console.log('Администратор по умолчанию создан');
        }
    }
}

module.exports = {
    sequelize,
    connect: testConnection,
    initialize
};