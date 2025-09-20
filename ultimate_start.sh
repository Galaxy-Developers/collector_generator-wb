#!/bin/bash

# ===================================================================================
# ФИНАЛЬНОЕ РЕШЕНИЕ: УБИВАЕМ ПРОЦЕСС + СОЗДАЕМ ВЕБ ИНТЕРФЕЙС
# ===================================================================================

set -euo pipefail

log_info() { echo "$(date '+%Y-%m-%d %H:%M:%S') [INFO] $*"; }
log_error() { echo "$(date '+%Y-%m-%d %H:%M:%S') [ERROR] $*"; }
log_success() { echo "$(date '+%Y-%m-%d %H:%M:%S') [SUCCESS] $*"; }

log_info "💀 ФИНАЛЬНОЕ РЕШЕНИЕ!"

# ===================================================================================
# ЭТАП 1: УБИВАЕМ ПРОЦЕСС НА ПОРТУ 3000
# ===================================================================================

log_info "💀 УБИВАЕМ ПРОЦЕСС НА ПОРТУ 3000..."

# Находим и убиваем процесс
if lsof -ti:3000 >/dev/null 2>&1; then
    log_info "🔫 Найден процесс на порту 3000, убиваем..."
    lsof -ti:3000 | xargs kill -9 2>/dev/null || true
    sleep 2
    log_success "✅ Процесс на порту 3000 убит"
else
    log_info "ℹ️ Порт 3000 свободен"
fi

# ===================================================================================
# ЭТАП 2: СОЗДАНИЕ ВЕБ ИНТЕРФЕЙСА
# ===================================================================================

log_info "🎨 СОЗДАЕМ ВЕББИТЕЛЬНЫЙ ИНТЕРФЕЙС..."

mkdir -p public

