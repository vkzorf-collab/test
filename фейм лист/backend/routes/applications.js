const express = require('express');
const router = express.Router();
const { Application } = require('../models/Application');
const { User } = require('../models/User');
const auth = require('../middleware/auth');

// Получение всех заявок (только для админов/модераторов)
router.get('/', auth(['admin', 'moderator']), async (req, res) => {
    try {
        const { status, page = 1, limit = 20 } = req.query;
        
        const where = {};
        if (status) where.status = status;
        
        const applications = await Application.findAndCountAll({
            where,
            include: [{
                model: User,
                attributes: ['id', 'username', 'email', 'telegram']
            }],
            order: [['createdAt', 'DESC']],
            limit: parseInt(limit),
            offset: (parseInt(page) - 1) * parseInt(limit)
        });
        
        res.json({
            success: true,
            applications: applications.rows,
            total: applications.count,
            page: parseInt(page),
            totalPages: Math.ceil(applications.count / limit)
        });
    } catch (error) {
        console.error('Ошибка получения заявок:', error);
        res.status(500).json({
            success: false,
            message: 'Ошибка сервера'
        });
    }
});

// Получение заявок текущего пользователя
router.get('/my', auth(['user', 'admin', 'moderator']), async (req, res) => {
    try {
        const applications = await Application.findAll({
            where: { userId: req.user.id },
            order: [['createdAt', 'DESC']]
        });
        
        res.json({
            success: true,
            applications
        });
    } catch (error) {
        console.error('Ошибка получения заявок:', error);
        res.status(500).json({
            success: false,
            message: 'Ошибка сервера'
        });
    }
});

// Отправка заявки
router.post('/', auth(['user', 'admin', 'moderator']), async (req, res) => {
    try {
        const { nickname, telegram, category, description, links, avatar } = req.body;
        
        // Валидация
        if (!nickname || !telegram || !category || !description) {
            return res.status(400).json({
                success: false,
                message: 'Заполните все обязательные поля'
            });
        }
        
        // Проверка на дубликат
        const existingApplication = await Application.findOne({
            where: {
                userId: req.user.id,
                status: 'pending'
            }
        });
        
        if (existingApplication) {
            return res.status(400).json({
                success: false,
                message: 'У вас уже есть активная заявка на рассмотрении'
            });
        }
        
        // Создание заявки
        const application = await Application.create({
            nickname,
            telegram,
            category,
            description,
            links: links || [],
            avatar: avatar || null,
            userId: req.user.id,
            status: 'pending'
        });
        
        // Здесь можно добавить уведомление для админов (например, через WebSocket или email)
        
        res.status(201).json({
            success: true,
            message: 'Заявка отправлена на рассмотрение',
            application
        });
    } catch (error) {
        console.error('Ошибка отправки заявки:', error);
        res.status(500).json({
            success: false,
            message: 'Ошибка сервера при отправке заявки'
        });
    }
});

// Получение заявки по ID
router.get('/:id', auth(['admin', 'moderator']), async (req, res) => {
    try {
        const application = await Application.findByPk(req.params.id, {
            include: [{
                model: User,
                attributes: ['id', 'username', 'email', 'telegram']
            }]
        });
        
        if (!application) {
            return res.status(404).json({
                success: false,
                message: 'Заявка не найдена'
            });
        }
        
        res.json({
            success: true,
            application
        });
    } catch (error) {
        console.error('Ошибка получения заявки:', error);
        res.status(500).json({
            success: false,
            message: 'Ошибка сервера'
        });
    }
});

// Обновление статуса заявки (принятие/отклонение)
router.put('/:id/status', auth(['admin', 'moderator']), async (req, res) => {
    try {
        const { status, rejectionReason } = req.body;
        
        if (!['approved', 'rejected'].includes(status)) {
            return res.status(400).json({
                success: false,
                message: 'Неверный статус'
            });
        }
        
        const application = await Application.findByPk(req.params.id, {
            include: [User]
        });
        
        if (!application) {
            return res.status(404).json({
                success: false,
                message: 'Заявка не найдена'
            });
        }
        
        if (application.status !== 'pending') {
            return res.status(400).json({
                success: false,
                message: 'Заявка уже обработана'
            });
        }
        
        // Обновление статуса
        await application.update({
            status,
            rejectionReason: status === 'rejected' ? rejectionReason : null,
            processedAt: new Date(),
            processedBy: req.user.id
        });
        
        // Если заявка принята, вызываем скрипт для добавления участника
        if (status === 'approved') {
            // Здесь будет вызов скрипта добавления участника
            // Пока просто возвращаем успех
        }
        
        // Здесь можно добавить уведомление пользователю
        
        res.json({
            success: true,
            message: `Заявка ${status === 'approved' ? 'принята' : 'отклонена'}`,
            application
        });
    } catch (error) {
        console.error('Ошибка обновления статуса:', error);
        res.status(500).json({
            success: false,
            message: 'Ошибка сервера'
        });
    }
});

module.exports = router;