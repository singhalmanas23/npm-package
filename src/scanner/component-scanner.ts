import path from 'path';
import fs from 'fs/promises';
import glob from 'fast-glob';

export interface ScanConfig {
  excludePatterns: string[];
}

export interface DependencyGraph {
  isReferenced: (filePath: string) => boolean;
}

export interface UnusedFile {
  path: string;
  type: string;
  confidence: number;
  size: number;
}

export interface ScanResult {
  unusedFiles: UnusedFile[];
  type: string;
}

const COMPONENT_PATTERNS: string[] = [
  '**/*.jsx',
  '**/components/**/*.js',
  '**/components/**/*.ts',
  '**/components/**/*.tsx',
  '**/*.vue',
  '**/*.svelte',
];

/**
 * Scan for unused component files
 */
export async function scanComponents(
  projectPath: string,
  dependencyGraph: DependencyGraph,
  config: ScanConfig
): Promise<ScanResult> {
  const result: ScanResult = {
    unusedFiles: [],
    type: 'components',
  };

  const excludePatterns = config.excludePatterns.map(p => `!${p}`);

  const files = await glob([...COMPONENT_PATTERNS, ...excludePatterns], {
    cwd: projectPath,
    absolute: false,
    onlyFiles: true,
  });

  for (const file of files) {
    const base = path.basename(file);
    if (['index.js', 'index.jsx', 'index.ts', 'index.tsx'].includes(base)) {
      continue;
    }

    const isUsed = dependencyGraph.isReferenced(file);

    if (!isUsed) {
      const fullPath = path.join(projectPath, file);
      result.unusedFiles.push({
        path: file,
        type: 'components',
        confidence: calculateConfidence(file, dependencyGraph),
        size: await getFileSize(fullPath),
      });
    }
  }

  return result;
}

/**
 * Calculate confidence that a component is unused
 */
function calculateConfidence(filePath: string, _dependencyGraph: DependencyGraph): number {
  let confidence = 85;
  const fileNameLower = path.basename(filePath).toLowerCase();
  const dirPath = path.dirname(filePath);

  if (
    fileNameLower.includes('button') ||
    fileNameLower.includes('layout') ||
    fileNameLower.includes('header') ||
    fileNameLower.includes('footer') ||
    fileNameLower.includes('nav') ||
    fileNameLower.includes('sidebar') ||
    fileNameLower.includes('modal') ||
    fileNameLower.includes('dialog') ||
    fileNameLower.includes('provider')
  ) {
    confidence -= 20;
  }

  if (
    dirPath.includes('/temp/') ||
    dirPath.includes('/old/') ||
    dirPath.includes('/deprecated/') ||
    fileNameLower.includes('test') ||
    fileNameLower.includes('_old') ||
    fileNameLower.includes('-old')
  ) {
    confidence += 10;
  }

  if (
    fileNameLower.includes('page') ||
    fileNameLower.includes('screen') ||
    fileNameLower.includes('view') ||
    dirPath.includes('/pages/') ||
    dirPath.includes('/views/') ||
    dirPath.includes('/screens/')
  ) {
    confidence -= 15;
  }

  return Math.max(0, Math.min(100, confidence));
}

/**
 * Get file size in bytes
 */
async function getFileSize(filePath: string): Promise<number> {
  try {
    const stats = await fs.stat(filePath);
    return stats.size;
  } catch {
    return 0;
  }
}
