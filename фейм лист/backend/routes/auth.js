const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { User } = require('../models/User');
const { check, validationResult } = require('express-validator');

// Валидация регистрации
const registerValidation = [
    check('username').notEmpty().withMessage('Имя пользователя обязательно').isLength({ min: 3 }).withMessage('Минимум 3 символа'),
    check('email').isEmail().withMessage('Некорректный email'),
    check('password').isLength({ min: 6 }).withMessage('Минимум 6 символов')
];

// Валидация входа
const loginValidation = [
    check('username').notEmpty().withMessage('Введите имя пользователя или email'),
    check('password').notEmpty().withMessage('Введите пароль')
];

// Регистрация
router.post('/register', registerValidation, async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                errors: errors.array().reduce((acc, error) => {
                    acc[error.param] = error.msg;
                    return acc;
                }, {})
            });
        }

        const { username, email, password, telegram } = req.body;

        // Проверка существующего пользователя
        const existingUser = await User.findOne({
            where: {
                [Op.or]: [{ username }, { email }]
            }
        });

        if (existingUser) {
            return res.status(400).json({
                success: false,
                message: 'Пользователь с таким именем или email уже существует'
            });
        }

        // Хэширование пароля
        const hashedPassword = await bcrypt.hash(password, 10);

        // Создание пользователя
        const user = await User.create({
            username,
            email,
            password: hashedPassword,
            telegram: telegram || null,
            role: 'user'
        });

        // Создание токена
        const token = jwt.sign(
            { id: user.id, username: user.username, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
        );

        res.status(201).json({
            success: true,
            message: 'Пользователь зарегистрирован',
            token,
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
                telegram: user.telegram,
                role: user.role
            }
        });
    } catch (error) {
        console.error('Ошибка регистрации:', error);
        res.status(500).json({
            success: false,
            message: 'Ошибка сервера при регистрации'
        });
    }
});

// Вход
router.post('/login', loginValidation, async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: errors.array()[0].msg
            });
        }

        const { username, password, remember } = req.body;

        // Поиск пользователя
        const user = await User.findOne({
            where: {
                [Op.or]: [
                    { username: username },
                    { email: username }
                ]
            }
        });

        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'Неверное имя пользователя или email',
                field: 'username'
            });
        }

        // Проверка пароля
        const isValidPassword = await bcrypt.compare(password, user.password);
        if (!isValidPassword) {
            return res.status(401).json({
                success: false,
                message: 'Неверный пароль',
                field: 'password'
            });
        }

        // Создание токена
        const tokenExpiresIn = remember ? '30d' : '7d';
        const token = jwt.sign(
            { id: user.id, username: user.username, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: tokenExpiresIn }
        );

        // Обновление последнего входа
        await user.update({ lastLogin: new Date() });

        res.json({
            success: true,
            message: 'Вход выполнен',
            token,
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
                telegram: user.telegram,
                role: user.role
            }
        });
    } catch (error) {
        console.error('Ошибка входа:', error);
        res.status(500).json({
            success: false,
            message: 'Ошибка сервера при входе'
        });
    }
});

// Проверка токена
router.get('/verify', async (req, res) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        
        if (!token) {
            return res.status(401).json({
                success: false,
                message: 'Токен отсутствует'
            });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findByPk(decoded.id);

        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'Пользователь не найден'
            });
        }

        res.json({
            success: true,
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
                telegram: user.telegram,
                role: user.role
            }
        });
    } catch (error) {
        res.status(401).json({
            success: false,
            message: 'Недействительный токен'
        });
    }
});

// Выход
router.post('/logout', (req, res) => {
    res.json({
        success: true,
        message: 'Выход выполнен'
    });
});

module.exports = router;