// Админ-панель
const API_BASE_URL = 'http://localhost:3000/api';
let currentAdminUser = null;
let currentPage = {
    applications: 1,
    members: 1,
    users: 1
};
const itemsPerPage = 20;

// Инициализация админ-панели
document.addEventListener('DOMContentLoaded', function() {
    checkAdminAuth();
    initAdminNavigation();
    initAdminEvents();
    
    // Проверяем аутентификацию каждые 5 минут
    setInterval(checkAdminAuth, 300000);
});

// Проверка аутентификации администратора
function checkAdminAuth() {
    const token = localStorage.getItem('auth_token');
    
    if (!token) {
        window.location.href = '/';
        return;
    }
    
    fetch(`${API_BASE_URL}/auth/verify`, {
        headers: {
            'Authorization': `Bearer ${token}`
        }
    })
    .then(response => response.json())
    .then(data => {
        if (data.success && (data.user.role === 'admin' || data.user.role === 'moderator')) {
            currentAdminUser = data.user;
            updateAdminUI();
            loadDashboardStats();
            loadApplications();
        } else {
            showNotification('Доступ запрещен', 'У вас нет прав для доступа к админ-панели', 'error');
            setTimeout(() => {
                window.location.href = '/';
            }, 2000);
        }
    })
    .catch(error => {
        console.error('Ошибка проверки аутентификации:', error);
        showNotification('Ошибка', 'Не удалось проверить авторизацию', 'error');
    });
}

// Обновление интерфейса админ-панели
function updateAdminUI() {
    if (currentAdminUser) {
        // Обновление информации администратора
        document.getElementById('admin-avatar').textContent = currentAdminUser.username.charAt(0).toUpperCase();
        document.getElementById('admin-username').textContent = currentAdminUser.username;
        document.getElementById('admin-role').textContent = 
            currentAdminUser.role === 'admin' ? 'администратор' : 'модератор';
    }
}

// Инициализация навигации
function initAdminNavigation() {
    const navBtns = document.querySelectorAll('.nav-btn');
    const sections = document.querySelectorAll('.section');
    
    navBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            if (this.dataset.section === 'dashboard') {
                loadDashboardStats();
            } else if (this.dataset.section === 'applications') {
                loadApplications();
            } else if (this.dataset.section === 'members') {
                loadMembers();
            } else if (this.dataset.section === 'users') {
                loadUsers();
            }
            
            // Обновление активных кнопок
            navBtns.forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            
            // Обновление активных секций
            sections.forEach(section => section.classList.remove('active-section'));
            document.getElementById(`${this.dataset.section}-section`).classList.add('active-section');
            
            // Обновление заголовка
            document.getElementById('page-title').textContent = this.textContent.trim();
        });
    });
}

// Инициализация событий
function initAdminEvents() {
    // Кнопка обновления
    document.getElementById('refresh-btn').addEventListener('click', function() {
        const activeSection = document.querySelector('.section.active-section').id;
        
        if (activeSection === 'dashboard-section') {
            loadDashboardStats();
            showNotification('Обновлено', 'Данные дашборда обновлены', 'success');
        } else if (activeSection === 'applications-section') {
            loadApplications();
            showNotification('Обновлено', 'Список заявок обновлен', 'success');
        } else if (activeSection === 'members-section') {
            loadMembers();
            showNotification('Обновлено', 'Список участников обновлен', 'success');
        } else if (activeSection === 'users-section') {
            loadUsers();
            showNotification('Обновлено', 'Список пользователей обновлен', 'success');
        }
    });
    
    // Кнопка добавления участника
    document.getElementById('add-member-btn').addEventListener('click', function() {
        openAddMemberModal();
    });
    
    document.getElementById('new-member-btn').addEventListener('click', function() {
        openAddMemberModal();
    });
    
    // Кнопка выхода
    document.getElementById('logout-btn').addEventListener('click', function() {
        logoutAdmin();
    });
    
    // Фильтр заявок
    document.getElementById('status-filter').addEventListener('change', loadApplications);
    document.getElementById('category-filter').addEventListener('change', loadApplications);
    document.getElementById('applications-search').addEventListener('input', debounce(loadApplications, 500));
    
    // Закрытие модальных окон
    document.querySelectorAll('.close-modal').forEach(btn => {
        btn.addEventListener('click', function() {
            this.closest('.modal').classList.remove('active');
        });
    });
    
    document.querySelectorAll('.modal').forEach(modal => {
        modal.addEventListener('click', function(e) {
            if (e.target === this) {
                this.classList.remove('active');
            }
        });
    });
}

