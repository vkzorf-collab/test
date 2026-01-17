const members = [
    // ... существующий список участников ...
];

// Глобальные переменные для аутентификации
let currentUser = null;
let isAuthenticated = false;
const API_BASE_URL = 'http://localhost:3000/api'; // Будет настроен в backend

// Функция для проверки аутентификации
function checkAuth() {
    const token = localStorage.getItem('auth_token');
    if (token) {
        // Проверяем токен на сервере
        fetch(`${API_BASE_URL}/auth/verify`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                currentUser = data.user;
                isAuthenticated = true;
                updateAuthUI();
            } else {
                localStorage.removeItem('auth_token');
                updateAuthUI();
            }
        })
        .catch(() => {
            localStorage.removeItem('auth_token');
            updateAuthUI();
        });
    } else {
        updateAuthUI();
    }
}

// Обновление интерфейса в зависимости от аутентификации
function updateAuthUI() {
    const authButtons = document.getElementById('auth-buttons');
    const userMenu = document.getElementById('user-menu');
    const menuAuthButtons = document.getElementById('menu-auth-buttons');
    const menuUserOptions = document.getElementById('menu-user-options');
    const applyOpenBtn = document.getElementById('apply-open-btn');
    const menuApply = document.getElementById('menu-apply');
    const menuAdmin = document.getElementById('menu-admin');
    
    if (isAuthenticated && currentUser) {
        // Пользователь авторизован
        if (authButtons) authButtons.style.display = 'none';
        if (userMenu) userMenu.style.display = 'flex';
        if (menuAuthButtons) menuAuthButtons.style.display = 'none';
        if (menuUserOptions) menuUserOptions.style.display = 'block';
        if (applyOpenBtn) {
            applyOpenBtn.style.display = 'flex';
            applyOpenBtn.onclick = () => switchSection('apply-section');
        }
        if (menuApply) menuApply.style.display = 'block';
        
        // Проверяем является ли пользователь админом
        if (currentUser.role === 'admin' || currentUser.role === 'moderator') {
            if (menuAdmin) menuAdmin.style.display = 'block';
        }
    } else {
        // Пользователь не авторизован
        if (authButtons) authButtons.style.display = 'flex';
        if (userMenu) userMenu.style.display = 'none';
        if (menuAuthButtons) menuAuthButtons.style.display = 'block';
        if (menuUserOptions) menuUserOptions.style.display = 'none';
        if (applyOpenBtn) {
            applyOpenBtn.style.display = 'flex';
            applyOpenBtn.onclick = () => showMessage('Требуется авторизация', 'Для отправки заявки необходимо войти в систему.');
        }
        if (menuAdmin) menuAdmin.style.display = 'none';
    }
}

// Функция регистрации
function registerUser(username, email, password, telegram = '') {
    return fetch(`${API_BASE_URL}/auth/register`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            username,
            email,
            password,
            telegram
        })
    })
    .then(response => response.json());
}

// Функция входа
function loginUser(username, password, remember = false) {
    return fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            username,
            password,
            remember
        })
    })
    .then(response => response.json());
}

// Функция выхода
function logoutUser() {
    const token = localStorage.getItem('auth_token');
    
    if (token) {
        fetch(`${API_BASE_URL}/auth/logout`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        })
        .catch(() => {});
    }
    
    localStorage.removeItem('auth_token');
    currentUser = null;
    isAuthenticated = false;
    updateAuthUI();
    switchSection('main');
    showMessage('Выход выполнен', 'Вы успешно вышли из системы.');
}

// Функция отправки заявки
function submitApplication(applicationData) {
    const token = localStorage.getItem('auth_token');
    
    return fetch(`${API_BASE_URL}/applications`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(applicationData)
    })
    .then(response => response.json());
}

// Функция получения заявок пользователя
function getUserApplications() {
    const token = localStorage.getItem('auth_token');
    
    return fetch(`${API_BASE_URL}/applications/my`, {
        headers: {
            'Authorization': `Bearer ${token}`
        }
    })
    .then(response => response.json());
}

// Функция показа сообщения
function showMessage(title, content) {
    const modal = document.getElementById('message-modal');
    const titleEl = document.getElementById('message-title');
    const contentEl = document.getElementById('message-content');
    const closeBtn = document.getElementById('message-close');
    
    titleEl.textContent = title;
    contentEl.textContent = content;
    
    modal.classList.add('active');
    
    closeBtn.onclick = () => {
        modal.classList.remove('active');
    };
}

