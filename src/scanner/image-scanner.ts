import path from 'path';
import fs from 'fs/promises';
import glob from 'fast-glob';

type FileResult = {
  path: string;
  type: 'images' | 'media';
  confidence: number;
  size: number;
};

type ScanResult = {
  unusedFiles: FileResult[];
  type: 'images';
};

type DependencyGraph = {
  isReferenced: (filePath: string) => boolean;
};

type Config = {
  excludePatterns: string[];
};

const IMAGE_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp', '.ico', '.bmp'];
const MEDIA_EXTENSIONS = ['.mp4', '.webm', '.mp3', '.wav', '.ogg'];
const ALL_EXTENSIONS = [...IMAGE_EXTENSIONS, ...MEDIA_EXTENSIONS];

/**
 * Scan for unused image and media files
 * @param projectPath Path to the project
 * @param dependencyGraph Dependency graph
 * @param config Configuration options
 * @returns Scan results
 */
export async function scanImages(
  projectPath: string,
  dependencyGraph: DependencyGraph,
  config: Config
): Promise<ScanResult> {
  const result: ScanResult = {
    unusedFiles: [],
    type: 'images',
  };

  const patterns = ALL_EXTENSIONS.map(ext => `**/*${ext}`);
  const excludePatterns = config.excludePatterns.map(p => `!${p}`);

  const files = await glob([...patterns, ...excludePatterns], {
    cwd: projectPath,
    absolute: false,
    onlyFiles: true,
  });

  for (const file of files) {
    const isUsed = await isFileReferenced(file, projectPath, dependencyGraph);
    const fileType = path.extname(file).toLowerCase();
    const isImage = IMAGE_EXTENSIONS.includes(fileType);

    if (!isUsed) {
      result.unusedFiles.push({
        path: file,
        type: isImage ? 'images' : 'media',
        confidence: calculateConfidence(file),
        size: await getFileSize(path.join(projectPath, file)),
      });
    }
  }

  return result;
}

/**
 * Check if a file is referenced in the project
 */
async function isFileReferenced(
  filePath: string,
  projectPath: string,
  dependencyGraph: DependencyGraph
): Promise<boolean> {
  if (dependencyGraph.isReferenced(filePath)) {
    return true;
  }

  const filePatterns = ['**/*.{js,jsx,ts,tsx,css,scss,sass,less,html,md,mdx,vue,svelte}'];
  const excludePatterns = ['**/node_modules/**', '**/dist/**', '**/build/**'];

  const files = await glob([...filePatterns, ...excludePatterns.map(p => `!${p}`)], {
    cwd: projectPath,
    absolute: true,
    onlyFiles: true,
  });

  const fileName = path.basename(filePath);
  const fileNameWithoutExt = path.basename(filePath, path.extname(filePath));
  const relativePath = filePath.replace(/\\/g, '/');

  for (const file of files) {
    const content = await fs.readFile(file, 'utf-8');

    if (
      content.includes(fileName) ||
      content.includes(fileNameWithoutExt) ||
      content.includes(relativePath) ||
      content.includes(`/${relativePath}`) ||
      content.includes(`'${relativePath}'`) ||
      content.includes(`"${relativePath}"`)
    ) {
      return true;
    }
  }

  return false;
}

/**
 * Calculate confidence that a file is unused
 */
function calculateConfidence(filePath: string): number {
  let confidence = 85;
  const fileNameLower = filePath.toLowerCase();

  if (
    fileNameLower.includes('logo') ||
    fileNameLower.includes('icon') ||
    fileNameLower.includes('background') ||
    fileNameLower.includes('bg') ||
    fileNameLower.includes('banner')
  ) {
    confidence -= 15;
  }

  if (
    fileNameLower.includes('/temp/') ||
    fileNameLower.includes('/old/') ||
    fileNameLower.includes('_old') ||
    fileNameLower.includes('-old')
  ) {
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
