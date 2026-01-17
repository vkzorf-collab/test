// members.js - Функции для работы с участниками

let members = []; // Будет загружаться с сервера

// Функция загрузки участников с сервера
async function loadMembersFromServer() {
    try {
        const response = await fetch(`${API_BASE_URL}/members`);
        const data = await response.json();
        
        if (data.success) {
            members = data.members;
            return members;
        } else {
            console.error('Ошибка загрузки участников:', data.message);
            return [];
        }
    } catch (error) {
        console.error('Ошибка сети:', error);
        return [];
    }
}

// Функция добавления нового участника (для админов)
async function addMember(memberData) {
    const token = localStorage.getItem('auth_token');
    
    try {
        const response = await fetch(`${API_BASE_URL}/admin/members`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(memberData)
        });
        
        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Ошибка добавления участника:', error);
        return { success: false, message: 'Ошибка сети' };
    }
}

// Функция обновления участника (для админов)
async function updateMember(id, memberData) {
    const token = localStorage.getItem('auth_token');
    
    try {
        const response = await fetch(`${API_BASE_URL}/admin/members/${id}`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(memberData)
        });
        
        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Ошибка обновления участника:', error);
        return { success: false, message: 'Ошибка сети' };
    }
}

// Функция удаления участника (для админов)
async function deleteMember(id) {
    const token = localStorage.getItem('auth_token');
    
    try {
        const response = await fetch(`${API_BASE_URL}/admin/members/${id}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Ошибка удаления участника:', error);
        return { success: false, message: 'Ошибка сети' };
    }
}

// Функция получения следующего ID для участника
async function getNextMemberId() {
    try {
        const response = await fetch(`${API_BASE_URL}/admin/next-id`);
        const data = await response.json();
        
        if (data.success) {
            return data.nextId;
        } else {
            console.error('Ошибка получения ID:', data.message);
            return members.length > 0 ? Math.max(...members.map(m => m.id)) + 1 : 1;
        }
    } catch (error) {
        console.error('Ошибка сети:', error);
        return members.length > 0 ? Math.max(...members.map(m => m.id)) + 1 : 1;
    }
}

// Функция загрузки изображения аватарки
async function uploadAvatar(file, memberId) {
    const token = localStorage.getItem('auth_token');
    const formData = new FormData();
    formData.append('avatar', file);
    formData.append('memberId', memberId);
    
    try {
        const response = await fetch(`${API_BASE_URL}/admin/upload-avatar`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`
            },
            body: formData
        });
        
        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Ошибка загрузки аватарки:', error);
        return { success: false, message: 'Ошибка сети' };
    }
}

// Экспортируем функции
window.MembersAPI = {
    loadMembersFromServer,
    addMember,
    updateMember,
    deleteMember,
    getNextMemberId,
    uploadAvatar
};

// Обновляем функцию initMembers в script.js
function initMembers() {
    console.log('Инициализация участников...');
    
    // Загружаем участников с сервера
    loadMembersFromServer().then(loadedMembers => {
        members = loadedMembers;
        loadMembers();
    });
    
    // ... остальной код остается таким же ...
}