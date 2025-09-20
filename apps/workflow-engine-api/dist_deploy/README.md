# collector_generator-wb

🚀 **Генератор API коллекторов для Wildberries** - автоматизированное создание production-ready коллекторов данных за минуты вместо дней.

## ⚡ Быстрый старт

### Установка
```bash
npm install -g collector-generator-wb
```

### Создание первого коллектора
```bash
# Интерактивное создание конфигурации
collector-gen create --preset wb-feedback

# Генерация коллектора
collector-gen generate wb-feedback-config.json

# Проверка статуса
collector-gen status ./generated-collector
```

## 🎯 Возможности

- ✅ **Автоматическая генерация** полнофункциональных Node.js коллекторов
- ✅ **Handlebars шаблоны** для максимальной кастомизации  
- ✅ **BigQuery интеграция** с автоматической схемой
- ✅ **Rate limiting** и retry логика
- ✅ **Prometheus метрики** и health checks
- ✅ **CLI интерфейс** с интерактивными мастерами
- ✅ **JSON конфигурация** - простой декларативный синтаксис

## 📋 Команды CLI

### collector-gen create
Интерактивное создание конфигурации коллектора

### collector-gen generate
Генерация коллектора из конфигурации

### collector-gen validate
Валидация конфигурации

### collector-gen status
Проверка статуса коллектора

## 🏗️ Структура сгенерированного коллектора

```
my-wb-collector/
├── src/
│   ├── config.js              # Конфигурация приложения
│   ├── index.js               # Точка входа
│   ├── routes.js              # HTTP маршруты
│   ├── clients/
│   │   ├── apiClient.js       # WB API клиент
│   │   └── bqClient.js        # BigQuery клиент
│   └── errors/
│       └── FeedbackError.js   # Кастомные ошибки
├── package.json               # Зависимости и скрипты
├── Dockerfile                 # Docker контейнер
├── .env.example              # Пример переменных окружения
└── README.md                 # Документация коллектора
```

## ⚙️ Пример конфигурации

```json
{
  "name": "wb-feedback-collector",
  "description": "Коллектор отзывов Wildberries",
  "version": "1.0.0",
  "api": {
    "endpoint": "https://feedbacks-api.wildberries.ru/api/v1/feedbacks",
    "authentication": {
      "type": "header",
      "key": "Authorization"
    }
  },
  "bigquery": {
    "dataset": "wb_analytics",
    "table": "feedbacks"
  }
}
```

## 🚀 Production deployment  

### Docker
```bash
docker build -t my-wb-collector .
docker run -p 3000:3000 my-wb-collector
```

## 📝 Лицензия

MIT License

---

**🎉 collector_generator-wb - создавайте WB коллекторы за минуты, а не дни!**
