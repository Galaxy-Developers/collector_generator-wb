import Handlebars from 'handlebars';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class TemplateProcessor {
    constructor() {
        this.handlebars = Handlebars.create();
        this.registerHelpers();
        this.templatesPath = path.join(__dirname, '../templates');
    }
    
    /**
     * Регистрация helper функций для Handlebars
     */
    registerHelpers() {
        // Helper для проверки равенства
        this.handlebars.registerHelper('eq', function(a, b) {
            return a === b;
        });
        
        // Helper для проверки неравенства  
        this.handlebars.registerHelper('neq', function(a, b) {
            return a !== b;
        });
        
        // Helper для условий "если существует"
        this.handlebars.registerHelper('exists', function(value) {
            return value !== undefined && value !== null;
        });
        
        // Helper для форматирования даты
        this.handlebars.registerHelper('formatDate', function(date) {
            return new Date(date).toISOString();
        });
        
        // Helper для camelCase
        this.handlebars.registerHelper('camelCase', function(str) {
            return str.replace(/-([a-z])/g, (match, letter) => letter.toUpperCase());
        });
        
        // Helper для PascalCase
        this.handlebars.registerHelper('pascalCase', function(str) {
            return str.split('-')
                .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                .join('');
        });
        
        // Helper для snake_case
        this.handlebars.registerHelper('snakeCase', function(str) {
            return str.replace(/-/g, '_').toLowerCase();
        });
        
        // Helper для UPPER_CASE
        this.handlebars.registerHelper('upperCase', function(str) {
            return str.replace(/-/g, '_').toUpperCase();
        });
        
        // Helper для генерации списка параметров функции
        this.handlebars.registerHelper('functionParams', function(params) {
            if (!params || typeof params !== 'object') return '';
            return Object.keys(params).join(', ');
        });
        
        // Helper для проверки типа данных
        this.handlebars.registerHelper('isArray', function(value) {
            return Array.isArray(value);
        });
        
        // Helper для получения первого элемента массива
        this.handlebars.registerHelper('first', function(array) {
            return Array.isArray(array) && array.length > 0 ? array[0] : null;
        });
        
        // Helper для получения последнего элемента массива
        this.handlebars.registerHelper('last', function(array) {
            return Array.isArray(array) && array.length > 0 ? array[array.length - 1] : null;
        });
        
        // Helper для join массива
        this.handlebars.registerHelper('join', function(array, separator = ', ') {
            return Array.isArray(array) ? array.join(separator) : '';
        });
        
        // Helper для генерации BigQuery INSERT запроса
        this.handlebars.registerHelper('bqInsertMapping', function(schemaFields, sourceObject = 'item') {
            if (!Array.isArray(schemaFields)) return '';
            
            return schemaFields.map(field => {
                return `${field.name}: ${sourceObject}.${field.source || field.name}`;
            }).join(',\
            ');
        });
        
        // Helper для проверки наличия rate limiting
        this.handlebars.registerHelper('hasRateLimit', function(apiConfig) {
            return apiConfig && apiConfig.rate_limits && 
                   (apiConfig.rate_limits.requests_per_minute || apiConfig.rate_limits.concurrent_requests);
        });
        
        // Helper для проверки наличия пагинации
        this.handlebars.registerHelper('hasPagination', function(apiConfig) {
            return apiConfig && apiConfig.pagination && apiConfig.pagination.type;
        });
        
        // Helper для условного добавления кода
        this.handlebars.registerHelper('ifFeature', function(condition, options) {
            return condition ? options.fn(this) : options.inverse(this);
        });
        
        console.log('✅ Зарегистрировано Handlebars helpers');
    }
    
    /**
     * Обработка шаблона
     */
    async processTemplate(templateName, config) {
        try {
            const templatePath = path.join(this.templatesPath, templateName);
            
            if (!fs.existsSync(templatePath)) {
                throw new Error(`Template not found: ${templatePath}`);
            }
            
            const templateSource = fs.readFileSync(templatePath, 'utf-8');
            const compiledTemplate = this.handlebars.compile(templateSource);
            
            // Подготавливаем контекст для шаблона
            const context = this.prepareContext(config, templateName);
            
            // Генерируем код
            const result = compiledTemplate(context);
            
            return this.postProcessGenerated(result, templateName);
            
        } catch (error) {
            throw new Error(`Failed to process template ${templateName}: ${error.message}`);
        }
    }
    
    /**
     * Подготовка контекста для конкретного шаблона
     */
    prepareContext(config, templateName) {
        const baseContext = { ...config };
        
        // Специфичные настройки для разных шаблонов
        switch (templateName) {
            case 'config.template.js':
                return {
                    ...baseContext,
                    port: config.deployment_config?.port || 8080,
                    datasetId: config.bigquery_config.dataset_id,
                    tableId: config.bigquery_config.table_id,
                    apiBaseUrl: config.api_config.base_url,
                    authType: config.api_config.auth_type,
                    authField: config.api_config.auth_field,
                    rateLimit: config.api_config.rate_limits,
                    pagination: config.api_config.pagination
                };
                
            case 'bqClient.template.js':
                return {
                    ...baseContext,
                    errorClass: `${this.generateClassName(config.collector_name)}Error`,
                    dataParam: 'data',
                    schemaMapping: this.generateSchemaMapping(config),
                    bigQuerySchema: config.bigquery_config.schema,
                    partitionField: config.bigquery_config.partition_field
                };
                
            case 'apiClient.template.js':
                return {
                    ...baseContext,
                    clientName: `${this.generateClassName(config.collector_name)}Client`,
                    errorClass: `${this.generateClassName(config.collector_name)}Error`,
                    endpoints: config.api_config.endpoints,
                    rateLimit: config.api_config.rate_limits,
                    authType: config.api_config.auth_type,
                    authField: config.api_config.auth_field
                };
                
            case 'routes.template.js':
                return {
                    ...baseContext,
                    clientName: `${this.generateClassName(config.collector_name)}Client`,
                    clientFile: `${config.collector_name.replace(/-/g, '')}Client`,
                    bqClientFile: 'bqClient',
                    endpoint: '/api/v1/collect',
                    authField: config.api_config.auth_field || 'apiKey',
                    requiredParams: this.getRequiredParams(config),
                    dataMetric: 'itemsProcessed',
                    metricName: 'items_processed',
                    description: 'items processed',
                    dataFlow: this.generateDataFlow(config),
                    responseFields: this.generateResponseFields(config)
                };
                
            case 'index.template.js':
                return {
                    ...baseContext,
                    serviceName: config.collector_name,
                    version: config.metadata?.generatorVersion || '1.0.0',
                    routesFile: 'routes',
                    errorClass: `${this.generateClassName(config.collector_name)}Error`
                };
                
            case 'errors.template.js':
                return {
                    ...baseContext,
                    errorClass: `${this.generateClassName(config.collector_name)}Error`,
                    defaultCode: 'COLLECTOR_ERROR'
                };
                
            default:
                return baseContext;
        }
    }
    
    /**
     * Генерация имени класса
     */
    generateClassName(collectorName) {
        return collectorName
            .split('-')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join('');
    }
    
    /**
     * Генерация маппинга полей для BigQuery
     */
    generateSchemaMapping(config) {
        const transformations = config.data_processing?.transformations || [];
        const schema = config.bigquery_config.schema;
        
        return schema.map(field => {
            const transformation = transformations.find(t => t.target === field.name);
            
            return {
                target: field.name,
                source: transformation ? transformation.field : field.name,
                type: field.type
            };
        });
    }
    
    /**
     * Получение обязательных параметров
     */
    getRequiredParams(config) {
        const authField = config.api_config.auth_field || 'apiKey';
        const additionalParams = [];
        
        // Анализируем endpoints для получения общих параметров
        config.api_config.endpoints.forEach(endpoint => {
            if (endpoint.params) {
                Object.keys(endpoint.params).forEach(param => {
                    if (!additionalParams.includes(param) && param !== authField) {
                        additionalParams.push(param);
                    }
                });
            }
        });
        
        return [authField, ...additionalParams.slice(0, 3)]; // Ограничиваем до 3 дополнительных
    }
    
    /**
     * Генерация потока данных для routes
     */
    generateDataFlow(config) {
        return config.api_config.endpoints.map((endpoint, index) => ({
            outputVar: `${endpoint.name}Data`,
            methodName: endpoint.name,
            params: Object.keys(endpoint.params || {}).join(', '),
            saveToDb: true
        }));
    }
    
    /**
     * Генерация полей ответа
     */
    generateResponseFields(config) {
        return [
            { name: 'total_endpoints', value: `${config.api_config.endpoints.length}` },
            { name: 'collected_at', value: 'new Date().toISOString()' }
        ];
    }
    
    /**
     * Пост-обработка сгенерированного кода
     */
    postProcessGenerated(content, templateName) {
        // Удаляем лишние пустые строки
        content = content.replace(/\
\\s*\
\\s*\
/g, '\
\
');
        
        // Исправляем отступы
        content = content.replace(/^\\s+$/gm, '');
        
        // Добавляем заголовок с метаданными
        const header = `/**
 * Generated by collector_generator-wb
 * Template: ${templateName}
 * Generated at: ${new Date().toISOString()}
 * 
 * DO NOT MODIFY THIS FILE DIRECTLY
 * Regenerate using: collector-gen generate --config=<config.json>
 */

`;
        
        return header + content;
    }
    
    /**
     * Регистрация кастомного helper
     */
    registerHelper(name, fn) {
        this.handlebars.registerHelper(name, fn);
    }
    
    /**
     * Регистрация partial шаблона
     */
    registerPartial(name, template) {
        this.handlebars.registerPartial(name, template);
    }
}