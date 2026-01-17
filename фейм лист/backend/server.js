const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');
require('dotenv').config();

const app = express();

// Middleware
app.use(cors());
app.use(helmet());
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Статические файлы
app.use(express.static(path.join(__dirname, '../frontend')));
app.use('/admin-panel', express.static(path.join(__dirname, '../admin-panel')));

// Подключение к базе данных
const db = require('./config/database');

// Подключение маршрутов
const authRoutes = require('./routes/auth');
const applicationRoutes = require('./routes/applications');
const adminRoutes = require('./routes/admin');

app.use('/api/auth', authRoutes);
app.use('/api/applications', applicationRoutes);
app.use('/api/admin', adminRoutes);

// Главный маршрут
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

// Обработка 404
app.use((req, res) => {
    res.status(404).json({ success: false, message: 'Маршрут не найден' });
});

// Обработка ошибок
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ success: false, message: 'Внутренняя ошибка сервера' });
});

const PORT = process.env.PORT || 3000;

db.connect()
    .then(() => {
        app.listen(PORT, () => {
            console.log(`Сервер запущен на порту ${PORT}`);
        });
    })
    .catch(err => {
        console.error('Ошибка подключения к БД:', err);
        process.exit(1);
    });

module.exports = app;