// Инициализация аутентификации
function initAuth() {
    // Проверяем аутентификацию при загрузке
    checkAuth();
    
    // Обработчики для кнопок регистрации
    const registerBtn = document.getElementById('register-btn');
    const menuRegister = document.getElementById('menu-register');
    const goToRegister = document.getElementById('go-to-register');
    
    if (registerBtn) registerBtn.addEventListener('click', () => switchSection('register-section'));
    if (menuRegister) menuRegister.addEventListener('click', () => {
        switchSection('register-section');
        const sideMenu = document.getElementById('side-menu');
        if (sideMenu) sideMenu.classList.remove('active');
    });
    if (goToRegister) goToRegister.addEventListener('click', (e) => {
        e.preventDefault();
        switchSection('register-section');
    });
    
    // Обработчики для кнопок входа
    const loginBtn = document.getElementById('login-btn');
    const menuLogin = document.getElementById('menu-login');
    const goToLogin = document.getElementById('go-to-login');
    
    if (loginBtn) loginBtn.addEventListener('click', () => switchSection('login-section'));
    if (menuLogin) menuLogin.addEventListener('click', () => {
        switchSection('login-section');
        const sideMenu = document.getElementById('side-menu');
        if (sideMenu) sideMenu.classList.remove('active');
    });
    if (goToLogin) goToLogin.addEventListener('click', (e) => {
        e.preventDefault();
        switchSection('login-section');
    });
    
    // Обработчики для кнопок профиля и выхода
    const userProfileBtn = document.getElementById('user-profile-btn');
    const logoutBtn = document.getElementById('logout-btn');
    const menuProfile = document.getElementById('menu-profile');
    const menuLogout = document.getElementById('menu-logout');
    
    if (userProfileBtn) userProfileBtn.addEventListener('click', () => {
        switchSection('user-profile-section');
        loadUserProfile();
    });
    
    if (logoutBtn) logoutBtn.addEventListener('click', logoutUser);
    
    if (menuProfile) menuProfile.addEventListener('click', () => {
        switchSection('user-profile-section');
        loadUserProfile();
        const sideMenu = document.getElementById('side-menu');
        if (sideMenu) sideMenu.classList.remove('active');
    });
    
    if (menuLogout) menuLogout.addEventListener('click', logoutUser);
    
    // Обработчик кнопки отправки заявки в FAQ
    const faqApplyBtn = document.getElementById('faq-apply-btn');
    if (faqApplyBtn) {
        faqApplyBtn.addEventListener('click', () => {
            if (isAuthenticated) {
                switchSection('apply-section');
            } else {
                switchSection('login-section');
                showMessage('Требуется авторизация', 'Для отправки заявки необходимо войти в систему.');
            }
        });
    }
    
    // Обработчик формы регистрации
    const registerForm = document.getElementById('register-form');
    if (registerForm) {
        registerForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            const username = document.getElementById('register-username').value.trim();
            const email = document.getElementById('register-email').value.trim();
            const password = document.getElementById('register-password').value;
            const confirmPassword = document.getElementById('register-confirm-password').value;
            const telegram = document.getElementById('register-telegram').value.trim();
            
            // Валидация
            let isValid = true;
            
            // Сброс ошибок
            document.querySelectorAll('.form-error').forEach(el => {
                el.style.display = 'none';
                el.textContent = '';
            });
            
            if (username.length < 3) {
                document.getElementById('username-error').textContent = 'Имя пользователя должно содержать минимум 3 символа';
                document.getElementById('username-error').style.display = 'block';
                isValid = false;
            }
            
            if (!email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
                document.getElementById('email-error').textContent = 'Введите корректный email';
                document.getElementById('email-error').style.display = 'block';
                isValid = false;
            }
            
            if (password.length < 6) {
                document.getElementById('password-error').textContent = 'Пароль должен содержать минимум 6 символов';
                document.getElementById('password-error').style.display = 'block';
                isValid = false;
            }
            
            if (password !== confirmPassword) {
                document.getElementById('confirm-password-error').textContent = 'Пароли не совпадают';
                document.getElementById('confirm-password-error').style.display = 'block';
                isValid = false;
            }
            
            if (!isValid) return;
            
            // Отправка запроса
            const submitBtn = document.getElementById('register-submit');
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Регистрация...';
            
            registerUser(username, email, password, telegram)
                .then(data => {
                    if (data.success) {
                        // Сохраняем токен
                        localStorage.setItem('auth_token', data.token);
                        currentUser = data.user;
                        isAuthenticated = true;
                        updateAuthUI();
                        
                        // Показываем сообщение и переходим на главную
                        showMessage('Регистрация успешна', 'Добро пожаловать в NoolShy Fame!');
                        switchSection('main');
                        
                        // Очищаем форму
                        registerForm.reset();
                    } else {
                        // Показываем ошибки
                        if (data.errors) {
                            Object.keys(data.errors).forEach(field => {
                                const errorEl = document.getElementById(`${field}-error`);
                                if (errorEl) {
                                    errorEl.textContent = data.errors[field];
                                    errorEl.style.display = 'block';
                                }
                            });
                        } else {
                            showMessage('Ошибка регистрации', data.message || 'Произошла ошибка при регистрации');
                        }
                    }
                })
                .catch(error => {
                    showMessage('Ошибка', 'Произошла ошибка при соединении с сервером');
                })
                .finally(() => {
                    submitBtn.disabled = false;
                    submitBtn.innerHTML = '<i class="fas fa-user-plus"></i> Зарегистрироваться';
                });
        });
    }
    
    // Обработчик формы входа
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        loginForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            const username = document.getElementById('login-username').value.trim();
            const password = document.getElementById('login-password').value;
            const remember = document.getElementById('remember-me').checked;
            
            // Валидация
            let isValid = true;
            
            // Сброс ошибок
            document.querySelectorAll('.form-error').forEach(el => {
                el.style.display = 'none';
                el.textContent = '';
            });
            
            if (!username) {
                document.getElementById('login-username-error').textContent = 'Введите имя пользователя или email';
                document.getElementById('login-username-error').style.display = 'block';
                isValid = false;
            }
            
            if (!password) {
                document.getElementById('login-password-error').textContent = 'Введите пароль';
                document.getElementById('login-password-error').style.display = 'block';
                isValid = false;
            }
            
            if (!isValid) return;
            
            // Отправка запроса
            const submitBtn = document.getElementById('login-submit');
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Вход...';
            
            loginUser(username, password, remember)
                .then(data => {
                    if (data.success) {
                        // Сохраняем токен
                        localStorage.setItem('auth_token', data.token);
                        currentUser = data.user;
                        isAuthenticated = true;
                        updateAuthUI();
                        
                        // Показываем сообщение и переходим на главную
                        showMessage('Вход выполнен', `Добро пожаловать, ${data.user.username}!`);
                        switchSection('main');
                        
                        // Очищаем форму
                        loginForm.reset();
                    } else {
                        // Показываем ошибки
                        if (data.field === 'username') {
                            document.getElementById('login-username-error').textContent = data.message;
                            document.getElementById('login-username-error').style.display = 'block';
                        } else if (data.field === 'password') {
                            document.getElementById('login-password-error').textContent = data.message;
                            document.getElementById('login-password-error').style.display = 'block';
                        } else {
                            showMessage('Ошибка входа', data.message || 'Произошла ошибка при входе');
                        }
                    }
                })
                .catch(error => {
                    showMessage('Ошибка', 'Произошла ошибка при соединении с сервером');
                })
                .finally(() => {
                    submitBtn.disabled = false;
                    submitBtn.innerHTML = '<i class="fas fa-sign-in-alt"></i> Войти';
                });
        });
    }
    
    // Обработчик формы отправки заявки
    const applyForm = document.getElementById('apply-form');
    if (applyForm) {
        // Обработчик для загрузки аватарки
        const avatarInput = document.getElementById('apply-avatar');
        const avatarInfo = document.getElementById('avatar-info');
        
        if (avatarInput) {
            avatarInput.addEventListener('change', function() {
                if (this.files && this.files[0]) {
                    const file = this.files[0];
                    const fileName = file.name;
                    const fileSize = (file.size / 1024 / 1024).toFixed(2); // MB
                    
                    if (fileSize > 5) {
                        avatarInfo.textContent = 'Файл слишком большой (максимум 5MB)';
                        avatarInfo.style.color = '#ff4444';
                        this.value = '';
                    } else {
                        avatarInfo.textContent = `Файл: ${fileName} (${fileSize} MB)`;
                        avatarInfo.style.color = '#888';
                    }
                }
            });
        }
        
        applyForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            if (!isAuthenticated) {
                showMessage('Требуется авторизация', 'Для отправки заявки необходимо войти в систему.');
                return;
            }
            
            const nickname = document.getElementById('apply-nickname').value.trim();
            const telegram = document.getElementById('apply-telegram').value.trim();
            const category = document.getElementById('apply-category').value;
            const description = document.getElementById('apply-description').value.trim();
            const links = document.getElementById('apply-links').value.trim();
            
            // Валидация
            if (!nickname || !telegram || !category || !description) {
                showMessage('Заполните все поля', 'Пожалуйста, заполните все обязательные поля.');
                return;
            }
            
            // Подготовка данных
            const applicationData = {
                nickname,
                telegram: telegram.startsWith('@') ? telegram.substring(1) : telegram,
                category,
                description,
                links: links ? links.split('\n').map(link => link.trim()).filter(link => link) : [],
                userId: currentUser.id
            };
            
            // Обработка файла аватарки
            if (avatarInput.files && avatarInput.files[0]) {
                const file = avatarInput.files[0];
                const reader = new FileReader();
                
                reader.onload = function(e) {
                    applicationData.avatar = e.target.result;
                    submitApplicationData(applicationData);
                };
                
                reader.readAsDataURL(file);
            } else {
                submitApplicationData(applicationData);
            }
        });
    }
}