// Функция дебаунса
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Загрузка статистики дашборда
function loadDashboardStats() {
    const token = localStorage.getItem('auth_token');
    
    // Загрузка общей статистики
    fetch(`${API_BASE_URL}/admin/stats`, {
        headers: {
            'Authorization': `Bearer ${token}`
        }
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            // Обновление счетчиков
            document.getElementById('total-members').textContent = data.stats.totalMembers;
            document.getElementById('total-users').textContent = data.stats.totalUsers;
            document.getElementById('pending-applications').textContent = data.stats.pendingApplications;
            
            // Обновление значка на кнопке заявок
            document.getElementById('pending-count').textContent = data.stats.pendingApplications;
            
            // Поиск скам-участников
            fetch(`${API_BASE_URL}/admin/members`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            })
            .then(response => response.json())
            .then(membersData => {
                if (membersData.success) {
                    const scamMembers = membersData.members.filter(m => m.scam).length;
                    document.getElementById('scam-members').textContent = scamMembers;
                }
            });
            
            // Загрузка последних заявок
            loadRecentApplications();
            
            // Загрузка последних участников
            loadRecentMembers();
        }
    })
    .catch(error => {
        console.error('Ошибка загрузки статистики:', error);
        showNotification('Ошибка', 'Не удалось загрузить статистику', 'error');
    });
}

// Загрузка последних заявок
function loadRecentApplications() {
    const token = localStorage.getItem('auth_token');
    
    fetch(`${API_BASE_URL}/applications?status=pending&limit=5&page=1`, {
        headers: {
            'Authorization': `Bearer ${token}`
        }
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            const container = document.getElementById('recent-applications');
            if (data.applications.length === 0) {
                container.innerHTML = `
                    <div class="empty-state">
                        <i class="fas fa-inbox" style="font-size: 2rem; opacity: 0.5;"></i>
                        <p style="margin-top: 10px; color: #666;">Нет заявок на рассмотрении</p>
                    </div>
                `;
                return;
            }
            
            let html = '';
            data.applications.forEach(app => {
                html += `
                    <div class="application-item">
                        <div class="activity-icon">
                            <i class="fas fa-paper-plane"></i>
                        </div>
                        <div class="activity-details">
                            <p><strong>${app.nickname}</strong> - ${app.category}</p>
                            <div class="activity-time">
                                ${new Date(app.createdAt).toLocaleDateString('ru-RU')}
                            </div>
                        </div>
                        <button class="table-btn view" onclick="viewApplication(${app.id})">
                            <i class="fas fa-eye"></i>
                        </button>
                    </div>
                `;
            });
            
            container.innerHTML = html;
        }
    })
    .catch(error => {
        console.error('Ошибка загрузки заявок:', error);
    });
}

// Загрузка последних участников
function loadRecentMembers() {
    const token = localStorage.getItem('auth_token');
    
    fetch(`${API_BASE_URL}/admin/members?limit=5`, {
        headers: {
            'Authorization': `Bearer ${token}`
        }
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            const container = document.getElementById('recent-members');
            if (data.members.length === 0) {
                container.innerHTML = `
                    <div class="empty-state">
                        <i class="fas fa-users" style="font-size: 2rem; opacity: 0.5;"></i>
                        <p style="margin-top: 10px; color: #666;">Нет участников</p>
                    </div>
                `;
                return;
            }
            
            let html = '';
            data.members.slice(0, 5).forEach(member => {
                html += `
                    <div class="activity-item">
                        <div class="activity-icon">
                            <i class="fas fa-user"></i>
                        </div>
                        <div class="activity-details">
                            <p><strong>${member.nickname}</strong> - ${member.category}</p>
                            <div class="activity-time">
                                Добавлен ${new Date(member.createdAt).toLocaleDateString('ru-RU')}
                            </div>
                        </div>
                        <button class="table-btn edit" onclick="editMember(${member.id})">
                            <i class="fas fa-edit"></i>
                        </button>
                    </div>
                `;
            });
            
            container.innerHTML = html;
        }
    })
    .catch(error => {
        console.error('Ошибка загрузки участников:', error);
    });
}

