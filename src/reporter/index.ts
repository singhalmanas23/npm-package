import { promises as fs } from 'fs';
import path from 'path';
import { formatJsonReport } from './json-reporter';
import { formatMarkdownReport } from './markdown-reporter';

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
  totalUnused: number;
  scanTime: number;
  projectPath: string;
}

interface ScanConfig {
  threshold: number;
  dryRun?: boolean;
  clean?: boolean;
  excludePatterns: string[];
  onlyTypes: string[];
}

/**
 * Generate a report file for the scan results
 * @param results Scan results
 * @param reportFile Path to the report file
 * @param config Configuration options
 */
export async function generateReport(
  results: ScanResults,
  reportFile: string,
  config: ScanConfig
): Promise<void> {
  let content = '';

  if (reportFile.endsWith('.json')) {
    content = formatJsonReport(results, config);
  } else if (reportFile.endsWith('.md')) {
    content = await formatMarkdownReport(results, config);
  } else {
    // Default to markdown
    content = await formatMarkdownReport(results, config);
  }

  const dir = path.dirname(reportFile);
  await fs.mkdir(dir, { recursive: true });

  await fs.writeFile(reportFile, content, 'utf-8');
}
