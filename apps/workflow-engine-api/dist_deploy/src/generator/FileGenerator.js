import fs from 'fs';
import path from 'path';
import { promisify } from 'util';

const writeFile = promisify(fs.writeFile);
const mkdir = promisify(fs.mkdir);
const access = promisify(fs.access);

export class FileGenerator {
    constructor() {
        this.generatedFiles = [];
    }
    
    /**
     * Подготовка выходной директории
     */
    async prepareOutputDirectory(outputPath) {
        try {
            await this.ensureDirectory(outputPath);
            
            // Очистка директории если она не пустая (при force mode)
            const exists = await this.directoryExists(outputPath);
            if (exists) {
                const files = fs.readdirSync(outputPath);
                if (files.length > 0) {
                    console.log(`📁 Output directory exists and contains ${files.length} files`);
                }
            }
            
            return true;
        } catch (error) {
            throw new Error(`Failed to prepare output directory: ${error.message}`);
        }
    }
    
    /**
     * Обеспечение существования директории
     */
    async ensureDirectory(dirPath) {
        try {
            await access(dirPath, fs.constants.F_OK);
        } catch {
            // Директория не существует, создаем
            await mkdir(dirPath, { recursive: true });
            console.log(`📁 Created directory: ${dirPath}`);
        }
    }
    
    /**
     * Проверка существования директории
     */
    async directoryExists(dirPath) {
        try {
            const stats = fs.statSync(dirPath);
            return stats.isDirectory();
        } catch {
            return false;
        }
    }
    
    /**
     * Запись файла
     */
    async writeFile(filePath, content) {
        try {
            // Обеспечиваем существование родительской директории
            const parentDir = path.dirname(filePath);
            await this.ensureDirectory(parentDir);
            
            // Записываем файл
            await writeFile(filePath, content, 'utf-8');
            
            // Добавляем в список сгенерированных файлов
            this.generatedFiles.push(filePath);
            
            return true;
        } catch (error) {
            throw new Error(`Failed to write file ${filePath}: ${error.message}`);
        }
    }
    
    /**
     * Копирование файла
     */
    async copyFile(sourcePath, targetPath) {
        try {
            const content = fs.readFileSync(sourcePath);
            await this.writeFile(targetPath, content);
            return true;
        } catch (error) {
            throw new Error(`Failed to copy file ${sourcePath} to ${targetPath}: ${error.message}`);
        }
    }
    
    /**
     * Создание символической ссылки
     */
    async createSymlink(target, linkPath) {
        try {
            await fs.promises.symlink(target, linkPath);
            this.generatedFiles.push(linkPath);
            return true;
        } catch (error) {
            throw new Error(`Failed to create symlink ${linkPath}: ${error.message}`);
        }
    }
    
    /**
     * Установка прав доступа к файлу
     */
    async setFilePermissions(filePath, mode) {
        try {
            await fs.promises.chmod(filePath, mode);
            return true;
        } catch (error) {
            throw new Error(`Failed to set permissions for ${filePath}: ${error.message}`);
        }
    }
    
    /**
     * Создание исполняемого файла
     */
    async writeExecutableFile(filePath, content) {
        await this.writeFile(filePath, content);
        await this.setFilePermissions(filePath, 0o755);
        return true;
    }
    
    /**
     * Генерация файла по шаблону
     */
    async generateFromTemplate(templatePath, outputPath, variables = {}) {
        try {
            let template = fs.readFileSync(templatePath, 'utf-8');
            
            // Простая замена переменных (для случаев без Handlebars)
            Object.keys(variables).forEach(key => {
                const regex = new RegExp(`{{${key}}}`, 'g');
                template = template.replace(regex, variables[key]);
            });
            
            await this.writeFile(outputPath, template);
            return true;
        } catch (error) {
            throw new Error(`Failed to generate from template ${templatePath}: ${error.message}`);
        }
    }
    
    /**
     * Создание пустого файла
     */
    async touchFile(filePath) {
        await this.writeFile(filePath, '');
        return true;
    }
    
    /**
     * Добавление содержимого в файл
     */
    async appendToFile(filePath, content) {
        try {
            await fs.promises.appendFile(filePath, content, 'utf-8');
            
            // Добавляем в список если еще не был добавлен
            if (!this.generatedFiles.includes(filePath)) {
                this.generatedFiles.push(filePath);
            }
            
            return true;
        } catch (error) {
            throw new Error(`Failed to append to file ${filePath}: ${error.message}`);
        }
    }
    