// Загрузка заявок
function loadApplications() {
    const token = localStorage.getItem('auth_token');
    const status = document.getElementById('status-filter').value;
    const category = document.getElementById('category-filter').value;
    const search = document.getElementById('applications-search').value;
    const page = currentPage.applications;
    
    let url = `${API_BASE_URL}/applications?page=${page}&limit=${itemsPerPage}`;
    
    if (status !== 'all') url += `&status=${status}`;
    if (category !== 'all') url += `&category=${category}`;
    if (search) url += `&search=${encodeURIComponent(search)}`;
    
    const tableBody = document.querySelector('#applications-table tbody');
    tableBody.innerHTML = `
        <tr>
            <td colspan="8" class="loading-cell">
                <i class="fas fa-spinner fa-spin"></i> Загрузка заявок...
            </td>
        </tr>
    `;
    
    fetch(url, {
        headers: {
            'Authorization': `Bearer ${token}`
        }
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            renderApplicationsTable(data.applications, data.total, page);
            updatePagination('applications', data.total, page);
        } else {
            showNotification('Ошибка', 'Не удалось загрузить заявки', 'error');
        }
    })
    .catch(error => {
        console.error('Ошибка загрузки заявок:', error);
        tableBody.innerHTML = `
            <tr>
                <td colspan="8" class="loading-cell" style="color: #ff4444;">
                    <i class="fas fa-exclamation-triangle"></i> Ошибка загрузки
                </td>
            </tr>
        `;
    });
}

