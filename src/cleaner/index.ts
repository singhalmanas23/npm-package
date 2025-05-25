import { promises as fs } from 'fs';
import path from 'path';
import chalk from 'chalk';
import inquirer from 'inquirer';
import { Project, Node } from 'ts-morph';
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

interface UnusedImport {
  filePath: string;
  name: string;
  source: string;
  type?: string;
  confidence: number;
}

interface ScanResults {
  unusedFiles: UnusedFile[];
  unusedExports: UnusedExport[];
  unusedImports: UnusedImport[];
  totalUnused: number;
  scanTime: number;
  projectPath: string;
}

interface ScanConfig {
  projectPath: string;
  threshold: number;
  gitSafe?: boolean;
  interactive?: boolean;
}

/**
 * Clean up unused files and exports
 */
export async function cleanupFiles(results: ScanResults, config: ScanConfig): Promise<void> {
  const { unusedFiles, unusedExports, unusedImports } = results;
  const { projectPath, threshold, gitSafe, interactive } = config;

  const filesAboveThreshold = unusedFiles.filter(file => file.confidence >= threshold);
  const exportsAboveThreshold = unusedExports.filter(exp => exp.confidence >= threshold);
  const importsAboveThreshold = unusedImports.filter(imp => imp.confidence >= threshold);

  if (filesAboveThreshold.length === 0 && exportsAboveThreshold.length === 0 && importsAboveThreshold.length === 0) {
    console.log(chalk.yellow('\nNo files, exports, or imports above confidence threshold to clean up.'));
    return;
  }

  if (gitSafe) {
    const gitStatus = await getGitStatus(projectPath);
    if (gitStatus.hasUncommittedChanges) {
      console.log(chalk.yellow('\n⚠️  You have uncommitted changes.'));
      const { proceed } = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'proceed',
          message: 'Proceed anyway?',
          default: false,
        },
      ]);
      if (!proceed) return;
    }
  }

  if (interactive) {
    const { confirmCleanup } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'confirmCleanup',
        message: 'Clean up these files, exports, and imports?',
        default: false,
      },
    ]);
    if (!confirmCleanup) return;
  }

  // Delete unused files
  if (filesAboveThreshold.length > 0) {
    console.log(chalk.cyan('\n🗑️  Removing unused files...'));
    for (const file of filesAboveThreshold) {
      const filePath = path.join(projectPath, file.path);
      try {
        await fs.unlink(filePath);
        console.log(chalk.green(`  ✓ Removed ${file.path}`));
      } catch (err: any) {
        console.log(chalk.red(`  ✗ Failed to remove ${file.path}: ${err.message}`));
      }
    }
  }

  // Remove unused exports and imports
  if (exportsAboveThreshold.length > 0 || importsAboveThreshold.length > 0) {
    console.log(chalk.cyan('\n✂️  Removing unused exports and imports...'));

    const groupedByFile: Record<string, { exports: UnusedExport[], imports: UnusedImport[] }> = {};
    
    // Group exports by file
    for (const exp of exportsAboveThreshold) {
      groupedByFile[exp.filePath] ??= { exports: [], imports: [] };
      groupedByFile[exp.filePath].exports.push(exp);
    }
    
    // Group imports by file
    for (const imp of importsAboveThreshold) {
      groupedByFile[imp.filePath] ??= { exports: [], imports: [] };
      groupedByFile[imp.filePath].imports.push(imp);
    }

    const project = new Project({ tsConfigFilePath: path.join(projectPath, 'tsconfig.json') });

    for (const [filePath, { exports, imports }] of Object.entries(groupedByFile)) {
      const sourceFile = project.getSourceFile(path.join(projectPath, filePath));
      if (!sourceFile) {
        console.log(chalk.red(`  ✗ Could not load ${filePath}`));
        continue;
      }

      // Remove unused exports
      for (const exp of exports) {
        const declarations = sourceFile.getExportedDeclarations().get(exp.name);
        if (!declarations || declarations.length === 0) {
          console.log(chalk.gray(`  - Export ${exp.name} not found in ${filePath}`));
          continue;
        }

        for (const decl of declarations) {
          if ('remove' in decl && typeof decl.remove === 'function') {
            console.log(chalk.yellow(`  🧽 Removing export: ${exp.name} from ${filePath}`));
            (decl as any).remove();
          } else {
            console.log(chalk.gray(`  - ${exp.name} cannot be removed (unsupported declaration)`));
          }
        }
      }

      // Remove unused imports
      for (const imp of imports) {
        const importDeclarations = sourceFile.getImportDeclarations();
        for (const importDecl of importDeclarations) {
          const namedImports = importDecl.getNamedImports();
          for (const namedImport of namedImports) {
            if (namedImport.getName() === imp.name) {
              console.log(chalk.yellow(`  🧽 Removing import: ${imp.name} from ${filePath}`));
              namedImport.remove();
            }
          }
        }
      }

      await sourceFile.save();
      console.log(chalk.green(`  ✓ Cleaned ${filePath}`));
    }
  }

  console.log(chalk.green('\n✨ Cleanup complete!'));
}
