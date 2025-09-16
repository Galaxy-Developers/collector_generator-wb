#!/bin/bash

# Прерывать выполнение при любой ошибке
set -e

# Определяем корневую директорию проекта (где находится pnpm-workspace.yaml)
# Это самый надежный способ, не зависящий от того, откуда вы запускаете скрипт.
PROJECT_ROOT=$(git rev-parse --show-toplevel)
if [ -z "$PROJECT_ROOT" ]; then
    echo "Ошибка: не удалось определить корневую директорию проекта. Убедитесь, что это git-репозиторий."
    exit 1
fi


# Целевая директория для развертывания в корне проекта
DEPLOY_DIR="$PROJECT_ROOT/apps/workflow-engine-api/dist_deploy"

echo "🚀 Начало production-сборки для 'workflow-engine-api'..."
echo "Корень проекта: $PROJECT_ROOT"
echo "Целевая директория: $DEPLOY_DIR"

echo "🧹 Очистка старой директории сборки..."
rm -rf "$DEPLOY_DIR"
mkdir -p "$DEPLOY_DIR"

echo "📦 Подготовка приложения с помощью 'pnpm deploy'..."
# Запускаем pnpm из корня проекта, чтобы он точно видел весь воркспейс.
# --filter указывает, какой именно пакет мы собираем.
# --prod оставляет только production-зависимости.
# --legacy решает проблему ERR_PNPM_DEPLOY_NONINJECTED_WORKSPACE.
cd "$PROJECT_ROOT"
pnpm deploy --filter workflow-engine-api --prod --legacy "$DEPLOY_DIR"

echo "✅ Сборка завершена. Готовое приложение находится в $DEPLOY_DIR"