// Функция отправки данных заявки
function submitApplicationData(applicationData) {
    const submitBtn = document.getElementById('apply-submit');
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Отправка...';
    
    submitApplication(applicationData)
        .then(data => {
            if (data.success) {
                showMessage('Заявка отправлена', 'Ваша заявка успешно отправлена на рассмотрение. Модераторы рассмотрят её в течение 24-48 часов.');
                document.getElementById('apply-form').reset();
                document.getElementById('avatar-info').textContent = '';
                switchSection('user-profile-section');
                loadUserProfile();
            } else {
                showMessage('Ошибка отправки', data.message || 'Произошла ошибка при отправке заявки');
            }
        })
        .catch(error => {
            showMessage('Ошибка', 'Произошла ошибка при соединении с сервером');
        })
        .finally(() => {
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<i class="fas fa-paper-plane"></i> Отправить заявку';
        });
}

// Функция загрузки профиля пользователя
function loadUserProfile() {
    const container = document.getElementById('user-profile-content');
    if (!container) return;
    
    if (!isAuthenticated || !currentUser) {
        container.innerHTML = '<p style="text-align: center; color: #888; padding: 40px;">Пожалуйста, войдите в систему</p>';
        return;
    }
    
    // Показываем заглушку пока загружаем данные
    container.innerHTML = `
        <div class="user-profile-box">
            <div style="text-align: center; padding: 40px;">
                <i class="fas fa-spinner fa-spin" style="font-size: 2rem; color: #666;"></i>
                <p style="margin-top: 20px; color: #888;">Загрузка профиля...</p>
            </div>
        </div>
    `;
    
    // Загружаем заявки пользователя
    getUserApplications()
        .then(data => {
            let applicationsHtml = '';
            if (data.success && data.applications) {
                data.applications.forEach(app => {
                    let statusClass = 'status-pending';
                    let statusText = 'На рассмотрении';
                    
                    if (app.status === 'approved') {
                        statusClass = 'status-approved';
                        statusText = 'Принята';
                    } else if (app.status === 'rejected') {
                        statusClass = 'status-rejected';
                        statusText = 'Отклонена';
                    }
                    
                    applicationsHtml += `
                        <div class="application-item">
                            <div>
                                <strong>${app.nickname}</strong> - ${app.category}
                                <span class="application-status ${statusClass}">${statusText}</span>
                            </div>
                            <p style="margin-top: 10px; color: #aaa; font-size: 0.9rem;">
                                ${app.description.substring(0, 100)}${app.description.length > 100 ? '...' : ''}
                            </p>
                            <div style="margin-top: 10px; color: #888; font-size: 0.8rem;">
                                Отправлено: ${new Date(app.createdAt).toLocaleDateString('ru-RU')}
                            </div>
                            ${app.rejectionReason ? `
                                <div class="application-reason">
                                    <strong>Причина отклонения:</strong> ${app.rejectionReason}
                                </div>
                            ` : ''}
                        </div>
                    `;
                });
            }
            
            const userInitial = currentUser.username.charAt(0).toUpperCase();
            
            container.innerHTML = `
                <div class="user-profile-box">
                    <div class="user-info-header">
                        <div class="user-avatar" style="background: ${generateColorFromNickname(currentUser.username)};">
                            ${userInitial}
                        </div>
                        <div class="user-details">
                            <h2>${currentUser.username}</h2>
                            <p class="user-email">${currentUser.email}</p>
                            ${currentUser.telegram ? `<p style="color: #0088cc; margin-top: 5px;"><i class="fab fa-telegram"></i> @${currentUser.telegram}</p>` : ''}
                        </div>
                    </div>
                    
                    <div class="user-stats">
                        <div class="stat-box">
                            <div class="stat-value">${data.applications ? data.applications.length : 0}</div>
                            <div class="stat-label">Заявок отправлено</div>
                        </div>
                        <div class="stat-box">
                            <div class="stat-value">${data.applications ? data.applications.filter(a => a.status === 'approved').length : 0}</div>
                            <div class="stat-label">Заявок принято</div>
                        </div>
                        <div class="stat-box">
                            <div class="stat-value">${data.applications ? data.applications.filter(a => a.status === 'rejected').length : 0}</div>
                            <div class="stat-label">Заявок отклонено</div>
                        </div>
                    </div>
                    
                    ${applicationsHtml ? `
                        <div class="user-applications">
                            <h3>Мои заявки</h3>
                            <div class="applications-list">
                                ${applicationsHtml}
                            </div>
                        </div>
                    ` : `
                        <div style="text-align: center; padding: 40px; color: #888;">
                            <i class="fas fa-inbox" style="font-size: 3rem; opacity: 0.5;"></i>
                            <p style="margin-top: 20px;">У вас пока нет отправленных заявок</p>
                            <button onclick="switchSection('apply-section')" class="auth-btn" style="margin-top: 20px; width: auto; padding: 10px 30px;">
                                <i class="fas fa-paper-plane"></i> Отправить заявку
                            </button>
                        </div>
                    `}
                </div>
            `;
        })
        .catch(error => {
            container.innerHTML = `
                <div class="user-profile-box">
                    <div style="text-align: center; padding: 40px; color: #888;">
                        <i class="fas fa-exclamation-triangle" style="font-size: 3rem; color: #ff4444;"></i>
                        <p style="margin-top: 20px;">Ошибка при загрузке профиля</p>
                        <button onclick="loadUserProfile()" class="auth-btn" style="margin-top: 20px; width: auto; padding: 10px 30px;">
                            <i class="fas fa-redo"></i> Попробовать снова
                        </button>
                    </div>
                </div>
            `;
        });
}

