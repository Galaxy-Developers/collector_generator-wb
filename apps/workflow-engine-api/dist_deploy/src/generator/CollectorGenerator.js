import Handlebars from 'handlebars';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { ConfigValidator } from './ConfigValidator.js';
import { TemplateProcessor } from './TemplateProcessor.js';
import { SchemaGenerator } from './SchemaGenerator.js';
import { FileGenerator } from './FileGenerator.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class CollectorGenerator {
    constructor() {
        this.validator = new ConfigValidator();
        this.templateProcessor = new TemplateProcessor();
        this.schemaGenerator = new SchemaGenerator();
        this.fileGenerator = new FileGenerator();
        
        this.templatesPath = path.join(__dirname, '../templates');
        this.outputPath = null;
    }
    
    /**
     * Генерация коллектора из конфигурации
     */
    async generate(configPath, outputPath) {
        console.log('🚀 Начинаем генерацию коллектора...');
        
        // 1. Загружаем и валидируем конфигурацию
        const config = await this.loadConfig(configPath);
        const validationResult = this.validator.validate(config);
        
        if (!validationResult.valid) {
            throw new Error(`❌ Ошибка валидации конфигурации: ${validationResult.errors.join(', ')}`);
        }
        
        console.log('✅ Конфигурация валидна');
        
        // 2. Подготавливаем выходную директорию
        this.outputPath = outputPath;
        await this.fileGenerator.prepareOutputDirectory(outputPath);
        
        console.log(`📁 Создание структуры проекта в ${outputPath}`);
        
        // 3. Генерируем BigQuery схемы
        const schemas = this.schemaGenerator.generateSchemas(config);
        console.log(`🔧 Сгенерировано ${Object.keys(schemas).length} схем BigQuery`);
        
        // 4. Обогащаем конфигурацию дополнительными данными
        const enrichedConfig = this.enrichConfig(config, schemas);
        
        // 5. Генерируем файлы из шаблонов
        await this.generateFiles(enrichedConfig);
        
        // 6. Генерируем package.json
        await this.generatePackageJson(enrichedConfig);
        
        // 7. Создаем дополнительные файлы и папки
        await this.createProjectStructure(enrichedConfig);
        
        console.log('🎉 Генерация завершена успешно!');
        console.log(`📦 Проект создан в: ${outputPath}`);
        
        return {
            success: true,
            outputPath: outputPath,
            filesGenerated: await this.getGeneratedFilesList()
        };
    }
    
    /**
     * Загрузка конфигурации из файла
     */
    async loadConfig(configPath) {
        try {
            const configContent = fs.readFileSync(configPath, 'utf-8');
            return JSON.parse(configContent);
        } catch (error) {
            throw new Error(`❌ Не удалось загрузить конфигурацию из ${configPath}: ${error.message}`);
        }
    }
    
    /**
     * Обогащение конфигурации дополнительными данными
     */
    enrichConfig(config, schemas) {
        const enriched = { ...config };
        
        // Добавляем схемы
        enriched.schemas = schemas;
        
        // Генерируем имена классов и файлов
        enriched.className = this.generateClassName(config.collector_name);
        enriched.errorClass = `${enriched.className}Error`;
        enriched.clientName = `${enriched.className}Client`;
        
        // Генерируем имена файлов
        enriched.files = {
            config: 'config.js',
            bqClient: 'bqClient.js', 
            apiClient: `${config.collector_name.replace(/-/g, '')}Client.js`,
            routes: 'routes.js',
            index: 'index.js',
            errors: 'errors'
        };
        
        // Добавляем метаданные
        enriched.metadata = {
            generatedAt: new Date().toISOString(),
            generatorVersion: '1.0.0',
            nodeVersion: process.version
        };
        
        return enriched;
    }
    
    /**
     * Генерация всех файлов из шаблонов
     */
    async generateFiles(config) {
        const templates = [
            'config.template.js',
            'bqClient.template.js', 
            'apiClient.template.js',
            'routes.template.js',
            'index.template.js',
            'errors.template.js'
        ];
        
        for (const templateName of templates) {
            const outputFileName = this.getOutputFileName(templateName, config);
            const outputFilePath = path.join(this.outputPath, 'src', outputFileName);
            
            console.log(`🔧 Генерация ${outputFileName}`);
            
            const content = await this.templateProcessor.processTemplate(templateName, config);
            await this.fileGenerator.writeFile(outputFilePath, content);
        }
    }
    
    /**
     * Генерация package.json
     */
    async generatePackageJson(config) {
        const packageJson = {
            name: config.collector_name,
            version: '1.0.0',
            description: `Generated WB collector for ${config.api_config?.base_url || 'API'}`,
            type: 'module',
            main: 'src/index.js',
            scripts: {
                start: 'node src/index.js',
                dev: 'nodemon src/index.js',
                test: 'jest',
                'test:integration': 'jest --testPathPattern=integration'
            },
            dependencies: {
                'axios': '^1.6.2',
                'dotenv': '^16.3.1',
                'fastify': '^4.24.3',
                'handlebars': '^4.7.8',
                'pino': '^8.16.2',
                'pino-pretty': '^10.2.3',
                'prom-client': '^15.0.0',
                '@google-cloud/bigquery': '^7.3.0',
                '@google-cloud/secret-manager': '^5.0.1'
            },
            devDependencies: {
                'jest': '^29.7.0',
                'nodemon': '^3.0.2',
                'supertest': '^6.3.3'
            },
            engines: {
                node: '>=18.0.0'
            }
        };
        
        // Добавляем зависимости от WB SDK если нужно
        if (config.api_config?.base_url?.includes('wildberries')) {
            packageJson.dependencies['@galaxy-wb-sdk/promotion'] = 'workspace:*';
            packageJson.dependencies['@galaxy-wb-sdk/analytics'] = 'workspace:*';
        }
        
        const packagePath = path.join(this.outputPath, 'package.json');
        await this.fileGenerator.writeFile(packagePath, JSON.stringify(packageJson, null, 2));
        
        console.log('📦 Сгенерирован package.json');
    }
    
    /**
     * Создание структуры проекта
     */
    async createProjectStructure(config) {
        const directories = [
            'src',
            'src/errors',
            'tests',
            'tests/unit',
            'tests/integration',
            'config',
            'temp'
        ];
        
        for (const dir of directories) {
            const dirPath = path.join(this.outputPath, dir);
            await this.fileGenerator.ensureDirectory(dirPath);
        }
        
        // Создаем .env.template
        const envTemplate = `# Environment Configuration
NODE_ENV=development
PORT=${config.deployment_config?.port || 8080}
LOG_LEVEL=${config.deployment_config?.log_level || 'info'}

# BigQuery Configuration  
BIGQUERY_TABLE_ID=${config.bigquery_config?.table_id || 'default_table'}

# API Configuration
${config.api_config?.auth_field?.toUpperCase() || 'API_KEY'}=your_api_key_here

# GCP Project Configuration
# Make sure to place your key.json in the config/ directory
`;
        
        await this.fileGenerator.writeFile(
            path.join(this.outputPath, '.env.template'),
            envTemplate
        );
        
        // Создаем README.md
        const readme = this.generateReadme(config);
        await this.fileGenerator.writeFile(
            path.join(this.outputPath, 'README.md'),
            readme
        );
        
        // Создаем .gitignore
        const gitignore = `node_modules/
dist/
temp/
config/key.json
.env
.env.local
logs/
*.log
.DS_Store
.vscode/
.idea/
coverage/
`;
        
        await this.fileGenerator.writeFile(
            path.join(this.outputPath, '.gitignore'),
            gitignore
        );
        
        console.log('📁 Структура проекта создана');
    }
    
    /**
     * Генерация имени класса из имени коллектора
     */
    generateClassName(collectorName) {
        return collectorName
            .split('-')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join('');
    }
    
    /**
     * Получение имени выходного файла по шаблону
     */
    getOutputFileName(templateName, config) {
        const mapping = {
            'config.template.js': 'config.js',
            'bqClient.template.js': 'bqClient.js',
            'apiClient.template.js': `${config.collector_name.replace(/-/g, '')}Client.js`,
            'routes.template.js': 'routes.js', 
            'index.template.js': 'index.js',
            'errors.template.js': 'errors/CollectorError.js'
        };
        
        return mapping[templateName] || templateName.replace('.template', '');
    }
    
    /**
     * Генерация README.md
     */
    generateReadme(config) {
        return `# ${config.collector_name}

Generated WB API collector using collector_generator-wb.

## Description
${config.description || 'Automatically generated API collector'}

## Quick Start

1. Install dependencies:
\`\`\`bash
npm install
\`\`\`

2. Copy environment configuration:
\`\`\`bash
cp .env.template .env
\`\`\`

3. Configure your API keys in .env file

4. Place your GCP key.json in config/ directory

5. Start the service:
\`\`\`bash
npm start
\`\`\`

## API Endpoints

${config.api_config?.endpoints?.map(endpoint => 
`### ${endpoint.name}
- **Method**: ${endpoint.method}
- **Path**: ${endpoint.path}
- **Parameters**: ${JSON.stringify(endpoint.params || {}, null, 2)}
`).join('\
') || 'No endpoints configured'}

## Configuration

This collector is configured to work with:
- **API Base URL**: ${config.api_config?.base_url}
- **BigQuery Dataset**: ${config.bigquery_config?.dataset_id}
- **BigQuery Table**: ${config.bigquery_config?.table_id}

## Generated Files

- \`src/config.js\` - Configuration management
- \`src/bqClient.js\` - BigQuery integration 
- \`src/${config.collector_name.replace(/-/g, '')}Client.js\` - API client
- \`src/routes.js\` - HTTP routes
- \`src/index.js\` - Main entry point

## Health Check

\`GET /health\` - Service health status
\`GET /metrics\` - Prometheus metrics

---
Generated at: ${new Date().toISOString()}
`;
    }
    
    /**
     * Получение списка сгенерированных файлов
     */
    async getGeneratedFilesList() {
        // Рекурсивно получаем все файлы в выходной директории
        const files = [];
        
        const scanDirectory = (dir) => {
            const items = fs.readdirSync(dir);
            
            for (const item of items) {
                const itemPath = path.join(dir, item);
                const stat = fs.statSync(itemPath);
                
                if (stat.isDirectory()) {
                    scanDirectory(itemPath);
                } else {
                    files.push(path.relative(this.outputPath, itemPath));
                }
            }
        };
        
        if (fs.existsSync(this.outputPath)) {
            scanDirectory(this.outputPath);
        }
        
        return files;
    }
}