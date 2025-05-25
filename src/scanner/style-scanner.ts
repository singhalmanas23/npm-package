import path from 'path';
import fs from 'fs/promises';
import glob from 'fast-glob';

const STYLE_EXTENSIONS = ['.css', '.scss', '.sass', '.less', '.styl'];

type Config = {
  excludePatterns: string[];
  [key: string]: any;
};

type DependencyGraph = {
  isReferenced: (filePath: string) => boolean;
};

type FileResult = {
  path: string;
  type: string;
  confidence: number;
  size: number;
};

type ScanResult = {
  unusedFiles: FileResult[];
  type: 'styles';
};

export async function scanStyles(
  projectPath: string,
  dependencyGraph: DependencyGraph,
  config: Config
): Promise<ScanResult> {
  const result: ScanResult = {
    unusedFiles: [],
    type: 'styles'
  };

  const patterns = STYLE_EXTENSIONS.map(ext => `**/*${ext}`);
  const excludePatterns = config.excludePatterns.map(p => `!${p}`);

  const files = await glob([...patterns, ...excludePatterns], {
    cwd: projectPath,
    absolute: false,
    onlyFiles: true
  });

  for (const file of files) {
    const isUsed = await isStyleFileUsed(file, projectPath, dependencyGraph);
    if (!isUsed) {
      result.unusedFiles.push({
        path: file,
        type: 'styles',
        confidence: calculateConfidence(file),
        size: await getFileSize(path.join(projectPath, file))
      });
    }
  }

  return result;
}

async function isStyleFileUsed(
  filePath: string,
  projectPath: string,
  dependencyGraph: DependencyGraph
): Promise<boolean> {
  if (dependencyGraph.isReferenced(filePath)) {
    return true;
  }

  const filePatterns = ['**/*.{js,jsx,ts,tsx,html,vue,svelte}'];
  const excludePatterns = ['**/node_modules/**', '**/dist/**', '**/build/**'];

  const files = await glob([...filePatterns, ...excludePatterns.map(p => `!${p}`)], {
    cwd: projectPath,
    absolute: true,
    onlyFiles: true
  });

  const fileName = path.basename(filePath);
  const fileNameWithoutExt = path.basename(filePath, path.extname(filePath));
  const relativePath = filePath.replace(/\\/g, '/');

  for (const file of files) {
    const content = await fs.readFile(file, 'utf-8');

    if (
      content.includes(`import '${relativePath}'`) ||
      content.includes(`import "${relativePath}"`) ||
      content.includes(`import './${relativePath}'`) ||
      content.includes(`import "./${relativePath}"`) ||
      content.includes(`@import '${relativePath}'`) ||
      content.includes(`@import "${relativePath}"`) ||
      content.includes(`@import './${fileNameWithoutExt}'`) ||
      content.includes(`@import "${fileNameWithoutExt}"`) ||
      (content.includes('<link') && content.includes(fileName)) ||
      content.includes(`require('${relativePath}')`) ||
      content.includes(`require("./${relativePath}")`)
    ) {
      return true;
    }
  }

  if (
    fileName.includes('.module.css') ||
    fileName.includes('.module.scss') ||
    fileName.includes('.module.sass')
  ) {
    const moduleName = fileName.split('.')[0];
    for (const file of files) {
      const content = await fs.readFile(file, 'utf-8');
      if (
        content.includes(`import ${moduleName} from`) ||
        (content.includes('import styles from') && content.includes(fileName))
      ) {
        return true;
      }
    }
  }

  return false;
}

function calculateConfidence(filePath: string): number {
  let confidence = 80;
  const fileNameLower = filePath.toLowerCase();
  const fileName = path.basename(filePath);

  if (
    fileNameLower.includes('global') ||
    fileNameLower.includes('common') ||
    fileNameLower.includes('base') ||
    fileNameLower.includes('main') ||
    fileNameLower.includes('app') ||
    fileNameLower.includes('index') ||
    fileNameLower.includes('variables') ||
    fileNameLower.includes('mixins')
  ) {
    confidence -= 25;
  }

  if (
    fileNameLower.includes('/temp/') ||
    fileNameLower.includes('/old/') ||
    fileNameLower.includes('_old') ||
    fileNameLower.includes('-old') ||
    fileNameLower.includes('tmp')
  ) {
    confidence += 15;
  }

  if (
    fileName.includes('.module.css') ||
    fileName.includes('.module.scss') ||
    fileName.includes('.module.sass')
  ) {
    confidence += 10;
  }

  return Math.max(0, Math.min(100, confidence));
}

async function getFileSize(filePath: string): Promise<number> {
  try {
    const stats = await fs.stat(filePath);
    return stats.size;
  } catch {
    return 0;
  }
}
