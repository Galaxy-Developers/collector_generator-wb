#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import figlet from 'figlet';
import { GenerateCommand } from './commands/generate.js';
import { ValidateCommand } from './commands/validate.js';
import { CreateCommand } from './commands/create.js';
import { StatusCommand } from './commands/status.js';

const program = new Command();

// ASCII banner
console.log(
    chalk.cyan(
        figlet.textSync('Collector Gen', { horizontalLayout: 'full' })
    )
);

console.log(chalk.gray('🚀 WB Collector Generator v1.0.0'));
console.log(chalk.gray('Generate production-ready API collectors in seconds\
'));

program
    .name('collector-gen')
    .description('Generate WB API collectors from configuration')
    .version('1.0.0');

// Generate command
program
    .command('generate')
    .description('Generate collector from configuration')
    .argument('<config>', 'Path to configuration JSON file')
    .option('-o, --output <path>', 'Output directory', './generated')
    .option('-f, --force', 'Overwrite existing files')
    .option('--dry-run', 'Show what would be generated without creating files')
    .option('--verbose', 'Verbose logging')
    .action(async (config, options) => {
        try {
            const cmd = new GenerateCommand();
            await cmd.execute(config, options);
        } catch (error) {
            console.error(chalk.red('❌ Generation failed:'), error.message);
            process.exit(1);
        }
    });

// Validate command  
program
    .command('validate')
    .description('Validate collector configuration')
    .argument('<config>', 'Path to configuration JSON file')
    .option('--schema', 'Show configuration schema')
    .option('--example', 'Show example configuration')
    .action(async (config, options) => {
        try {
            const cmd = new ValidateCommand();
            await cmd.execute(config, options);
        } catch (error) {
            console.error(chalk.red('❌ Validation failed:'), error.message);
            process.exit(1);
        }
    });

// Interactive create command
program
    .command('create')
    .description('Create collector configuration interactively')
    .option('-o, --output <path>', 'Output path for configuration', './collector-config.json')
    .option('--preset <name>', 'Use preset configuration', 'custom')
    .option('--no-interactive', 'Skip interactive mode')
    .action(async (options) => {
        try {
            const cmd = new CreateCommand();
            await cmd.execute(options);
        } catch (error) {
            console.error(chalk.red('❌ Creation failed:'), error.message);
            process.exit(1);
        }
    });

// Status command
program
    .command('status')
    .description('Check collector status')
    .argument('<path>', 'Path to collector directory')
    .option('--health', 'Check health endpoint')
    .option('--logs', 'Show recent logs')
    .action(async (path, options) => {
        try {
            const cmd = new StatusCommand();
            await cmd.execute(path, options);
        } catch (error) {
            console.error(chalk.red('❌ Status check failed:'), error.message);
            process.exit(1);
        }
    });

// List presets command
program
    .command('presets')
    .description('List available presets')
    .option('--detail', 'Show detailed information')
    .action(async (options) => {
        const presets = [
            { name: 'wb-feedback', description: 'WB Feedback API collector' },
            { name: 'wb-analytics', description: 'WB Analytics API collector' },
            { name: 'wb-promotion', description: 'WB Promotion API collector' },
            { name: 'generic-rest', description: 'Generic REST API collector' }
        ];
        
        console.log(chalk.cyan('\
📦 Available Presets:\
'));
        
        presets.forEach(preset => {
            console.log(`${chalk.green('●')} ${chalk.bold(preset.name)}`);
            console.log(`  ${chalk.gray(preset.description)}`);
        });
        
        console.log(chalk.gray('\
Usage: collector-gen create --preset <name>'));
    });

// Debug command
program
    .command('debug')
    .description('Debug collector issues')
    .argument('<path>', 'Path to collector directory')
    .option('--config', 'Validate configuration')
    .option('--api', 'Test API connectivity')
    .option('--bigquery', 'Test BigQuery connection')
    .action(async (path, options) => {
        console.log(chalk.yellow('🔍 Debug mode is coming soon...'));
        console.log(chalk.gray('Will include:'));
        console.log(chalk.gray('- Configuration validation'));
        console.log(chalk.gray('- API connectivity testing'));
        console.log(chalk.gray('- BigQuery schema validation'));
        console.log(chalk.gray('- Performance diagnostics'));
    });

// Global error handling
process.on('uncaughtException', (error) => {
    console.error(chalk.red('\
💥 Uncaught Exception:'), error.message);
    console.error(chalk.gray(error.stack));
    process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error(chalk.red('\
💥 Unhandled Rejection:'), reason);
    process.exit(1);
});

program.parse();