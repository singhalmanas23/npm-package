import type { FinalResult } from '../scanner';
import type { Config } from '../utils/config';

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
  excludePatterns: string[];
  onlyTypes: string[];
}

/**
 * Format scan results as a Markdown report
 * @param results Scan results
 * @param config Configuration options
 * @returns Formatted Markdown report
 */
export async function formatMarkdownReport(results: ScanResults, config: ScanConfig): Promise<string> {
  const { markdownTable } = await import('markdown-table');
  const { unusedFiles, unusedExports, totalUnused, scanTime, projectPath } = results;

  const filesAboveThreshold = unusedFiles.filter(file => file.confidence >= config.threshold);
  const exportsAboveThreshold = unusedExports.filter(exp => exp.confidence >= config.threshold);

  const totalSize = formatSize(filesAboveThreshold.reduce((sum, file) => sum + (file.size || 0), 0));

  const filesByType: Record<string, UnusedFile[]> = {};
  for (const file of filesAboveThreshold) {
    const { type } = file;
    if (!filesByType[type]) {
      filesByType[type] = [];
    }
    filesByType[type].push(file);
  }

  let report = `# Project Cleanup Report\n\n`;

  report += `## Summary\n\n`;
  report += `- **Project Path**: \`${projectPath}\`\n`;
  report += `- **Scan Date**: ${new Date(scanTime).toLocaleString()}\n`;
  report += `- **Total Unused Items**: ${totalUnused}\n`;
  report += `- **Files That Can Be Removed**: ${filesAboveThreshold.length}\n`;
  report += `- **Unused Exports**: ${exportsAboveThreshold.length}\n`;
  report += `- **Total Size That Can Be Reclaimed**: ${totalSize}\n\n`;

  if (filesAboveThreshold.length > 0) {
    report += `## Unused Files\n\n`;

    for (const [type, files] of Object.entries(filesByType)) {
      report += `### ${formatFileType(type)} (${files.length})\n\n`;

      const tableData = [
        ['File Path', 'Size', 'Confidence'],
        ...files
          .sort((a, b) => b.confidence - a.confidence)
          .map(file => [
            `\`${file.path}\``,
            formatSize(file.size || 0),
            `${file.confidence}%`,
          ]),
      ];

      report += markdownTable(tableData) + '\n\n';
    }
  }

  if (exportsAboveThreshold.length > 0) {
    report += `## Unused Exports\n\n`;

    const tableData = [
      ['File', 'Export', 'Type', 'Confidence'],
      ...exportsAboveThreshold
        .sort((a, b) => b.confidence - a.confidence)
        .map(exp => [
          `\`${exp.filePath}\``,
          `\`${exp.name}\``,
          exp.type || '-',
          `${exp.confidence}%`,
        ]),
    ];

    report += markdownTable(tableData) + '\n\n';
  }

  report += `## Scan Configuration\n\n`;
  report += `- **Confidence Threshold**: ${config.threshold}%\n`;
  report += `- **Excluded Patterns**: ${config.excludePatterns.join(', ') || 'None'}\n`;
  report += `- **Scan Types**: ${config.onlyTypes.length ? config.onlyTypes.join(', ') : 'All'}\n\n`;

  report += `## How to Use This Report\n\n`;
  report += `1. Review the files and exports listed above\n`;
  report += `2. Verify that they are indeed unused before deletion\n`;
  report += `3. To remove these files, run:\n\n`;
  report += '```bash\nproject-cleanup --clean\n```\n\n';
  report += `4. Or to clean specific types:\n\n`;
  report += '```bash\nproject-cleanup --clean --only "images,styles"\n```\n\n';
  report += '> **Note**: Always commit your changes before cleaning, or use `--git-safe` to only suggest files that are committed.\n';

  return report;
}

function formatSize(size: number): string {
  if (size < 1024) {
    return `${size} B`;
  } else if (size < 1024 * 1024) {
    return `${(size / 1024).toFixed(1)} KB`;
  } else {
    return `${(size / (1024 * 1024)).toFixed(1)} MB`;
  }
}

function formatFileType(type: string): string {
  const typeMap: Record<string, string> = {
    images: 'Images & Media',
    styles: 'Style Files',
    components: 'Components',
    scripts: 'Scripts & Code',
    media: 'Media Files',
    other: 'Other Files',
  };

  return typeMap[type] || type.charAt(0).toUpperCase() + type.slice(1);
}
