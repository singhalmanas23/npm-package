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
 * Format scan results as a JSON report
 * @param results Scan results
 * @param config Configuration options
 * @returns Formatted JSON report string
 */
export function formatJsonReport(results: ScanResults, config: ScanConfig): string {
  const { unusedFiles, unusedExports, totalUnused, scanTime, projectPath } = results;

  // Group files by type
  const filesByType = unusedFiles.reduce<Record<string, UnusedFile[]>>((acc, file) => {
    const { type } = file;
    if (!acc[type]) {
      acc[type] = [];
    }
    acc[type].push(file);
    return acc;
  }, {});

  // Filter by confidence threshold
  const filesAboveThreshold = unusedFiles.filter(file => file.confidence >= config.threshold);
  const exportsAboveThreshold = unusedExports.filter(exp => exp.confidence >= config.threshold);

  // Calculate size statistics
  const totalSize = filesAboveThreshold.reduce((sum, file) => sum + (file.size || 0), 0);
  const sizeByType = Object.entries(filesByType).reduce<Record<string, number>>((acc, [type, files]) => {
    acc[type] = files
      .filter(file => file.confidence >= config.threshold)
      .reduce((sum, file) => sum + (file.size || 0), 0);
    return acc;
  }, {});

  const report = {
    summary: {
      projectPath,
      scanTime: new Date(scanTime).toISOString(),
      totalUnused,
      filesAboveThreshold: filesAboveThreshold.length,
      exportsAboveThreshold: exportsAboveThreshold.length,
      totalSize,
      sizeByType
    },
    files: filesAboveThreshold.map(file => ({
      path: file.path,
      type: file.type,
      confidence: file.confidence,
      size: file.size || 0
    })),
    exports: exportsAboveThreshold.map(exp => ({
      name: exp.name,
      filePath: exp.filePath,
      type: exp.type,
      confidence: exp.confidence
    })),
    config: {
      threshold: config.threshold,
      dryRun: config.dryRun ?? false,
      clean: config.clean ?? false,
      excludePatterns: config.excludePatterns,
      onlyTypes: config.onlyTypes
    }
  };

  return JSON.stringify(report, null, 2);
}
