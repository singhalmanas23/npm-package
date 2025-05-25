import path from 'path';
import fs from 'fs/promises';

export interface ScanConfig {
  excludePatterns: string[];
}

export interface DependencyNode {
  imports: Set<string>;
  importedBy: Set<string>;
}

export interface DependencyGraph {
  nodes: Map<string, DependencyNode>;
  getOrphans: () => string[];
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

/**
 * Detect dead code files in the project
 */
export async function detectDeadCode(
  projectPath: string,
  dependencyGraph: DependencyGraph,
  config: ScanConfig
): Promise<ScanResult> {
  const result: ScanResult = {
    unusedFiles: [],
    type: 'dead',
  };

  const entryPoints = findEntryPoints(dependencyGraph);

  const orphans = dependencyGraph
    .getOrphans()
    .filter(file => !entryPoints.includes(file));

  for (const file of orphans) {
    if (isLikelyLibraryFile(file)) continue;

    const base = path.basename(file);
    if (['index.js', 'index.jsx', 'index.ts', 'index.tsx'].includes(base)) continue;

    if (isDynamicallyImported(file)) continue;

    const fullPath = path.join(projectPath, file);

    result.unusedFiles.push({
      path: file,
      type: 'scripts',
      confidence: calculateDeadCodeConfidence(file, dependencyGraph),
      size: await getFileSize(fullPath),
    });
  }

  return result;
}

/**
 * Find entry points in the dependency graph
 */
function findEntryPoints(dependencyGraph: DependencyGraph): string[] {
  const entryPoints: string[] = [];

  for (const [filePath, node] of dependencyGraph.nodes.entries()) {
    if (node.importedBy.size === 0 && node.imports.size > 0) {
      entryPoints.push(filePath);
    }
  }

  return entryPoints;
}

/**
 * Check if a file is likely a library or utility file
 */
function isLikelyLibraryFile(filePath: string): boolean {
  const fileName = path.basename(filePath).toLowerCase();
  const dirPath = path.dirname(filePath).toLowerCase();

  return (
    dirPath.includes('/lib/') ||
    dirPath.includes('/utils/') ||
    dirPath.includes('/helpers/') ||
    dirPath.includes('/shared/') ||
    dirPath.includes('/common/') ||
    dirPath.includes('/constants/') ||
    dirPath.includes('/config/') ||
    fileName.includes('util') ||
    fileName.includes('helper') ||
    fileName.includes('config') ||
    fileName.includes('constant') ||
    fileName.includes('type')
  );
}

/**
 * Check if a file might be dynamically imported
 */
function isDynamicallyImported(filePath: string): boolean {
  const fileName = path.basename(filePath).toLowerCase();
  const dirPath = path.dirname(filePath).toLowerCase();

  return (
    dirPath.includes('/pages/') ||
    dirPath.includes('/views/') ||
    dirPath.includes('/screens/') ||
    dirPath.includes('/routes/') ||
    fileName.includes('page') ||
    fileName.includes('view') ||
    fileName.includes('screen') ||
    fileName.includes('route')
  );
}

/**
 * Calculate confidence that a file contains dead code
 */
function calculateDeadCodeConfidence(filePath: string, dependencyGraph: DependencyGraph): number {
  let confidence = 80;

  const fileNameLower = path.basename(filePath).toLowerCase();
  const dirPath = path.dirname(filePath).toLowerCase();

  if (
    fileNameLower.includes('app') ||
    fileNameLower.includes('main') ||
    fileNameLower.includes('index') ||
    fileNameLower.includes('entry') ||
    fileNameLower.includes('start')
  ) {
    confidence -= 30;
  }

  if (
    dirPath.includes('/temp/') ||
    dirPath.includes('/old/') ||
    dirPath.includes('/deprecated/') ||
    fileNameLower.includes('test') ||
    fileNameLower.includes('_old') ||
    fileNameLower.includes('-old')
  ) {
    confidence += 15;
  }

  const node = dependencyGraph.nodes.get(filePath);
  if (node && node.imports.size === 0) {
    confidence += 10;
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