// Обновляем функцию initNavigation для работы с новыми секциями
function initNavigation() {
    console.log('Инициализация навигации...');
    
    // ... существующий код ...
    
    // Обновляем обработчики переключения секций
    function switchSection(sectionId) {
        console.log('Переключение на секцию:', sectionId);
        
        // Скрываем все секции
        document.querySelectorAll('.section').forEach(section => {
            section.classList.remove('active-section');
        });
        
        // Показываем выбранную секцию
        const targetSection = document.getElementById(sectionId);
        if (targetSection) {
            targetSection.classList.add('active-section');
            console.log('Секция активирована:', sectionId);
        } else {
            console.error('Секция не найдена:', sectionId);
        }
        
        // Обновляем активные кнопки навигации
        document.querySelectorAll('.nav-tab').forEach(tab => {
            tab.classList.remove('active');
            if (tab.dataset.section === sectionId) {
                tab.classList.add('active');
            }
        });
        
        // Обновляем активные пункты меню
        document.querySelectorAll('.menu-item').forEach(item => {
            item.classList.remove('active');
            if (item.dataset.section === sectionId) {
                item.classList.add('active');
            }
        });
    }
    
    // ... остальной существующий код ...
}

// Обновляем DOMContentLoaded
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM загружен, инициализация...');
    initNavigation();
    initAuth(); // Инициализируем аутентификацию
    initMembers();
    initSnow();
    initSettings();
    initNeonControls();
    initModals();
    loadSavedSettings();
    initDynamicNeon();
    initAllAvatars();
    
    // Инициализируем модальное окно сообщений
    const messageModal = document.getElementById('message-modal');
    if (messageModal) {
        messageModal.addEventListener('click', function(e) {
            if (e.target === this) {
                this.classList.remove('active');
            }
        });
    }
});