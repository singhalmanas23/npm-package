import chalk from 'chalk';
import { version } from '../../package.json';

/**
 * Display the CLI banner
 */
export function displayBanner(): void {
  console.log('\n');
  console.log(chalk.cyan('🧹  ') + chalk.bold.white('unused-dependencies-remover') + chalk.cyan(" — A Developer's Spring Cleaning CLI Tool"));
  console.log(chalk.gray(`v${version}`));
  console.log(chalk.gray('───────────────────────────────────────────────────'));
  console.log('');
}