    /**
     * Создание JSON файла
     */
    async writeJsonFile(filePath, data, pretty = true) {
        const content = pretty ? 
            JSON.stringify(data, null, 2) : 
            JSON.stringify(data);
            
        await this.writeFile(filePath, content);
        return true;
    }
    
    /**
     * Создание YAML файла (простая реализация)
     */
    async writeYamlFile(filePath, data) {
        // Простая YAML генерация для основных случаев
        const yamlContent = this.objectToYaml(data);
        await this.writeFile(filePath, yamlContent);
        return true;
    }
    
    /**
     * Преобразование объекта в YAML
     */
    objectToYaml(obj, indent = 0) {
        let yaml = '';
        const spaces = '  '.repeat(indent);
        
        if (Array.isArray(obj)) {
            obj.forEach(item => {
                if (typeof item === 'object') {
                    yaml += `${spaces}- \
${this.objectToYaml(item, indent + 1)}`;
                } else {
                    yaml += `${spaces}- ${item}\
`;
                }
            });
        } else if (typeof obj === 'object' && obj !== null) {
            Object.keys(obj).forEach(key => {
                if (typeof obj[key] === 'object' && obj[key] !== null) {
                    if (Array.isArray(obj[key])) {
                        yaml += `${spaces}${key}:\
`;
                        yaml += this.objectToYaml(obj[key], indent + 1);
                    } else {
                        yaml += `${spaces}${key}:\
${this.objectToYaml(obj[key], indent + 1)}`;
                    }
                } else {
                    yaml += `${spaces}${key}: ${obj[key]}\
`;
                }
            });
        }
        
        return yaml;
    }
    
    /**
     * Получение списка сгенерированных файлов
     */
    getGeneratedFiles() {
        return [...this.generatedFiles];
    }
    
    /**
     * Очистка списка сгенерированных файлов
     */
    clearGeneratedFilesList() {
        this.generatedFiles = [];
    }
    
    /**
     * Получение статистики генерации
     */
    getGenerationStats() {
        const stats = {
            totalFiles: this.generatedFiles.length,
            byExtension: {},
            totalSize: 0
        };
        
        this.generatedFiles.forEach(filePath => {
            const ext = path.extname(filePath).toLowerCase() || 'no-extension';
            stats.byExtension[ext] = (stats.byExtension[ext] || 0) + 1;
            
            try {
                const stat = fs.statSync(filePath);
                stats.totalSize += stat.size;
            } catch {
                // Файл может не существовать, игнорируем
            }
        });
        
        return stats;
    }
    
    /**
     * Валидация сгенерированных файлов
     */
    async validateGeneratedFiles() {
        const results = {
            valid: true,
            errors: [],
            warnings: []
        };
        
        for (const filePath of this.generatedFiles) {
            try {
                // Проверяем существование файла
                await access(filePath, fs.constants.F_OK);
                
                // Проверяем права доступа
                await access(filePath, fs.constants.R_OK);
                
                // Дополнительные проверки для конкретных типов файлов
                const ext = path.extname(filePath).toLowerCase();
                
                if (ext === '.json') {
                    const content = fs.readFileSync(filePath, 'utf-8');
                    try {
                        JSON.parse(content);
                    } catch (parseError) {
                        results.errors.push(`Invalid JSON in ${filePath}: ${parseError.message}`);
                        results.valid = false;
                    }
                }
                
                if (ext === '.js') {
                    const content = fs.readFileSync(filePath, 'utf-8');
                    
                    // Базовая проверка JS синтаксиса
                    if (content.includes('syntax error') || content.includes('undefined')) {
                        results.warnings.push(`Potential issues in ${filePath}`);
                    }
                }
                
            } catch (error) {
                results.errors.push(`File ${filePath}: ${error.message}`);
                results.valid = false;
            }
        }
        
        return results;
    }
    
    /**
     * Создание архива сгенерированных файлов (требует дополнительной зависимости)
     */
    async createArchive(outputPath, format = 'zip') {
        // Заглушка для создания архива
        // В реальной реализации можно использовать node-archiver или подобную библиотеку
        console.log(`📦 Archive creation (${format}) is not implemented yet`);
        console.log(`Files to archive: ${this.generatedFiles.length}`);
        console.log(`Output would be: ${outputPath}`);
        
        return {
            success: false,
            message: 'Archive creation not implemented',
            files: this.generatedFiles.length
        };
    }
}