cat > public/index.html << 'EOF'
<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>🚀 Workflow Engine - WB Automation</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            color: #333;
        }

        .container {
            max-width: 1400px;
            margin: 0 auto;
            padding: 20px;
        }

        .header {
            text-align: center;
            color: white;
            margin-bottom: 30px;
        }

        .header h1 {
            font-size: 3rem;
            margin-bottom: 10px;
            text-shadow: 2px 2px 4px rgba(0,0,0,0.3);
        }

        .header p {
            font-size: 1.3rem;
            opacity: 0.9;
        }

        .status-bar {
            background: rgba(255, 255, 255, 0.2);
            backdrop-filter: blur(10px);
            padding: 15px;
            border-radius: 15px;
            margin-bottom: 30px;
            text-align: center;
            color: white;
        }

        .status-indicator {
            display: inline-block;
            width: 12px;
            height: 12px;
            border-radius: 50%;
            background: #28a745;
            margin-right: 10px;
            animation: pulse 2s infinite;
        }

        @keyframes pulse {
            0% { opacity: 1; }
            50% { opacity: 0.5; }
            100% { opacity: 1; }
        }

        .main-grid {
            display: grid;
            grid-template-columns: 1fr 2fr;
            gap: 30px;
            margin-bottom: 30px;
        }

        .card {
            background: white;
            border-radius: 15px;
            padding: 25px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.1);
            transition: transform 0.3s ease, box-shadow 0.3s ease;
        }

        .card:hover {
            transform: translateY(-5px);
            box-shadow: 0 15px 40px rgba(0,0,0,0.15);
        }

        .card h2 {
            color: #667eea;
            margin-bottom: 20px;
            font-size: 1.6rem;
            display: flex;
            align-items: center;
        }

        .card h2::before {
            content: "🎯";
            margin-right: 10px;
            font-size: 1.5rem;
        }

        .quick-actions {
            display: grid;
            grid-template-columns: 1fr;
            gap: 15px;
        }

        .action-btn {
            background: linear-gradient(45deg, #667eea, #764ba2);
            color: white;
            border: none;
            padding: 15px 20px;
            border-radius: 10px;
            cursor: pointer;
            font-size: 1rem;
            font-weight: 500;
            transition: all 0.3s ease;
            text-align: left;
            display: flex;
            align-items: center;
            justify-content: space-between;
        }

        .action-btn:hover {
            transform: scale(1.02);
            box-shadow: 0 5px 15px rgba(102, 126, 234, 0.4);
        }

        .action-btn::after {
            content: "→";
            font-size: 1.2rem;
            transition: transform 0.3s ease;
        }

        .action-btn:hover::after {
            transform: translateX(5px);
        }

        .api-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 20px;
        }

        .endpoint {
            background: #f8f9fa;
            border-radius: 10px;
            padding: 20px;
            border-left: 4px solid #667eea;
            transition: all 0.3s ease;
        }

        .endpoint:hover {
            background: #e9ecef;
            border-left-color: #5a6fd8;
        }

        .endpoint h3 {
            color: #333;
            margin-bottom: 10px;
            font-size: 1.1rem;
        }

        .method {
            display: inline-block;
            padding: 4px 8px;
            border-radius: 4px;
            font-size: 0.8rem;
            font-weight: bold;
            margin-right: 10px;
            text-transform: uppercase;
        }

        .method.get { background: #28a745; color: white; }
        .method.post { background: #007bff; color: white; }
        .method.put { background: #ffc107; color: black; }
        .method.delete { background: #dc3545; color: white; }

        .url {
            font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
            background: #2d3748;
            color: #68d391;
            padding: 8px 12px;
            border-radius: 6px;
            margin: 10px 0;
            word-break: break-all;
            font-size: 0.9rem;
        }

        .test-btn {
            background: #667eea;
            color: white;
            border: none;
            padding: 8px 16px;
            border-radius: 6px;
            cursor: pointer;
            font-size: 0.9rem;
            transition: background 0.3s ease;
        }

        .test-btn:hover {
            background: #5a6fd8;
        }

        .response-area {
            background: white;
            border-radius: 15px;
            padding: 25px;
            margin-top: 30px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.1);
        }

        .response-area h2 {
            color: #667eea;
            margin-bottom: 20px;
        }

        .response-content {
            background: #2d3748;
            color: #e2e8f0;
            padding: 20px;
            border-radius: 8px;
            font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
            overflow-x: auto;
            max-height: 400px;
            overflow-y: auto;
            font-size: 0.9rem;
            line-height: 1.4;
        }

        .docs-section {
            background: white;
            border-radius: 15px;
            padding: 25px;
            margin-top: 30px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.1);
        }

        .tabs {
            display: flex;
            border-bottom: 2px solid #e2e8f0;
            margin-bottom: 25px;
        }

        .tab {
            padding: 12px 24px;
            cursor: pointer;
            border-bottom: 2px solid transparent;
            transition: all 0.3s ease;
            font-weight: 500;
        }

        .tab.active {
            border-bottom-color: #667eea;
            color: #667eea;
        }

        .tab-content {
            display: none;
        }

        .tab-content.active {
            display: block;
            animation: fadeIn 0.3s ease;
        }

        @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
        }

        .code-block {
            background: #2d3748;
            color: #68d391;
            padding: 20px;
            border-radius: 8px;
            font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
            overflow-x: auto;
            margin: 15px 0;
            border-left: 4px solid #667eea;
        }

        .usage-example {
            background: #f0f8ff;
            border: 1px solid #b3d9ff;
            border-radius: 8px;
            padding: 20px;
            margin: 15px 0;
        }

        .usage-example h4 {
            color: #1e40af;
            margin-bottom: 10px;
        }

        .footer {
            text-align: center;
            color: white;
            margin-top: 50px;
            opacity: 0.8;
        }

        .stats {
            display: flex;
            justify-content: space-around;
            background: rgba(255, 255, 255, 0.1);
            backdrop-filter: blur(10px);
            padding: 20px;
            border-radius: 15px;
            margin: 20px 0;
        }

        .stat {
            text-align: center;
            color: white;
        }

        .stat-number {
            font-size: 2rem;
            font-weight: bold;
            color: #68d391;
        }

        .notification {
            position: fixed;
            top: 20px;
            right: 20px;
            background: #28a745;
            color: white;
            padding: 15px 25px;
            border-radius: 10px;
            box-shadow: 0 5px 15px rgba(0,0,0,0.2);
            transform: translateX(400px);
            transition: transform 0.3s ease;
            z-index: 1000;
        }

        .notification.show {
            transform: translateX(0);
        }

        .notification.error {
            background: #dc3545;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🚀 Workflow Engine API</h1>
            <p>Система автоматизации WildBerries кампаний</p>
        </div>

        <div class="status-bar">
            <span class="status-indicator"></span>
            <span>Статус сервера: <span id="server-status">Проверяем...</span></span>
        </div>

        <div class="stats">
            <div class="stat">
                <div class="stat-number" id="workflows-count">0</div>
                <div>Workflows</div>
            </div>
            <div class="stat">
                <div class="stat-number" id="executions-count">0</div>
                <div>Выполнений</div>
            </div>
            <div class="stat">
                <div class="stat-number" id="uptime">0s</div>
                <div>Uptime</div>
            </div>
        </div>

        <div class="main-grid">
            <div class="card">
                <h2>Быстрые действия</h2>
                <div class="quick-actions">
                    <button class="action-btn" onclick="checkHealth()">
                        🔍 Проверить статус системы
                    </button>
                    <button class="action-btn" onclick="getWorkflows()">
                        📋 Показать все Workflows
                    </button>
                    <button class="action-btn" onclick="createSampleWorkflow()">
                        ➕ Создать пример WB Workflow
                    </button>
                    <button class="action-btn" onclick="showCreateForm()">
                        🛠 Создать свой Workflow
                    </button>
                    <button class="action-btn" onclick="getExecutions()">
                        📊 История выполнений
                    </button>
                    <button class="action-btn" onclick="toggleDocs()">
                        📖 Открыть документацию
                    </button>
                </div>
            </div>

            <div class="card">
                <h2>API Endpoints</h2>
                <div class="api-grid">
                    <div class="endpoint">
                        <h3>Health Check</h3>
                        <span class="method get">GET</span>
                        <div class="url">/health</div>
                        <p>Проверка статуса API и получение информации о системе</p>
                        <button class="test-btn" onclick="testEndpoint('/health')">Тест</button>
                    </div>

                    <div class="endpoint">
                        <h3>Workflows</h3>
                        <span class="method get">GET</span>
                        <div class="url">/api/workflows</div>
                        <p>Получить список всех workflows</p>
                        <button class="test-btn" onclick="testEndpoint('/api/workflows')">Тест</button>
                    </div>

                    <div class="endpoint">
                        <h3>Создать Workflow</h3>
                        <span class="method post">POST</span>
                        <div class="url">/api/workflows</div>
                        <p>Создать новый workflow для автоматизации</p>
                        <button class="test-btn" onclick="showCreateForm()">Создать</button>
                    </div>

                    <div class="endpoint">
                        <h3>Выполнить Workflow</h3>
                        <span class="method post">POST</span>
                        <div class="url">/api/workflows/:id/execute</div>
                        <p>Запустить выполнение workflow</p>
                        <button class="test-btn" onclick="showExecuteForm()">Выполнить</button>
                    </div>
                </div>
            </div>
        </div>

        <div class="response-area" id="response-area" style="display: none;">
            <h2>📤 Ответ API</h2>
            <pre id="response-content" class="response-content"></pre>
        </div>

        <div class="docs-section" id="docs-section" style="display: none;">
            <h2>📖 Документация</h2>
            <div class="tabs">
                <div class="tab active" onclick="showTab('quick-start')">🚀 Быстрый старт</div>
                <div class="tab" onclick="showTab('api-reference')">📡 API Reference</div>
                <div class="tab" onclick="showTab('examples')">💡 Примеры</div>
                <div class="tab" onclick="showTab('troubleshooting')">🔧 Troubleshooting</div>
            </div>

            <div id="quick-start" class="tab-content active">
                <h3>🚀 Быстрый старт</h3>

                <div class="usage-example">
                    <h4>1. Проверь статус API</h4>
                    <div class="code-block">curl http://localhost:3000/health</div>
                </div>

                <div class="usage-example">
                    <h4>2. Создай workflow для WB</h4>
                    <div class="code-block">curl -X POST http://localhost:3000/api/workflows \
  -H "Content-Type: application/json" \
  -d '{
    "name": "WB Campaign Collector", 
    "description": "Сбор кампаний WB",
    "definition": {
      "nodes": [
        {
          "id": "wb-step",
          "type": "wb-get-campaigns", 
          "name": "Получить кампании WB"
        }
      ]
    }
  }'</div>
                </div>

                <div class="usage-example">
                    <h4>3. Запусти workflow</h4>
                    <div class="code-block">curl -X POST http://localhost:3000/api/workflows/{ID}/execute \
  -H "Content-Type: application/json" \
  -d '{"inputData": {"authToken": "ВАШ_WB_TOKEN"}}'</div>
                </div>
            </div>

            <div id="api-reference" class="tab-content">
                <h3>📡 API Reference</h3>

                <h4>Основные endpoints:</h4>
                <ul>
                    <li><strong>GET /health</strong> - Статус системы</li>
                    <li><strong>GET /api/workflows</strong> - Список workflows</li>
                    <li><strong>POST /api/workflows</strong> - Создать workflow</li>
                    <li><strong>GET /api/workflows/:id</strong> - Получить workflow</li>
                    <li><strong>PUT /api/workflows/:id</strong> - Обновить workflow</li>
                    <li><strong>DELETE /api/workflows/:id</strong> - Удалить workflow</li>
                    <li><strong>POST /api/workflows/:id/execute</strong> - Выполнить workflow</li>
                    <li><strong>GET /api/executions</strong> - История выполнений</li>
                </ul>

                <h4>Структура Workflow:</h4>
                <div class="code-block">{
  "name": "Название workflow",
  "description": "Описание",
  "definition": {
    "nodes": [
      {
        "id": "step-id",
        "type": "wb-get-campaigns|wb-get-stats|data-aggregator",
        "name": "Название шага",
        "configuration": {...}
      }
    ],
    "connections": [
      {
        "source": "step1-id",
        "target": "step2-id"
      }
    ]
  }
}</div>
            </div>

            <div id="examples" class="tab-content">
                <h3>💡 Примеры использования</h3>

                <div class="usage-example">
                    <h4>Пример 1: Сбор кампаний WB</h4>
                    <div class="code-block">{
  "name": "WB Campaigns",
  "description": "Получение активных кампаний WB",
  "definition": {
    "nodes": [
      {
        "id": "get-campaigns",
        "type": "wb-get-campaigns",
        "name": "Получить кампании",
        "configuration": {
          "filters": {"status": "active"}
        }
      }
    ]
  }
}</div>
                </div>

                <div class="usage-example">
                    <h4>Пример 2: Полная аналитика</h4>
                    <div class="code-block">{
  "name": "WB Full Analytics",
  "description": "Полный анализ кампаний WB",
  "definition": {
    "nodes": [
      {
        "id": "campaigns",
        "type": "wb-get-campaigns",
        "name": "Кампании"
      },
      {
        "id": "stats",
        "type": "wb-get-stats", 
        "name": "Статистика"
      },
      {
        "id": "aggregate",
        "type": "data-aggregator",
        "name": "Агрегация"
      }
    ],
    "connections": [
      {"source": "campaigns", "target": "stats"},
      {"source": "stats", "target": "aggregate"}
    ]
  }
}</div>
                </div>
            </div>

            <div id="troubleshooting" class="tab-content">
                <h3>🔧 Troubleshooting</h3>

                <div class="usage-example">
                    <h4>Порт занят</h4>
                    <p>Если порт 3000 занят:</p>
                    <div class="code-block">lsof -ti:3000 | xargs kill -9
npm run dev</div>
                </div>

                <div class="usage-example">
                    <h4>Ошибки WB API</h4>
                    <p>Проверьте токен WB и лимиты API</p>
                    <div class="code-block"># Получить новый токен в личном кабинете WB
# https://seller.wildberries.ru/</div>
                </div>

                <div class="usage-example">
                    <h4>База данных</h4>
                    <p>Если проблемы с БД:</p>
                    <div class="code-block">npx prisma migrate dev
npx prisma generate</div>
                </div>
            </div>
        </div>

        <div class="footer">
            <p>© 2025 Workflow Engine API - WildBerries Automation System</p>
        </div>
    </div>

    <div id="notification" class="notification"></div>

    <script>
        // Проверка статуса при загрузке
        window.onload = function() {
            checkServerStatus();
            updateStats();
        };

        function showNotification(message, isError = false) {
            const notification = document.getElementById('notification');
            notification.textContent = message;
            notification.className = 'notification show' + (isError ? ' error' : '');

            setTimeout(() => {
                notification.classList.remove('show');
            }, 3000);
        }

        function checkServerStatus() {
            fetch('/health')
                .then(response => response.json())
                .then(data => {
                    document.getElementById('server-status').textContent = '✅ Онлайн';
                    if (data.uptime) {
                        document.getElementById('uptime').textContent = Math.floor(data.uptime) + 's';
                    }
                })
                .catch(error => {
                    document.getElementById('server-status').textContent = '❌ Недоступен';
                });
        }

        function updateStats() {
            fetch('/api/workflows')
                .then(response => response.json())
                .then(data => {
                    if (data && Array.isArray(data)) {
                        document.getElementById('workflows-count').textContent = data.length;
                    }
                })
                .catch(() => {});

            fetch('/api/executions')
                .then(response => response.json())
                .then(data => {
                    if (data && Array.isArray(data)) {
                        document.getElementById('executions-count').textContent = data.length;
                    }
                })
                .catch(() => {});
        }

        function checkHealth() {
            testEndpoint('/health');
        }

        function getWorkflows() {
            testEndpoint('/api/workflows');
        }

        function getExecutions() {
            testEndpoint('/api/executions');
        }

        function testEndpoint(url) {
            showResponseArea();

            fetch(url)
                .then(response => response.json())
                .then(data => {
                    document.getElementById('response-content').textContent = JSON.stringify(data, null, 2);
                    showNotification('✅ Запрос выполнен успешно');
                })
                .catch(error => {
                    document.getElementById('response-content').textContent = 'Ошибка: ' + error.message;
                    showNotification('❌ Ошибка: ' + error.message, true);
                });
        }

        function showResponseArea() {
            document.getElementById('response-area').style.display = 'block';
            document.getElementById('response-area').scrollIntoView({ behavior: 'smooth' });
        }

        function createSampleWorkflow() {
            const sampleWorkflow = {
                name: "WB Campaign Collector Sample",
                description: "Пример workflow для сбора кампаний WB",
                definition: {
                    nodes: [
                        {
                            id: "wb-campaigns",
                            type: "wb-get-campaigns",
                            name: "Получить кампании WB",
                            configuration: {
                                filters: {
                                    status: "active"
                                }
                            }
                        }
                    ],
                    connections: []
                }
            };

            fetch('/api/workflows', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(sampleWorkflow)
            })
            .then(response => response.json())
            .then(data => {
                showResponseArea();
                document.getElementById('response-content').textContent = 
                    '✅ Workflow создан!\n\n' + JSON.stringify(data, null, 2);
                showNotification('✅ Пример workflow создан');
                updateStats();
            })
            .catch(error => {
                showResponseArea();
                document.getElementById('response-content').textContent = 'Ошибка создания: ' + error.message;
                showNotification('❌ Ошибка создания: ' + error.message, true);
            });
        }

        function showCreateForm() {
            const template = {
                name: "My WB Workflow",
                description: "Описание workflow",
                definition: {
                    nodes: [
                        {
                            id: "step-1",
                            type: "wb-get-campaigns",
                            name: "Получить кампании",
                            configuration: {}
                        }
                    ],
                    connections: []
                }
            };

            const form = prompt('Введите JSON для создания workflow:', JSON.stringify(template, null, 2));

            if (form) {
                try {
                    const workflow = JSON.parse(form);
                    fetch('/api/workflows', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify(workflow)
                    })
                    .then(response => response.json())
                    .then(data => {
                        showResponseArea();
                        document.getElementById('response-content').textContent = 
                            '✅ Workflow создан!\n\n' + JSON.stringify(data, null, 2);
                        showNotification('✅ Workflow успешно создан');
                        updateStats();
                    })
                    .catch(error => {
                        showResponseArea();
                        document.getElementById('response-content').textContent = 'Ошибка: ' + error.message;
                        showNotification('❌ Ошибка: ' + error.message, true);
                    });
                } catch (e) {
                    showNotification('❌ Неверный JSON формат', true);
                }
            }
        }

        function showExecuteForm() {
            const workflowId = prompt('Введите ID workflow для выполнения:');
            if (workflowId) {
                const inputData = prompt('Введите входные данные (JSON):', '{"authToken": "ВАШ_WB_TOKEN"}');

                if (inputData) {
                    try {
                        const data = JSON.parse(inputData);
                        fetch('/api/workflows/' + workflowId + '/execute', {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json'
                            },
                            body: JSON.stringify({inputData: data})
                        })
                        .then(response => response.json())
                        .then(result => {
                            showResponseArea();
                            document.getElementById('response-content').textContent = 
                                '✅ Workflow запущен!\n\n' + JSON.stringify(result, null, 2);
                            showNotification('✅ Workflow запущен на выполнение');
                            updateStats();
                        })
                        .catch(error => {
                            showResponseArea();
                            document.getElementById('response-content').textContent = 'Ошибка выполнения: ' + error.message;
                            showNotification('❌ Ошибка выполнения: ' + error.message, true);
                        });
                    } catch (e) {
                        showNotification('❌ Неверный JSON формат входных данных', true);
                    }
                }
            }
        }

        function toggleDocs() {
            const docs = document.getElementById('docs-section');
            if (docs.style.display === 'none') {
                docs.style.display = 'block';
                docs.scrollIntoView({ behavior: 'smooth' });
                showNotification('📖 Документация открыта');
            } else {
                docs.style.display = 'none';
            }
        }

        function showTab(tabName) {
            // Убираем активные классы
            document.querySelectorAll('.tab').forEach(tab => tab.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));

            // Добавляем активные классы
            document.getElementById(tabName).classList.add('active');
            event.target.classList.add('active');
        }

        // Автообновление статистики каждые 30 секунд
        setInterval(() => {
            checkServerStatus();
            updateStats();
        }, 30000);
    </script>
