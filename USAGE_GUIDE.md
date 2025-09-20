# 🚀 Workflow Engine API - Руководство по использованию

## 🎯 Быстрый старт

### 1. Запуск системы
```bash
# Убить старые процессы и запустить
chmod +x ultimate_start.sh
./ultimate_start.sh

# Или вручную
npm run dev
```

### 2. Открыть интерфейс
Откройте в браузере: **http://localhost:3000**

## 🌐 Веб интерфейс

### Основные функции:
- **📊 Dashboard** - главная панель управления
- **🔍 Мониторинг** - статус сервера в реальном времени
- **➕ Создание Workflows** - визуальный конструктор
- **📋 Управление** - просмотр и управление workflows
- **📖 Документация** - встроенная справка

### Быстрые действия:
1. **Проверить статус** - тест доступности API
2. **Показать workflows** - список всех созданных workflows  
3. **Создать пример** - автоматическое создание тестового workflow
4. **Создать свой** - интерактивный конструктор
5. **История выполнений** - мониторинг процессов

## 📡 API Reference

### Health Check
```bash
GET /health
# Ответ: статус системы, uptime, версия
```

### Workflows
```bash
# Получить все workflows
GET /api/workflows

# Создать workflow
POST /api/workflows
Content-Type: application/json
{
  "name": "WB Campaign Collector",
  "description": "Сбор кампаний WB",
  "definition": {
    "nodes": [
      {
        "id": "step-1",
        "type": "wb-get-campaigns",
        "name": "Получить кампании WB",
        "configuration": {
          "filters": {"status": "active"}
        }
      }
    ],
    "connections": []
  }
}

# Выполнить workflow
POST /api/workflows/:id/execute
{
  "inputData": {
    "authToken": "ВАШ_WB_TOKEN"
  }
}
```

### Executions
```bash
# История выполнений
GET /api/executions

# Статус выполнения
GET /api/executions/:id
```

## 💡 Примеры Workflows

### 1. Простой сбор кампаний WB
```json
{
  "name": "WB Campaigns Basic",
  "description": "Базовый сбор активных кампаний",
  "definition": {
    "nodes": [
      {
        "id": "campaigns",
        "type": "wb-get-campaigns",
        "name": "Получить кампании",
        "configuration": {
          "filters": {"status": "active"}
        }
      }
    ]
  }
}
```

### 2. Полная аналитика
```json
{
  "name": "WB Full Analytics",
  "description": "Полный анализ кампаний и статистики",
  "definition": {
    "nodes": [
      {
        "id": "campaigns",
        "type": "wb-get-campaigns", 
        "name": "Получить кампании"
      },
      {
        "id": "stats",
        "type": "wb-get-stats",
        "name": "Получить статистику",
        "configuration": {
          "dateFrom": "2025-09-01",
          "dateTo": "2025-09-20"
        }
      },
      {
        "id": "aggregate", 
        "type": "data-aggregator",
        "name": "Агрегировать данные"
      }
    ],
    "connections": [
      {"source": "campaigns", "target": "stats"},
      {"source": "stats", "target": "aggregate"}
    ]
  }
}
```

## 🔧 Доступные модули

### wb-get-campaigns
Получение списка кампаний WB
```json
{
  "type": "wb-get-campaigns",
  "configuration": {
    "filters": {
      "status": "active|paused|ended",
      "type": 1
    }
  }
}
```

### wb-get-stats  
Получение статистики по кампаниям
```json
{
  "type": "wb-get-stats",
  "configuration": {
    "dateFrom": "2025-09-01",
    "dateTo": "2025-09-20"
  }
}
```

### data-aggregator
Агрегация и обработка данных
```json
{
  "type": "data-aggregator", 
  "configuration": {
    "aggregationType": "sum|avg|count",
    "groupBy": ["field1", "field2"]
  }
}
```

## ❗ Troubleshooting

### Порт занят
```bash
# Найти и убить процесс
lsof -ti:3000 | xargs kill -9

# Запустить снова
npm run dev
```

### Ошибки БД
```bash
# Сбросить и пересоздать БД
npx prisma migrate dev
npx prisma generate
```

### Ошибки WB API
- Проверьте корректность токена WB
- Убедитесь что токен не истёк
- Проверьте лимиты API WB

## 📞 Поддержка

- **Dashboard**: http://localhost:3000
- **Health Check**: http://localhost:3000/health  
- **API Docs**: Встроенная документация в интерфейсе

---
*Обновлено: 20 сентября 2025*
