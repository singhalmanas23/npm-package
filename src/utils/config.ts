import fs from 'fs/promises';
import path from 'path';

interface CLIOptions {
  path?: string;
  dryRun?: boolean;
  clean?: boolean;
  exclude?: string;
  only?: string;
  report?: string;
  threshold?: string | number;
  verbose?: boolean;
  interactive?: boolean;
  gitSafe?: boolean;
  ignoreFile?: string;
  [key: string]: any;
}

export interface Config {
  projectPath: string;
  dryRun: boolean;
  clean: boolean;
  excludePatterns: string[];
  onlyTypes: string[];
  reportFile?: string;
  threshold: number;
  verbose: boolean;
  interactive: boolean;
  gitSafe: boolean;
  ignoreFile?: string;
}

/**
 * Parse configuration from CLI options and ignore file
 * @param options CLI options
 * @returns Parsed configuration
 */
export async function parseConfig(options: CLIOptions): Promise<Config> {
  const config: Config = {
    projectPath: path.resolve(options.path || process.cwd()),
    dryRun: options.dryRun || false,
    clean: options.clean || false,
    excludePatterns: (options.exclude || '').split(','),
    onlyTypes: options.only ? options.only.split(',') : [],
    reportFile: options.report,
    threshold: parseInt(String(options.threshold || '70'), 10),
    verbose: options.verbose || false,
    interactive: options.interactive !== false,
    gitSafe: options.gitSafe || false,
    ignoreFile: options.ignoreFile
  };

  // Load ignore patterns from file if it exists
  try {
    const ignoreFilePath = path.join(config.projectPath, config.ignoreFile || '.cleanupignore');
    const fileExists = await fs.access(ignoreFilePath)
      .then(() => true)
      .catch(() => false);
    
    if (fileExists) {
      const ignoreContent = await fs.readFile(ignoreFilePath, 'utf-8');
      const ignorePatterns = ignoreContent
        .split('\n')
        .map(line => line.trim())
        .filter(line => line && !line.startsWith('#'));
      
      config.excludePatterns = [...config.excludePatterns, ...ignorePatterns];
    }
  } catch (error) {
    // Ignore error if file doesn't exist
  }

  return config;
}