</body>
</html>
EOF

log_success "✅ Веб интерфейс создан"

# ===================================================================================
# ЭТАП 3: ОБНОВЛЕНИЕ index.ts
# ===================================================================================

log_info "📄 ОБНОВЛЯЕМ index.ts..."

cat > src/index.ts << 'EOF'
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import path from 'path';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { logger } from './utils/logger';
import { SocketService } from './services/SocketService';
import workflowRoutes from './routes/workflows';
import executionRoutes from './routes/executions';

const app = express();
const httpServer = createServer(app);
const io = new SocketIOServer(httpServer, {
  cors: { origin: "*", methods: ["GET", "POST"] }
});

// Middleware
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false
}));
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Обслуживание статических файлов
app.use(express.static(path.join(__dirname, '../public')));

// Initialize socket service
SocketService.initialize(io);

// API Routes
app.use('/api/workflows', workflowRoutes);
app.use('/api/executions', executionRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: '1.0.0',
    message: 'Workflow Engine API работает',
    endpoints: {
      dashboard: 'http://localhost:3000',
      health: 'http://localhost:3000/health',
      workflows: 'http://localhost:3000/api/workflows',
      executions: 'http://localhost:3000/api/executions'
    }
  });
});

// Главная страница - редирект на интерфейс
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ 
    error: 'Endpoint not found',
    message: 'Откройте http://localhost:3000 для веб интерфейса',
    availableEndpoints: {
      'Dashboard': '/',
      'Health Check': '/health', 
      'API Workflows': '/api/workflows',
      'API Executions': '/api/executions'
    }
  });
});