// Отображение таблицы заявок
function renderApplicationsTable(applications, total, page) {
    const tableBody = document.querySelector('#applications-table tbody');
    
    if (applications.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="8" class="loading-cell">
                    <i class="fas fa-inbox"></i> Нет заявок
                </td>
            </tr>
        `;
        return;
    }
    
    let html = '';
    applications.forEach(app => {
        let statusClass = 'status-pending';
        let statusText = 'На рассмотрении';
        
        if (app.status === 'approved') {
            statusClass = 'status-approved';
            statusText = 'Принята';
        } else if (app.status === 'rejected') {
            statusClass = 'status-rejected';
            statusText = 'Отклонена';
        }
        
        html += `
            <tr>
                <td>${app.id}</td>
                <td><strong>${app.nickname}</strong></td>
                <td>${app.category}</td>
                <td><a href="https://t.me/${app.telegram}" target="_blank">@${app.telegram}</a></td>
                <td>${app.User ? app.User.username : 'Неизвестно'}</td>
                <td>${new Date(app.createdAt).toLocaleDateString('ru-RU')}</td>
                <td><span class="status-badge ${statusClass}">${statusText}</span></td>
                <td class="table-actions">
                    <button class="table-btn view" onclick="viewApplication(${app.id})" title="Просмотр">
                        <i class="fas fa-eye"></i>
                    </button>
                    ${app.status === 'pending' ? `
                        <button class="table-btn edit" onclick="approveApplication(${app.id})" title="Принять">
                            <i class="fas fa-check"></i>
                        </button>
                        <button class="table-btn delete" onclick="rejectApplication(${app.id})" title="Отклонить">
                            <i class="fas fa-times"></i>
                        </button>
                    ` : ''}
                </td>
            </tr>
        `;
    });
    
    tableBody.innerHTML = html;
}

// Просмотр заявки
function viewApplication(applicationId) {
    const token = localStorage.getItem('auth_token');
    
    fetch(`${API_BASE_URL}/applications/${applicationId}`, {
        headers: {
            'Authorization': `Bearer ${token}`
        }
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            const application = data.application;
            const modal = document.getElementById('application-modal');
            const title = document.getElementById('application-modal-title');
            const body = document.getElementById('application-modal-body');
            
            title.textContent = `Заявка #${application.id} - ${application.nickname}`;
            
            let statusText = 'На рассмотрении';
            let statusClass = 'status-pending';
            
            if (application.status === 'approved') {
                statusText = 'Принята';
                statusClass = 'status-approved';
            } else if (application.status === 'rejected') {
                statusText = 'Отклонена';
                statusClass = 'status-rejected';
            }
            
            body.innerHTML = `
                <div class="application-details">
                    <div class="detail-row">
                        <div class="detail-label">Никнейм:</div>
                        <div class="detail-value">${application.nickname}</div>
                    </div>
                    
                    <div class="detail-row">
                        <div class="detail-label">Telegram:</div>
                        <div class="detail-value">
                            <a href="https://t.me/${application.telegram}" target="_blank">@${application.telegram}</a>
                        </div>
                    </div>
                    
                    <div class="detail-row">
                        <div class="detail-label">Категория:</div>
                        <div class="detail-value">${application.category}</div>
                    </div>
                    
                    <div class="detail-row">
                        <div class="detail-label">Статус:</div>
                        <div class="detail-value">
                            <span class="status-badge ${statusClass}">${statusText}</span>
                        </div>
                    </div>
                    
                    <div class="detail-row">
                        <div class="detail-label">Пользователь:</div>
                        <div class="detail-value">
                            ${application.User ? application.User.username : 'Неизвестно'}
                            ${application.User && application.User.email ? `<br><small>${application.User.email}</small>` : ''}
                        </div>
                    </div>
                    
                    <div class="detail-row">
                        <div class="detail-label">Дата отправки:</div>
                        <div class="detail-value">${new Date(application.createdAt).toLocaleString('ru-RU')}</div>
                    </div>
                    
                    ${application.processedAt ? `
                        <div class="detail-row">
                            <div class="detail-label">Дата обработки:</div>
                            <div class="detail-value">${new Date(application.processedAt).toLocaleString('ru-RU')}</div>
                        </div>
                    ` : ''}
                    
                    ${application.rejectionReason ? `
                        <div class="detail-row">
                            <div class="detail-label">Причина отклонения:</div>
                            <div class="detail-value">${application.rejectionReason}</div>
                        </div>
                    ` : ''}
                    
                    <div class="detail-section">
                        <h4>Описание:</h4>
                        <div class="detail-content">${application.description}</div>
                    </div>
                    
                    ${application.links && application.links.length > 0 ? `
                        <div class="detail-section">
                            <h4>Ссылки:</h4>
                            <div class="detail-content">
                                <ul>
                                    ${application.links.map(link => `<li>${link}</li>`).join('')}
                                </ul>
                            </div>
                        </div>
                    ` : ''}
                    
                    ${application.avatar ? `
                        <div class="detail-section">
                            <h4>Аватарка:</h4>
                            <div class="detail-content">
                                <img src="${application.avatar}" alt="Аватарка" style="max-width: 200px; border-radius: 10px;">
                            </div>
                        </div>
                    ` : ''}
                    
                    ${application.status === 'pending' ? `
                        <div class="modal-actions">
                            <button class="btn secondary close-modal">Закрыть</button>
                            <button class="btn primary" onclick="approveApplication(${application.id})">
                                <i class="fas fa-check"></i> Принять заявку
                            </button>
                            <button class="btn danger" onclick="rejectApplication(${application.id})">
                                <i class="fas fa-times"></i> Отклонить заявку
                            </button>
                        </div>
                    ` : `
                        <div class="modal-actions">
                            <button class="btn primary close-modal">Закрыть</button>
                        </div>
                    `}
                </div>
            `;
            
            modal.classList.add('active');
        } else {
            showNotification('Ошибка', 'Не удалось загрузить заявку', 'error');
        }
    })
    .catch(error => {
        console.error('Ошибка загрузки заявки:', error);
        showNotification('Ошибка', 'Ошибка при загрузке заявки', 'error');
    });
}

