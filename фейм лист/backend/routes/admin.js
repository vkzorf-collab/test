const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { Member } = require('../models/Member');
const auth = require('../middleware/auth');

// Настройка multer для загрузки файлов
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const uploadPath = path.join(__dirname, '../../frontend/img');
        // Создаем папку если не существует
        if (!fs.existsSync(uploadPath)) {
            fs.mkdirSync(uploadPath, { recursive: true });
        }
        cb(null, uploadPath);
    },
    filename: function (req, file, cb) {
        const memberId = req.body.memberId || 'temp';
        const ext = path.extname(file.originalname);
        const filename = `avatar${memberId}${ext}`;
        cb(null, filename);
    }
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
    fileFilter: function (req, file, cb) {
        const filetypes = /jpeg|jpg|png|gif|webp/;
        const mimetype = filetypes.test(file.mimetype);
        const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
        
        if (mimetype && extname) {
            return cb(null, true);
        }
        cb(new Error('Разрешены только изображения (jpeg, jpg, png, gif, webp)'));
    }
});

// Получение всех участников
router.get('/members', auth(['admin', 'moderator']), async (req, res) => {
    try {
        const members = await Member.findAll({
            order: [['id', 'ASC']]
        });
        
        res.json({
            success: true,
            members
        });
    } catch (error) {
        console.error('Ошибка получения участников:', error);
        res.status(500).json({
            success: false,
            message: 'Ошибка сервера'
        });
    }
});

// Получение следующего ID для участника
router.get('/next-id', auth(['admin', 'moderator']), async (req, res) => {
    try {
        const lastMember = await Member.findOne({
            order: [['id', 'DESC']]
        });
        
        const nextId = lastMember ? lastMember.id + 1 : 1;
        
        res.json({
            success: true,
            nextId
        });
    } catch (error) {
        console.error('Ошибка получения ID:', error);
        res.status(500).json({
            success: false,
            message: 'Ошибка сервера'
        });
    }
});

// Добавление нового участника
router.post('/members', auth(['admin', 'moderator']), async (req, res) => {
    try {
        const memberData = req.body;
        
        // Валидация
        if (!memberData.nickname || !memberData.category) {
            return res.status(400).json({
                success: false,
                message: 'Заполните обязательные поля'
            });
        }
        
        // Получаем следующий ID
        const lastMember = await Member.findOne({
            order: [['id', 'DESC']]
        });
        const nextId = lastMember ? lastMember.id + 1 : 1;
        
        // Создание участника
        const member = await Member.create({
            id: nextId,
            ...memberData,
            verified: memberData.verified || false,
            pinned: memberData.pinned || false,
            scam: memberData.scam || false
        });
        
        res.status(201).json({
            success: true,
            message: 'Участник добавлен',
            member
        });
    } catch (error) {
        console.error('Ошибка добавления участника:', error);
        res.status(500).json({
            success: false,
            message: 'Ошибка сервера'
        });
    }
});

// Загрузка аватарки
router.post('/upload-avatar', auth(['admin', 'moderator']), upload.single('avatar'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: 'Файл не загружен'
            });
        }
        
        const memberId = req.body.memberId;
        
        res.json({
            success: true,
            message: 'Аватарка загружена',
            filename: req.file.filename,
            path: `/img/${req.file.filename}`
        });
    } catch (error) {
        console.error('Ошибка загрузки аватарки:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Ошибка загрузки файла'
        });
    }
});

// Обновление участника
router.put('/members/:id', auth(['admin', 'moderator']), async (req, res) => {
    try {
        const member = await Member.findByPk(req.params.id);
        
        if (!member) {
            return res.status(404).json({
                success: false,
                message: 'Участник не найден'
            });
        }
        
        await member.update(req.body);
        
        res.json({
            success: true,
            message: 'Участник обновлен',
            member
        });
    } catch (error) {
        console.error('Ошибка обновления участника:', error);
        res.status(500).json({
            success: false,
            message: 'Ошибка сервера'
        });
    }
});

// Удаление участника
router.delete('/members/:id', auth(['admin']), async (req, res) => {
    try {
        const member = await Member.findByPk(req.params.id);
        
        if (!member) {
            return res.status(404).json({
                success: false,
                message: 'Участник не найден'
            });
        }
        
        // Удаляем аватарку если есть
        if (member.avatar) {
            const avatarPath = path.join(__dirname, '../../frontend/img', member.avatar);
            if (fs.existsSync(avatarPath)) {
                fs.unlinkSync(avatarPath);
            }
        }
        
        await member.destroy();
        
        res.json({
            success: true,
            message: 'Участник удален'
        });
    } catch (error) {
        console.error('Ошибка удаления участника:', error);
        res.status(500).json({
            success: false,
            message: 'Ошибка сервера'
        });
    }
});

// Получение статистики
router.get('/stats', auth(['admin', 'moderator']), async (req, res) => {
    try {
        const totalMembers = await Member.count();
        const totalApplications = await require('../models/Application').count();
        const pendingApplications = await require('../models/Application').count({
            where: { status: 'pending' }
        });
        const totalUsers = await require('../models/User').count();
        
        res.json({
            success: true,
            stats: {
                totalMembers,
                totalApplications,
                pendingApplications,
                totalUsers,
                membersByCategory: await Member.count({
                    group: ['category'],
                    attributes: ['category', [sequelize.fn('COUNT', 'category'), 'count']]
                })
            }
        });
    } catch (error) {
        console.error('Ошибка получения статистики:', error);
        res.status(500).json({
            success: false,
            message: 'Ошибка сервера'
        });
    }
});

module.exports = router;