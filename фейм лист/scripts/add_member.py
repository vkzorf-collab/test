#!/usr/bin/env python3
"""
Скрипт для добавления нового участника в фейм-лист
Вызывается при принятии заявки администратором
"""

import os
import sys
import json
import mysql.connector
from mysql.connector import Error
from datetime import datetime
import shutil

def load_config():
    """Загрузка конфигурации из файла"""
    config_path = os.path.join(os.path.dirname(__file__), '../backend/config/db_config.json')
    try:
        with open(config_path, 'r') as f:
            return json.load(f)
    except FileNotFoundError:
        # Конфигурация по умолчанию
        return {
            'database': 'noolshy_fame',
            'user': 'root',
            'password': '',
            'host': 'localhost',
            'port': 3306
        }

def get_next_member_id(cursor):
    """Получение следующего ID для участника"""
    cursor.execute("SELECT MAX(id) as max_id FROM members")
    result = cursor.fetchone()
    return (result['max_id'] or 0) + 1

def save_avatar(avatar_data, member_id):
    """Сохранение аватарки участника"""
    if not avatar_data:
        return None
    
    # Папка для аватарок
    avatar_dir = os.path.join(os.path.dirname(__file__), '../frontend/img')
    os.makedirs(avatar_dir, exist_ok=True)
    
    # Генерация имени файла
    avatar_filename = f"avatar{member_id}.png"
    avatar_path = os.path.join(avatar_dir, avatar_filename)
    
    # Если данные в формате base64
    if avatar_data.startswith('data:image'):
        import base64
        # Извлекаем base64 данные
        header, encoded = avatar_data.split(',', 1)
        image_data = base64.b64decode(encoded)
        
        with open(avatar_path, 'wb') as f:
            f.write(image_data)
    else:
        # Предполагаем, что это путь к файлу
        if os.path.exists(avatar_data):
            shutil.copy2(avatar_data, avatar_path)
    
    return f"img/{avatar_filename}"

def add_member_from_application(application_id):
    """Добавление участника на основе принятой заявки"""
    try:
        # Загрузка конфигурации
        config = load_config()
        
        # Подключение к БД
        connection = mysql.connector.connect(
            host=config['host'],
            port=config['port'],
            database=config['database'],
            user=config['user'],
            password=config['password']
        )
        
        if connection.is_connected():
            cursor = connection.cursor(dictionary=True)
            
            # Получение данных заявки
            cursor.execute("""
                SELECT a.*, u.username, u.email, u.telegram as user_telegram
                FROM applications a
                JOIN users u ON a.user_id = u.id
                WHERE a.id = %s AND a.status = 'approved'
            """, (application_id,))
            
            application = cursor.fetchone()
            
            if not application:
                print(f"Заявка {application_id} не найдена или не принята")
                return False
            
            # Получение следующего ID
            next_id = get_next_member_id(cursor)
            
            # Подготовка данных участника
            member_data = {
                'id': next_id,
                'nickname': application['nickname'],
                'username': f"@{application['telegram']}",
                'category': application['category'],
                'role': application['category'],
                'description': application['description'],
                'verified': False,
                'pinned': False,
                'scam': False,
                'project': f"https://t.me/{application['telegram']}",
                'telegram': application['telegram'],
                'joinDate': datetime.now().strftime('%Y-%m-%d'),
                'activity': 'Постоянная',
                'details': application['description'],
                'skills': ['Добавлен через заявку']
            }
            
            # Обработка ссылок
            if application['links']:
                try:
                    links = json.loads(application['links'])
                    # Можно добавить дополнительные поля на основе ссылок
                except:
                    links = []
            
            # Сохранение аватарки
            if application['avatar']:
                avatar_path = save_avatar(application['avatar'], next_id)
                if avatar_path:
                    member_data['avatar'] = avatar_path
            else:
                member_data['avatar'] = f"img/avatar{next_id}.png"
            
            # Добавление участника в таблицу
            cursor.execute("""
                INSERT INTO members (
                    id, nickname, username, category, role, description,
                    verified, pinned, scam, project, telegram, join_date,
                    activity, details, skills, avatar, created_at, updated_at
                ) VALUES (
                    %(id)s, %(nickname)s, %(username)s, %(category)s, %(role)s, %(description)s,
                    %(verified)s, %(pinned)s, %(scam)s, %(project)s, %(telegram)s, %(joinDate)s,
                    %(activity)s, %(details)s, %(skills)s, %(avatar)s, NOW(), NOW()
                )
            """, member_data)
            
            # Обновление статуса заявки
            cursor.execute("""
                UPDATE applications 
                SET processed_at = NOW(), 
                    processed_by = (SELECT id FROM users WHERE username = 'system' LIMIT 1)
                WHERE id = %s
            """, (application_id,))
            
            # Сохранение изменений
            connection.commit()
            
            print(f"Участник успешно добавлен с ID: {next_id}")
            print(f"Никнейм: {member_data['nickname']}")
            print(f"Категория: {member_data['category']}")
            
            # Генерация JSON для frontend
            generate_members_json(cursor)
            
            return True
            
    except Error as e:
        print(f"Ошибка при работе с БД: {e}")
        return False
    finally:
        if connection.is_connected():
            cursor.close()
            connection.close()

def generate_members_json(cursor):
    """Генерация JSON файла с участниками для frontend"""
    cursor.execute("SELECT * FROM members ORDER BY id")
    members = cursor.fetchall()
    
    # Преобразование данных для frontend
    members_list = []
    for member in members:
        members_list.append({
            'id': member['id'],
            'nickname': member['nickname'],
            'username': member['username'],
            'category': member['category'],
            'role': member['role'],
            'description': member['description'],
            'avatar': member['avatar'],
            'verified': bool(member['verified']),
            'pinned': bool(member['pinned']),
            'scam': bool(member['scam']),
            'project': member['project'],
            'telegram': member['telegram'],
            'joinDate': member['join_date'].strftime('%Y-%m-%d') if member['join_date'] else datetime.now().strftime('%Y-%m-%d'),
            'activity': member['activity'],
            'details': member['details'],
            'skills': json.loads(member['skills']) if member['skills'] else []
        })
    
    # Сохранение в файл
    output_path = os.path.join(os.path.dirname(__file__), '../frontend/members_data.json')
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(members_list, f, ensure_ascii=False, indent=2)
    
    print(f"JSON файл обновлен: {output_path}")

def main():
    """Основная функция"""
    if len(sys.argv) < 2:
        print("Использование: python add_member.py <application_id>")
        sys.exit(1)
    
    try:
        application_id = int(sys.argv[1])
        success = add_member_from_application(application_id)
        
        if success:
            print("✅ Участник успешно добавлен!")
            sys.exit(0)
        else:
            print("❌ Ошибка при добавлении участника")
            sys.exit(1)
    except ValueError:
        print("Ошибка: ID заявки должен быть числом")
        sys.exit(1)

if __name__ == "__main__":
    main()