// Принятие заявки
function approveApplication(applicationId) {
    const token = localStorage.getItem('auth_token');
    
    fetch(`${API_BASE_URL}/applications/${applicationId}/status`, {
        method: 'PUT',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            status: 'approved'
        })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            showNotification('Успех', 'Заявка принята. Участник будет добавлен в фейм-лист.', 'success');
            
            // Закрываем модальные окна
            document.querySelectorAll('.modal').forEach(modal => {
                modal.classList.remove('active');
            });
            
            // Обновляем данные
            loadApplications();
            loadDashboardStats();
            
            // Вызываем скрипт добавления участника
            addMemberFromApplication(applicationId);
        } else {
            showNotification('Ошибка', data.message || 'Не удалось принять заявку', 'error');
        }
    })
    .catch(error => {
        console.error('Ошибка принятия заявки:', error);
        showNotification('Ошибка', 'Ошибка при принятии заявки', 'error');
    });
}

// Отклонение заявки
function rejectApplication(applicationId) {
    const modal = document.getElementById('reject-modal');
    const form = document.getElementById('reject-form');
    
    form.onsubmit = function(e) {
        e.preventDefault();
        
        const reason = document.getElementById('rejection-reason').value;
        const token = localStorage.getItem('auth_token');
        
        fetch(`${API_BASE_URL}/applications/${applicationId}/status`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                status: 'rejected',
                rejectionReason: reason
            })
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                showNotification('Успех', 'Заявка отклонена', 'success');
                
                // Закрываем модальные окна
                document.querySelectorAll('.modal').forEach(modal => {
                    modal.classList.remove('active');
                });
                
                // Очищаем форму
                form.reset();
                
                // Обновляем данные
                loadApplications();
                loadDashboardStats();
            } else {
                showNotification('Ошибка', data.message || 'Не удалось отклонить заявку', 'error');
            }
        })
        .catch(error => {
            console.error('Ошибка отклонения заявки:', error);
            showNotification('Ошибка', 'Ошибка при отклонении заявки', 'error');
        });
    };
    
    modal.classList.add('active');
}

// Добавление участника из заявки
function addMemberFromApplication(applicationId) {
    // Здесь будет вызов Python скрипта или API
    console.log(`Добавление участника из заявки ${applicationId}`);
    
    // Пока просто показываем уведомление
    setTimeout(() => {
        showNotification('Информация', 'Скрипт добавления участника запущен', 'info');
    }, 1000);
}

// Загрузка участников
function loadMembers() {
    const token = localStorage.getItem('auth_token');
    const page = currentPage.members;
    
    const tableBody = document.querySelector('#members-table tbody');
    tableBody.innerHTML = `
        <tr>
            <td colspan="8" class="loading-cell">
                <i class="fas fa-spinner fa-spin"></i> Загрузка участников...
            </td>
        </tr>
    `;
    
    fetch(`${API_BASE_URL}/admin/members?page=${page}&limit=${itemsPerPage}`, {
        headers: {
            'Authorization': `Bearer ${token}`
        }
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            renderMembersTable(data.members, data.total, page);
            updatePagination('members', data.total, page);
        } else {
            showNotification('Ошибка', 'Не удалось загрузить участников', 'error');
        }
    })
    .catch(error => {
        console.error('Ошибка загрузки участников:', error);
        tableBody.innerHTML = `
            <tr>
                <td colspan="8" class="loading-cell" style="color: #ff4444;">
                    <i class="fas fa-exclamation-triangle"></i> Ошибка загрузки
                </td>
            </tr>
        `;
    });
}

