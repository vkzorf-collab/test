#!/usr/bin/env python3
"""
Скрипт установки и настройки проекта
"""

import os
import sys
import subprocess
import json
from pathlib import Path

def print_header(text):
    """Печать заголовка"""
    print("\n" + "=" * 60)
    print(f" {text}")
    print("=" * 60)

def check_requirements():
    """Проверка системных требований"""
    print_header("ПРОВЕРКА ТРЕБОВАНИЙ")
    
    requirements = {
        'Node.js': 'node --version',
        'npm': 'npm --version',
        'Python 3': 'python3 --version',
        'MySQL': 'mysql --version'
    }
    
    all_ok = True
    for name, cmd in requirements.items():
        try:
            result = subprocess.run(cmd.split(), capture_output=True, text=True)
            if result.returncode == 0:
                print(f"✅ {name}: {result.stdout.strip()}")
            else:
                print(f"❌ {name}: НЕ УСТАНОВЛЕН")
                all_ok = False
        except:
            print(f"❌ {name}: НЕ УСТАНОВЛЕН")
            all_ok = False
    
    return all_ok

def setup_database():
    """Настройка базы данных"""
    print_header("НАСТРОЙКА БАЗЫ ДАННЫХ")
    
    db_config = {
        'host': input("Хост БД (по умолчанию localhost): ") or 'localhost',
        'port': input("Порт БД (по умолчанию 3306): ") or '3306',
        'database': input("Имя БД (по умолчанию noolshy_fame): ") or 'noolshy_fame',
        'user': input("Пользователь БД (по умолчанию root): ") or 'root',
        'password': input("Пароль БД: ") or ''
    }
    
    # Сохранение конфигурации
    config_dir = Path(__file__).parent / 'backend' / 'config'
    config_dir.mkdir(parents=True, exist_ok=True)
    
    config_file = config_dir / 'db_config.json'
    with open(config_file, 'w') as f:
        json.dump(db_config, f, indent=2)
    
    print(f"✅ Конфигурация БД сохранена в {config_file}")
    
    # Создание файла .env
    env_content = f"""# Конфигурация БД
DB_HOST={db_config['host']}
DB_PORT={db_config['port']}
DB_NAME={db_config['database']}
DB_USER={db_config['user']}
DB_PASSWORD={db_config['password']}

# JWT Secret
JWT_SECRET={os.urandom(32).hex()}

# Настройки сервера
PORT=3000
NODE_ENV=development
"""
    
    env_file = Path(__file__).parent / 'backend' / '.env'
    with open(env_file, 'w') as f:
        f.write(env_content)
    
    print(f"✅ Файл .env создан в {env_file}")
    
    return db_config

def install_dependencies():
    """Установка зависимостей"""
    print_header("УСТАНОВКА ЗАВИСИМОСТЕЙ")
    
    # Установка Node.js зависимостей
    print("Установка Node.js зависимостей...")
    backend_dir = Path(__file__).parent / 'backend'
    
    try:
        subprocess.run(['npm', 'install'], cwd=backend_dir, check=True)
        print("✅ Node.js зависимости установлены")
    except subprocess.CalledProcessError:
        print("❌ Ошибка при установке Node.js зависимостей")
        return False
    
    # Установка Python зависимостей
    print("Установка Python зависимостей...")
    try:
        subprocess.run([sys.executable, '-m', 'pip', 'install', 'mysql-connector-python'], check=True)
        print("✅ Python зависимости установлены")
    except subprocess.CalledProcessError:
        print("❌ Ошибка при установке Python зависимостей")
        return False
    
    return True

def create_database_structure(db_config):
    """Создание структуры базы данных"""
    print_header("СОЗДАНИЕ СТРУКТУРЫ БАЗЫ ДАННЫХ")
    
    sql_file = Path(__file__).parent / 'scripts' / 'database_schema.sql'
    
    if not sql_file.exists():
        print("❌ Файл схемы БД не найден")
        return False
    
    try:
        # Чтение SQL файла
        with open(sql_file, 'r') as f:
            sql_commands = f.read()
        
        # Выполнение SQL команд
        import mysql.connector
        
        connection = mysql.connector.connect(
            host=db_config['host'],
            port=int(db_config['port']),
            user=db_config['user'],
            password=db_config['password']
        )
        
        cursor = connection.cursor()
        
        # Создание базы данных если не существует
        cursor.execute(f"CREATE DATABASE IF NOT EXISTS {db_config['database']}")
        cursor.execute(f"USE {db_config['database']}")
        
        # Выполнение команд из файла
        for command in sql_commands.split(';'):
            if command.strip():
                cursor.execute(command)
        
        connection.commit()
        cursor.close()
        connection.close()
        
        print("✅ Структура БД создана успешно")
        return True
        
    except Exception as e:
        print(f"❌ Ошибка при создании структуры БД: {e}")
        return False

def setup_frontend():
    """Настройка frontend"""
    print_header("НАСТРОЙКА FRONTEND")
    
    # Создание необходимых папок
    folders = [
        'frontend/img',
        'frontend/data',
        'admin-panel'
    ]
    
    for folder in folders:
        os.makedirs(folder, exist_ok=True)
        print(f"✅ Создана папка: {folder}")
    
    # Копирование файлов администратора
    admin_files = ['admin.html', 'admin.css', 'admin.js']
    for file in admin_files:
        source = Path(__file__).parent / 'admin-panel' / file
        if source.exists():
            print(f"✅ Файл администратора: {file}")
        else:
            print(f"⚠️  Файл администратора отсутствует: {file}")
    
    return True

def main():
    """Основная функция"""
    print_header("УСТАНОВКА NOOLSHY FAME")
    
    # Проверка требований
    if not check_requirements():
        print("\n⚠️  Некоторые требования не выполнены.")
        response = input("Продолжить установку? (y/n): ")
        if response.lower() != 'y':
            print("Установка прервана.")
            sys.exit(1)
    
    # Настройка БД
    db_config = setup_database()
    
    # Установка зависимостей
    if not install_dependencies():
        print("❌ Ошибка при установке зависимостей")
        sys.exit(1)
    
    # Создание структуры БД
    if not create_database_structure(db_config):
        print("❌ Ошибка при создании структуры БД")
        sys.exit(1)
    
    # Настройка frontend
    if not setup_frontend():
        print("❌ Ошибка при настройке frontend")
        sys.exit(1)
    
    print_header("УСТАНОВКА ЗАВЕРШЕНА")
    
    print("\n🎉 Проект успешно установлен!")
    print("\nСледующие шаги:")
    print("1. Запустите сервер: cd backend && npm start")
    print("2. Откройте в браузере: http://localhost:3000")
    print("3. Для входа в админ-панель используйте:")
    print("   Логин: admin")
    print("   Пароль: admin123")
    print("\n⚠️  Не забудьте изменить пароль администратора!")

if __name__ == "__main__":
    main()