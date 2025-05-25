import { promises as fs } from 'fs';
import path from 'path';
import chalk from 'chalk';
import inquirer from 'inquirer';
import { getGitStatus } from './git-checker';

interface UnusedFile {
  path: string;
  size?: number;
  confidence: number;
  type: string;
}

interface UnusedExport {
  filePath: string;
  name: string;
  type?: string;
  confidence: number;
}

interface ScanResults {
  unusedFiles: UnusedFile[];
  unusedExports: UnusedExport[];
}

interface ScanConfig {
  projectPath: string;
  threshold: number;
  gitSafe?: boolean;
  interactive?: boolean;
}

/**
 * Clean up unused files and code
 * @param results Scan results
 * @param config Configuration options
 */
export async function cleanupFiles(results: ScanResults, config: ScanConfig): Promise<void> {
  const { unusedFiles, unusedExports } = results;
  const { projectPath, threshold, gitSafe, interactive } = config;

  const filesAboveThreshold = unusedFiles.filter(file => file.confidence >= threshold);
  const exportsAboveThreshold = unusedExports.filter(exp => exp.confidence >= threshold);

  if (filesAboveThreshold.length === 0 && exportsAboveThreshold.length === 0) {
    console.log(chalk.yellow('\nNo files or exports above confidence threshold to clean up.'));
    return;
  }

  if (gitSafe) {
    const gitStatus = await getGitStatus(projectPath);
    if (gitStatus.hasUncommittedChanges) {
      console.log(chalk.yellow('\n⚠️ Warning: You have uncommitted changes in your repository.'));
      console.log(chalk.yellow('Running with --git-safe requires a clean working directory.'));

      const { proceed } = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'proceed',
          message: 'Do you want to proceed anyway?',
          default: false,
        },
      ]);

      if (!proceed) {
        console.log(chalk.blue('\nCleanup cancelled. Commit your changes and try again.'));
        return;
      }
    }
  }

  console.log(chalk.cyan('\n🧹 Cleanup Summary:'));
  console.log(chalk.cyan('─────────────────────────'));
  console.log(`Files to remove: ${chalk.bold(filesAboveThreshold.length)}`);
  console.log(`Exports to clean: ${chalk.bold(exportsAboveThreshold.length)}`);

  if (interactive) {
    const { confirmCleanup } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'confirmCleanup',
        message: 'Are you sure you want to clean up these files and exports?',
        default: false,
      },
    ]);

    if (!confirmCleanup) {
      console.log(chalk.blue('\nCleanup cancelled.'));
      return;
    }
  }

  if (filesAboveThreshold.length > 0) {
    console.log(chalk.cyan('\n🗑️  Removing unused files...'));

    for (const file of filesAboveThreshold) {
      const filePath = path.join(projectPath, file.path);

      if (interactive) {
        const { confirmFile } = await inquirer.prompt([
          {
            type: 'confirm',
            name: 'confirmFile',
            message: `Remove ${chalk.yellow(file.path)} (${file.confidence}% confidence)?`,
            default: file.confidence >= 90,
          },
        ]);

        if (!confirmFile) {
          console.log(chalk.gray(`  Skipped ${file.path}`));
          continue;
        }
      }

      try {
        await fs.unlink(filePath);
        console.log(chalk.green(`  ✓ Removed ${file.path}`));
      } catch (error: any) {
        console.log(chalk.red(`  ✗ Failed to remove ${file.path}: ${error.message}`));
      }
    }
  }

  if (exportsAboveThreshold.length > 0) {
    console.log(chalk.yellow('\n⚠️ Export removal requires code modifications and is not implemented in this version.'));
    console.log(chalk.yellow('Please remove unused exports manually based on the report.'));
  }

  console.log(chalk.green('\n✨ Cleanup complete!'));
}