// Отображение таблицы участников
function renderMembersTable(members, total, page) {
    const tableBody = document.querySelector('#members-table tbody');
    
    if (members.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="8" class="loading-cell">
                    <i class="fas fa-users"></i> Нет участников
                </td>
            </tr>
        `;
        return;
    }
    
    let html = '';
    members.forEach(member => {
        let statusBadges = [];
        
        if (member.verified) {
            statusBadges.push('<span class="status-badge status-verified">✓</span>');
        }
        
        if (member.pinned) {
            statusBadges.push('<span class="status-badge" style="background: rgba(170, 85, 0, 0.1); color: #fa0; border-color: rgba(170, 85, 0, 0.3);">📌</span>');
        }
        
        if (member.scam) {
            statusBadges.push('<span class="status-badge status-scam">⚠️</span>');
        }
        
        html += `
            <tr>
                <td>${member.id}</td>
                <td>
                    <div class="member-avatar-small">
                        ${member.avatar ? 
                            `<img src="${member.avatar}" alt="${member.nickname}">` : 
                            `<div style="width: 30px; height: 30px; background: #333; border-radius: 50%; display: flex; align-items: center; justify-content: center;">${member.nickname.charAt(0)}</div>`
                        }
                    </div>
                </td>
                <td><strong>${member.nickname}</strong></td>
                <td>${member.category}</td>
                <td><a href="https://t.me/${member.telegram}" target="_blank">@${member.telegram}</a></td>
                <td>${statusBadges.join(' ')}</td>
                <td>${member.joinDate || new Date(member.createdAt).toLocaleDateString('ru-RU')}</td>
                <td class="table-actions">
                    <button class="table-btn view" onclick="editMember(${member.id})" title="Редактировать">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="table-btn delete" onclick="deleteMember(${member.id})" title="Удалить">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>
        `;
    });
    
    tableBody.innerHTML = html;
}

// Редактирование участника
function editMember(memberId) {
    const token = localStorage.getItem('auth_token');
    
    fetch(`${API_BASE_URL}/admin/members/${memberId}`, {
        headers: {
            'Authorization': `Bearer ${token}`
        }
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            openEditMemberModal(data.member);
        } else {
            showNotification('Ошибка', 'Не удалось загрузить данные участника', 'error');
        }
    })
    .catch(error => {
        console.error('Ошибка загрузки участника:', error);
        showNotification('Ошибка', 'Ошибка при загрузке участника', 'error');
    });
}

// Открытие модального окна редактирования участника
function openEditMemberModal(member) {
    const modal = document.getElementById('member-modal');
    const title = document.getElementById('member-modal-title');
    const body = document.getElementById('member-modal-body');
    
    title.textContent = `Редактирование: ${member.nickname}`;
    
    body.innerHTML = `
        <form id="edit-member-form">
            <div class="form-group">
                <label for="edit-nickname">Никнейм:</label>
                <input type="text" id="edit-nickname" value="${member.nickname}" required>
            </div>
            
            <div class="form-group">
                <label for="edit-username">Username:</label>
                <input type="text" id="edit-username" value="${member.username}" required>
            </div>
            
            <div class="form-group">
                <label for="edit-category">Категория:</label>
                <select id="edit-category" required>
                    <option value="Владелец" ${member.category === 'Владелец' ? 'selected' : ''}>Владелец</option>
                    <option value="Модераторы" ${member.category === 'Модераторы' ? 'selected' : ''}>Модераторы</option>
                    <option value="Медийки" ${member.category === 'Медийки' ? 'selected' : ''}>Медийки</option>
                    <option value="Высокий фейм" ${member.category === 'Высокий фейм' ? 'selected' : ''}>Высокий фейм</option>
                    <option value="Средний фейм" ${member.category === 'Средний фейм' ? 'selected' : ''}>Средний фейм</option>
                    <option value="Малый фейм" ${member.category === 'Малый фейм' ? 'selected' : ''}>Малый фейм</option>
                    <option value="Гаранты" ${member.category === 'Гаранты' ? 'selected' : ''}>Гаранты</option>
                    <option value="Кодеры" ${member.category === 'Кодеры' ? 'selected' : ''}>Кодеры</option>
                    <option value="Скам" ${member.category === 'Скам' ? 'selected' : ''}>Скам</option>
                </select>
            </div>
            
            <div class="form-group">
                <label for="edit-telegram">Telegram:</label>
                <input type="text" id="edit-telegram" value="${member.telegram}" required>
            </div>
            
            <div class="form-group">
                <label for="edit-description">Описание:</label>
                <textarea id="edit-description" rows="3" required>${member.description}</textarea>
            </div>
            
            <div class="form-group">
                <label for="edit-project">Ссылка на проект:</label>
                <input type="text" id="edit-project" value="${member.project || ''}">
            </div>
            
            <div class="form-group">
                <label for="edit-joinDate">Дата вступления:</label>
                <input type="date" id="edit-joinDate" value="${member.joinDate || new Date(member.createdAt).toISOString().split('T')[0]}">
            </div>
            
            <div class="form-group">
                <label>Статусы:</label>
                <div class="checkbox-group">
                    <label>
                        <input type="checkbox" id="edit-verified" ${member.verified ? 'checked' : ''}>
                        <span>Верифицирован</span>
                    </label>
                    <label>
                        <input type="checkbox" id="edit-pinned" ${member.pinned ? 'checked' : ''}>
                        <span>Закреплен</span>
                    </label>
                    <label>
                        <input type="checkbox" id="edit-scam" ${member.scam ? 'checked' : ''}>
                        <span>Скам</span>
                    </label>
                </div>
            </div>
            
            <div class="modal-actions">
                <button type="button" class="btn secondary close-modal">Отмена</button>
                <button type="submit" class="btn primary">Сохранить изменения</button>
            </div>
        </form>
    `;
    
    const form = document.getElementById('edit-member-form');
    form.onsubmit = function(e) {
        e.preventDefault();
        
        const memberData = {
            nickname: document.getElementById('edit-nickname').value,
            username: document.getElementById('edit-username').value,
            category: document.getElementById('edit-category').value,
            telegram: document.getElementById('edit-telegram').value,
            description: document.getElementById('edit-description').value,
            project: document.getElementById('edit-project').value,
            joinDate: document.getElementById('edit-joinDate').value,
            verified: document.getElementById('edit-verified').checked,
            pinned: document.getElementById('edit-pinned').checked,
            scam: document.getElementById('edit-scam').checked
        };
        
        updateMember(member.id, memberData);
    };
    
    modal.classList.add('active');
}

// Обновление участника
function updateMember(memberId, memberData) {
    const token = localStorage.getItem('auth_token');
    
    fetch(`${API_BASE_URL}/admin/members/${memberId}`, {
        method: 'PUT',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(memberData)
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            showNotification('Успех', 'Участник обновлен', 'success');
            document.getElementById('member-modal').classList.remove('active');
            loadMembers();
            loadDashboardStats();
        } else {
            showNotification('Ошибка', data.message || 'Не удалось обновить участника', 'error');
        }
    })
    .catch(error => {
        console.error('Ошибка обновления участника:', error);
        showNotification('Ошибка', 'Ошибка при обновлении участника', 'error');
    });
}

// Удаление участника
function deleteMember(memberId) {
    if (!confirm('Вы уверены, что хотите удалить этого участника?')) {
        return;
    }
    
    const token = localStorage.getItem('auth_token');
    
    fetch(`${API_BASE_URL}/admin/members/${memberId}`, {
        method: 'DELETE',
        headers: {
            'Authorization': `Bearer ${token}`
        }
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            showNotification('Успех', 'Участник удален', 'success');
            loadMembers();
            loadDashboardStats();
        } else {
            showNotification('Ошибка', data.message || 'Не удалось удалить участника', 'error');
        }
    })
    .catch(error => {
        console.error('Ошибка удаления участника:', error);
        showNotification('Ошибка', 'Ошибка при удалении участника', 'error');
    });
}

// Открытие модального окна добавления участника
function openAddMemberModal() {
    const modal = document.getElementById('member-modal');
    const title = document.getElementById('member-modal-title');
    const body = document.getElementById('member-modal-body');
    
    title.textContent = 'Добавление нового участника';
    
    // Получение следующего ID
    const token = localStorage.getItem('auth_token');
    
    fetch(`${API_BASE_URL}/admin/next-id`, {
        headers: {
            'Authorization': `Bearer ${token}`
        }
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            body.innerHTML = `
                <form id="add-member-form">
                    <div class="form-group">
                        <label for="add-nickname">Никнейм:</label>
                        <