#!/usr/bin/env node

import chalk from 'chalk';
import fs from 'fs';
import path from 'path';

export class StatusCommand {
    async execute(projectPath = '.', options = {}) {
        console.log(chalk.cyan(`🔍 Проверка статуса коллектора: ${projectPath}`));
        
        if (!fs.existsSync(projectPath)) {
            throw new Error(`Директория проекта не найдена: ${projectPath}`);
        }
        
        const requiredFiles = ['package.json', 'src/index.js', 'config.js'];
        let allFilesExist = true;
        
        console.log(chalk.gray('\n📁 Проверка файлов:'));
        
        for (const file of requiredFiles) {
            const filePath = path.join(projectPath, file);
            const exists = fs.existsSync(filePath);
            
            if (exists) {
                console.log(chalk.green(`  ✅ ${file}`));
            } else {
                console.log(chalk.red(`  ❌ ${file}`));
                allFilesExist = false;
            }
        }
        
        if (options.health) {
            console.log(chalk.gray('\n🌐 Проверка health endpoint...'));
            console.log(chalk.yellow('⚠️  HTTP проверка пока не реализована'));
        }
        
        if (options.logs) {
            console.log(chalk.gray('\n📋 Последние логи:'));
            const logPath = path.join(projectPath, 'logs');
            if (fs.existsSync(logPath)) {
                console.log(chalk.gray('Функция чтения логов будет реализована позже'));
            } else {
                console.log(chalk.yellow('⚠️  Папка логов не найдена'));
            }
        }
        
        console.log('\n' + '='.repeat(50));
        
        if (allFilesExist) {
            console.log(chalk.green('✅ Статус: Коллектор готов к работе'));
            return 0;
        } else {
            console.log(chalk.red('❌ Статус: Обнаружены проблемы'));
            console.log(chalk.yellow('💡 Запустите: collector-gen generate <config> для создания недостающих файлов'));
            return 1;
        }
    }
}
