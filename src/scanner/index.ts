import path from 'path';
import fs from 'fs/promises';
import glob from 'fast-glob';
import { scanCodeExports } from './code-scanner';
import { scanComponents } from './component-scanner';
import { scanImages } from './image-scanner';
import { scanStyles } from './style-scanner';
import { buildDependencyGraph } from './dependency-graph';
import { detectDeadCode, DependencyGraph as DeadCodeDependencyGraph } from './dead-code-detector';

export interface FinalResult {
  unusedFiles: Array<{
    path: string;
    type: string;
    confidence: number;
    size?: number;
  }>;
  unusedExports: Array<{
    name: string;
    filePath: string;
    confidence: number;
    type: string;
  }>;
  unusedImports: Array<{
    name: string;
    filePath: string;
    source: string;
    confidence: number;
    type: string;
  }>;
  totalUnused: number;
  scanTime: number;
  projectPath: string;
}

export interface Config {
  projectPath: string;
  onlyTypes: string[];
  excludePatterns: string[];
  threshold: number;
  interactive: boolean;
  gitSafe: boolean;
  verbose: boolean;
}

interface ScannerConfig {
  excludePatterns: string[];
}

/**
 * Scan a project for unused files and code
 * @param config Configuration options
 * @returns Scan results
 */
export async function scanProject(config: Config): Promise<FinalResult> {
  const startTime = Date.now();
  const result: FinalResult = {
    unusedFiles: [],
    unusedExports: [],
    unusedImports: [],
    totalUnused: 0,
    scanTime: startTime,
    projectPath: config.projectPath
  };

  // Ensure node_modules is always excluded
  const excludePatterns = config.excludePatterns.includes('node_modules/**')
    ? config.excludePatterns
    : [...config.excludePatterns, 'node_modules/**'];

  // Build dependency graph
  const dependencyGraph = await buildDependencyGraph(config.projectPath, { excludePatterns });

  // Scan based on requested types
  const types = config.onlyTypes.length > 0 ? config.onlyTypes : ['images', 'styles', 'components', 'exports'];
  const scannerConfig: ScannerConfig = {
    excludePatterns
  };

  if (types.includes('exports')) {
    const codeResults = await scanCodeExports(config.projectPath, dependencyGraph, scannerConfig);
    result.unusedFiles.push(...codeResults.unusedFiles);
    result.unusedExports.push(...codeResults.unusedExports);
    result.unusedImports.push(...codeResults.unusedImports);
  }

  if (types.includes('components')) {
    const componentResults = await scanComponents(config.projectPath, dependencyGraph, scannerConfig);
    result.unusedFiles.push(...componentResults.unusedFiles);
  }

  if (types.includes('images')) {
    const imageResults = await scanImages(config.projectPath, dependencyGraph, scannerConfig);
    result.unusedFiles.push(...imageResults.unusedFiles);
  }

  if (types.includes('styles')) {
    const styleResults = await scanStyles(config.projectPath, dependencyGraph, scannerConfig);
    result.unusedFiles.push(...styleResults.unusedFiles);
  }

  // Calculate total unused items
  result.totalUnused = result.unusedFiles.length + result.unusedExports.length + result.unusedImports.length;

  return result;
}