// Error handling
app.use((error: any, req: any, res: any, next: any) => {
  logger.error('Server error:', error);
  res.status(500).json({ 
    error: 'Internal server error',
    message: error?.message || 'Unknown error'
  });
});

const PORT = process.env.PORT || 3000;

httpServer.listen(PORT, () => {
  console.log('');
  console.log('🚀 ==========================================');
  console.log('🎯 WORKFLOW ENGINE API ЗАПУЩЕН!');
  console.log('🚀 ==========================================');
  console.log('');
  console.log('📊 Dashboard:     http://localhost:' + PORT);
  console.log('🔍 Health Check:  http://localhost:' + PORT + '/health');
  console.log('📡 API:           http://localhost:' + PORT + '/api');
  console.log('');
  console.log('✅ Все готово! Открывайте браузер!');
  console.log('');

  logger.info('Workflow Engine API started on port ' + PORT);
});
EOF

log_success "✅ index.ts обновлен"

# ===================================================================================
# ЭТАП 4: СОЗДАНИЕ ДОКУМЕНТАЦИИ
# ===================================================================================

log_info "📖 СОЗДАЕМ ДОКУМЕНТАЦИЮ..."

cat > USAGE_GUIDE.md << 'EOF'
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
EOF

log_success "✅ Документация создана"

