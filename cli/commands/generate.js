import fs from 'fs';
import path from 'path';
import chalk from 'chalk';
import ora from 'ora';
import { CollectorGenerator } from '../generator/CollectorGenerator.js';

export class GenerateCommand {
    constructor() {
        this.generator = new CollectorGenerator();
        this.spinner = null;
    }
    
    async execute(configPath, options) {
        const startTime = Date.now();
        
        // Валидация входных параметров
        if (!fs.existsSync(configPath)) {
            throw new Error(`Configuration file not found: ${configPath}`);
        }
        
        const outputPath = path.resolve(options.output);
        
        // Проверка на перезапись существующих файлов
        if (fs.existsSync(outputPath) && !options.force) {
            const files = fs.readdirSync(outputPath);
            if (files.length > 0) {
                throw new Error(
                    `Output directory is not empty: ${outputPath}\
` +
                    `Use --force to overwrite or choose a different directory`
                );
            }
        }
        
        console.log(chalk.cyan('🚀 Starting collector generation...\
'));
        
        if (options.verbose) {
            console.log(chalk.gray(`Configuration: ${configPath}`));
            console.log(chalk.gray(`Output: ${outputPath}`));
            console.log(chalk.gray(`Force overwrite: ${options.force ? 'Yes' : 'No'}`));
            console.log(chalk.gray(`Dry run: ${options.dryRun ? 'Yes' : 'No'}\
`));
        }
        
        try {
            // Dry run mode
            if (options.dryRun) {
                await this.performDryRun(configPath, outputPath, options);
                return;
            }
            
            // Actual generation
            this.spinner = ora('Loading configuration...').start();
            
            const result = await this.generator.generate(configPath, outputPath);
            
            this.spinner.succeed('Generation completed successfully!');
            
            // Показываем результаты
            this.showResults(result, startTime, options);
            
            // Показываем следующие шаги
            this.showNextSteps(outputPath, result);
            
        } catch (error) {
            if (this.spinner) {
                this.spinner.fail('Generation failed');
            }
            throw error;
        }
    }
    
    async performDryRun(configPath, outputPath, options) {
        console.log(chalk.yellow('🏃 Dry run mode - no files will be created\
'));
        
        // Загружаем и валидируем конфигурацию
        const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
        
        console.log(chalk.cyan('📋 Would generate:\
'));
        
        console.log(chalk.green('📁 Project Structure:'));
        const structure = [
            'src/',
            'src/config.js',
            'src/bqClient.js', 
            `src/${config.collector_name.replace(/-/g, '')}Client.js`,
            'src/routes.js',
            'src/index.js',
            'src/errors/',
            'src/errors/CollectorError.js',
            'tests/',
            'tests/unit/',
            'tests/integration/',
            'config/',
            'temp/',
            'package.json',
            'README.md',
            '.env.template',
            '.gitignore'
        ];
        
        structure.forEach(item => {
            const isDir = item.endsWith('/');
            const icon = isDir ? '📁' : '📄';
            console.log(`  ${icon} ${item}`);
        });
        
        console.log(chalk.cyan('\
🔧 Configuration Summary:'));
        console.log(`  Collector Name: ${chalk.bold(config.collector_name)}`);
        console.log(`  API Base URL: ${chalk.bold(config.api_config.base_url)}`);
        console.log(`  Endpoints: ${chalk.bold(config.api_config.endpoints.length)}`);
        console.log(`  BigQuery Dataset: ${chalk.bold(config.bigquery_config.dataset_id)}`);
        console.log(`  BigQuery Table: ${chalk.bold(config.bigquery_config.table_id)}`);
        
        console.log(chalk.gray('\
Use without --dry-run to actually generate files'));
    }
    
    showResults(result, startTime, options) {
        const duration = ((Date.now() - startTime) / 1000).toFixed(2);
        
        console.log(chalk.green(`\
✅ Collector generated successfully in ${duration}s\
`));
        
        console.log(chalk.cyan('📊 Generation Summary:'));
        console.log(`  Output directory: ${chalk.bold(result.outputPath)}`);
        console.log(`  Files created: ${chalk.bold(result.filesGenerated.length)}`);
        
        if (options.verbose && result.filesGenerated.length > 0) {
            console.log(chalk.cyan('\
📄 Generated Files:'));
            result.filesGenerated.forEach(file => {
                console.log(`  📄 ${file}`);
            });
        }
    }
    
    showNextSteps(outputPath, result) {
        console.log(chalk.cyan('\
🎯 Next Steps:\
'));
        
        const collectorName = path.basename(outputPath);
        
        console.log(`${chalk.green('1.')} Navigate to the project:`);
        console.log(`   ${chalk.gray('cd')} ${outputPath}`);
        
        console.log(`\
${chalk.green('2.')} Install dependencies:`);
        console.log(`   ${chalk.gray('npm install')}`);
        
        console.log(`\
${chalk.green('3.')} Configure environment:`);
        console.log(`   ${chalk.gray('cp .env.template .env')}`);
        console.log(`   ${chalk.gray('# Edit .env with your API keys and configuration')}`);
        
        console.log(`\
${chalk.green('4.')} Add GCP credentials:`);
        console.log(`   ${chalk.gray('# Place your key.json in config/ directory')}`);
        
        console.log(`\
${chalk.green('5.')} Start the collector:`);
        console.log(`   ${chalk.gray('npm start')}`);
        
        console.log(`\
${chalk.cyan('📚 Documentation:')} README.md`);
        console.log(`${chalk.cyan('🩺 Health Check:')} http://localhost:8080/health`);
        console.log(`${chalk.cyan('📈 Metrics:')} http://localhost:8080/metrics`);
        
        console.log(chalk.yellow('\
⚠️  Remember to configure your API keys and GCP credentials before starting!'));
    }
}