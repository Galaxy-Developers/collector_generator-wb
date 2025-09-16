# 🎯 Service: Workflow Engine API

> **GalaxyDevelopers** - Backend-сервис для визуального конструктора workflow, предназначенный для сбора и анализа API данных.

[![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)](https://semver.org/)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
[![Build Status](https://img.shields.io/badge/build-passing-brightgreen.svg)](https://github.com/your-org/your-repo/actions)
[![Documentation](https://img.shields.io/badge/docs-available-brightgreen.svg)](docs/README.md)

## 🚀 Что это такое? / Назначение

Этот проект представляет собой мощный backend-сервис, разработанный для поддержки визуального конструктора workflow. Он позволяет пользователям создавать, управлять и выполнять сложные пайплайны обработки данных, интегрируясь с различными источниками API (в частности, Wildberries) и системами хранения данных (Google BigQuery).

**Основные возможности:**
*   **Управление Workflow**: Создание, чтение, обновление, удаление, дублирование и валидация рабочих процессов.
*   **Выполнение Workflow**: Асинхронный запуск workflow с поддержкой очередей, зависимостей шагов, паузы, возобновления и остановки.
*   **Модульная архитектура**: Расширяемая система модулей (узлов) для выполнения различных операций:
    *   Интеграция с Wildberries API (получение кампаний, статистики, ключевых слов).
    *   Обработка данных (фильтрация, расчет метрик, агрегация, трансформация).
    *   Выполнение HTTP-запросов.
    *   Управление задержками.
*   **Интеграция с BigQuery**: Автоматическое сохранение сырых и обработанных данных в Google BigQuery для последующего анализа.
*   **Реальное время**: Уведомления о статусе выполнения workflow и шагов через WebSocket (Socket.IO).
*   **Отказоустойчивость**: Встроенные механизмы Circuit Breaker и Retry Policy для надежной работы с внешними API.
*   **Безопасность**: Аутентификация на основе JWT и авторизация по ролям.
*   **Логирование**: Детальное логирование с использованием Winston для мониторинга и отладки.

## ⚡ Быстрый старт

### Предварительные требования

*   Node.js (версия 18 или выше)
*   npm или yarn
*   PostgreSQL
*   Redis
*   Google Cloud Project с активированным BigQuery API
*   Wildberries API Key

### Установка

1.  Клонируйте репозиторий:
    ```bash
    git clone https://github.com/your-org/your-repo.git
    cd collector_generator-wb
    ```
2.  Установите зависимости:
    ```bash
    npm install
    # или
    yarn install
    ```
3.  Настройте переменные окружения. Создайте файл `.env` в корне проекта на основе `.env.example`:
    ```
    PORT=3001
    NODE_ENV=development

    DATABASE_URL="postgresql://user:password@localhost:5432/database_name"
    REDIS_HOST=localhost
    REDIS_PORT=6379
    REDIS_PASSWORD=

    JWT_SECRET=your_jwt_secret_key

    WB_API_BASE_URL=https://advert-api.wildberries.ru
    WB_API_KEY=your_wildberries_api_key
    WB_ANALYTICS_BASE_URL=https://statistics-api.wildberries.ru

    GCP_PROJECT_ID=your_google_cloud_project_id
    # Для аутентификации Google Cloud, убедитесь, что у вас настроены
    # учетные данные по умолчанию (например, через `gcloud auth application-default login`)
    # или укажите путь к файлу ключа сервисного аккаунта:
    # GOOGLE_APPLICATION_CREDENTIALS=/path/to/your/keyfile.json

    FRONTEND_URL=http://localhost:3000
    LOG_LEVEL=info
    ```
4.  Выполните миграции Prisma для создания базы данных:
    ```bash
    npx prisma migrate dev --name init
    ```

### Запуск

1.  Запустите Redis и PostgreSQL.
2.  Запустите приложение:
    ```bash
    npm run start
    # или
    yarn start
    ```
    Сервер будет доступен по адресу `http://localhost:3001` (или по порту, указанному в `.env`).

### Доступ к Bull Board (мониторинг очередей)

Если Bull Board будет интегрирован, он будет доступен по адресу `http://localhost:3001/admin/queues` (или по настроенному пути).

## 📚 Документация

*   **API Reference**: Подробное описание всех доступных API-эндпоинтов будет доступно в формате OpenAPI (Swagger) после интеграции.
*   **Workflow Modules**: Описание каждого доступного модуля (узла) workflow, его конфигурации и ожидаемых входных/выходных данных.

## 📖 API Reference

### Аутентификация

Все защищенные эндпоинты требуют JWT-токен в заголовке `Authorization` в формате `Bearer <token>`.

### Базовый URL и версионирование

`http://localhost:3001/api/v1`

### Эндпоинты

#### Workflow Management (`/workflows`)

*   `GET /`: Получить список workflow.
*   `POST /`: Создать новый workflow.
*   `GET /:id`: Получить детали workflow по ID.
*   `PUT /:id`: Обновить workflow по ID.
*   `DELETE /:id`: Удалить workflow по ID.
*   `POST /:id/execute`: Запустить выполнение workflow.
*   `POST /:id/validate`: Валидировать workflow.
*   `POST /:id/duplicate`: Дублировать workflow.
*   `GET /:id/executions`: Получить список выполнений для конкретного workflow.

#### Workflow Execution (`/executions`)

*   `GET /`: Получить список всех выполнений workflow.
*   `GET /:id`: Получить детали выполнения workflow по ID.
*   `POST /:id/pause`: Приостановить выполнение workflow.
*   `POST /:id/resume`: Возобновить выполнение workflow.
*   `POST /:id/stop`: Остановить выполнение workflow.
*   `GET /:id/logs`: Получить логи выполнения workflow.
*   `GET /:id/steps`: Получить шаги выполнения workflow.
*   `POST /:id/steps/:stepId/retry`: Повторить выполнение конкретного шага.

## 🔧 Примеры использования

### Пример создания Workflow (POST /api/v1/workflows)

```json
{
  "name": "Анализ Рекламных Кампаний WB",
  "description": "Workflow для получения списка активных кампаний Wildberries, их статистики и агрегации данных.",
  "definition": {
    "nodes": [
      {
        "id": "node-1",
        "type": "wb-get-campaigns",
        "position": { "x": 0, "y": 0 },
        "data": {
          "label": "Получить Кампании WB",
          "config": {
            "status": 9,
            "type": 4
          }
        }
      },
      {
        "id": "node-2",
        "type": "wb-get-statistics",
        "position": { "x": 200, "y": 0 },
        "data": {
          "label": "Получить Статистику WB",
          "config": {
            "period": 7
          }
        }
      },
      {
        "id": "node-3",
        "type": "data-aggregator",
        "position": { "x": 400, "y": 0 },
        "data": {
          "label": "Агрегировать Данные",
          "config": {
            "groupBy": "campaignId",
            "aggregations": [
              { "name": "totalViews", "field": "views", "operation": "sum" },
              { "name": "totalSpend", "field": "spend", "operation": "sum" }
            ]
          }
        }
      }
    ],
    "edges": [
      { "id": "edge-1-2", "source": "node-1", "target": "node-2", "sourceHandle": "campaigns_out", "targetHandle": "campaigns_in" },
      { "id": "edge-2-3", "source": "node-2", "target": "node-3", "sourceHandle": "stats_out", "targetHandle": "stats_in" }
    ]
  },
  "priority": 5
}
```

### Пример запуска Workflow (POST /api/v1/workflows/:id/execute)

```json
{
  "inputData": {
    "someInitialParam": "value"
  }
}
```

## 👥 Команда/Контакты

*   **Разработка**: GalaxyDevelopers Team - dev@galaxydevelopers.com
*   **Поддержка**: support@galaxydevelopers.com

---

**© 2024 GalaxyDevelopers** | *Стандартизация как основа качественной разработки* ⭐