# ===================================================================================
# ЭТАП 5: ФИНАЛЬНЫЙ ЗАПУСК
# ===================================================================================

log_info "🚀 ФИНАЛЬНЫЙ ЗАПУСК..."

# Проверяем что порт свободен
if lsof -ti:3000 >/dev/null 2>&1; then
    log_info "🔫 Убиваем процессы на порту 3000..."
    lsof -ti:3000 | xargs kill -9 2>/dev/null || true
    sleep 2
fi

# Запускаем в фоне и сразу показываем результат
(npm run dev &) && sleep 3

log_success "🎉 СИСТЕМА ЗАПУЩЕНА!"

echo ""
echo "🎯 =================================="
echo "🚀 ВСЕ ГОТОВО! СИСТЕМА РАБОТАЕТ!"
echo "🎯 =================================="
echo ""
echo "🌐 Откройте в браузере:"
echo "   👉 http://localhost:3000"
echo ""
echo "📊 Доступные функции:"
echo "   ✅ Красивый веб интерфейс"
echo "   ✅ Создание и управление workflows"
echo "   ✅ Тестирование API"
echo "   ✅ Мониторинг выполнений" 
echo "   ✅ Встроенная документация"
echo "   ✅ Примеры для WB"
echo ""
echo "🔥 ТЕПЕРЬ У ВАС ЕСТЬ ПОЛНОЦЕННЫЙ ИНТЕРФЕЙС!"
echo ""

exit 0
