#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import { version } from '../package.json';
import { runCleanup } from './index';
import { displayBanner } from './utils/banner';

const program = new Command();

program
  .name('unused-dependencies-remover')
  .description('A developer\'s spring cleaning CLI tool to detect and remove unused files and code')
  .version(version)
  .option('-d, --dry-run', 'Simulate cleanup without removing any files')
  .option('-c, --clean', 'Perform cleanup after confirmation')
  .option('-p, --path <path>', 'Specify project path to scan', process.cwd())
  .option('-e, --exclude <patterns>', 'Comma-separated patterns to exclude', 'node_modules,dist,build,.git')
  .option('-o, --only <types>', 'Only scan specific types: images,styles,components,exports,dead', '')
  .option('-r, --report <file>', 'Generate report file (JSON or Markdown)')
  .option('-i, --ignore-file <file>', 'Specify custom ignore file', '.cleanupignore')
  .option('-t, --threshold <number>', 'Confidence threshold (0-100) for suggestions', '70')
  .option('-v, --verbose', 'Enable verbose logging')
  .option('--no-interactive', 'Disable interactive prompts')
  .option('--git-safe', 'Only suggest removing files that are committed to git');

program.parse(process.argv);

const options = program.opts();

displayBanner();

(async () => {
  try {
    await runCleanup(options);
  } catch (error) {
    console.error(chalk.red('Error:'), error instanceof Error ? error.message : 'Unknown error');
    if (options.verbose && error instanceof Error) {
      console.error(error);
    }
    process.exit(1);
  }
})();
