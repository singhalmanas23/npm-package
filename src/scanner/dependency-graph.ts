import path from 'path';
import fs from 'fs/promises';
import glob from 'fast-glob';

interface DependencyNode {
  imports: Set<string>;
  importedBy: Set<string>;
  exports: Set<string>;
}

interface DependencyGraph {
  nodes: Map<string, DependencyNode>;
  imports: Map<string, Set<string>>;
  exports: Map<string, Set<string>>;
  addNode(filePath: string): DependencyNode;
  addImport(importerPath: string, importedPath: string): void;
  addExport(filePath: string, exportName: string): void;
  isReferenced(filePath: string): boolean;
  isExportUsed(filePath: string, exportName: string): boolean;
  getOrphans(): string[];
}

interface Config {
  excludePatterns: string[];
}

export async function buildDependencyGraph(projectPath: string, config: Config): Promise<DependencyGraph> {
  const graph: DependencyGraph = {
    nodes: new Map(),
    imports: new Map(),
    exports: new Map(),

    addNode(filePath) {
      if (!this.nodes.has(filePath)) {
        this.nodes.set(filePath, {
          imports: new Set(),
          importedBy: new Set(),
          exports: new Set()
        });
      }
      return this.nodes.get(filePath)!;
    },

    addImport(importerPath, importedPath) {
      const importer = this.addNode(importerPath);
      const imported = this.addNode(importedPath);

      importer.imports.add(importedPath);
      imported.importedBy.add(importerPath);

      if (!this.imports.has(importedPath)) {
        this.imports.set(importedPath, new Set());
      }
      this.imports.get(importedPath)!.add(importerPath);
    },

    addExport(filePath, exportName) {
      const node = this.addNode(filePath);
      node.exports.add(exportName);

      if (!this.exports.has(filePath)) {
        this.exports.set(filePath, new Set());
      }
      this.exports.get(filePath)!.add(exportName);
    },

    isReferenced(filePath) {
      const node = this.nodes.get(filePath);
      return !!node && node.importedBy.size > 0;
    },

    isExportUsed(filePath, exportName) {
      if (exportName === 'default') return true;
      
      // Check if any file imports this specific export
      const importers = this.imports.get(filePath);
      if (!importers || importers.size === 0) return false;
      
      // For now, we'll consider an export used if the file is imported
      // In a more complete implementation, we would check if the specific export is imported
      return true;
    },

    getOrphans() {
      const orphans: string[] = [];
      for (const [filePath, node] of this.nodes.entries()) {
        if (node.importedBy.size === 0) {
          orphans.push(filePath);
        }
      }
      return orphans;
    }
  };

  const patterns = ['**/*.{js,jsx,ts,tsx}'];
  const excludePatterns = config.excludePatterns.map(p => `!${p}`);
  const files = await glob([...patterns, ...excludePatterns], {
    cwd: projectPath,
    absolute: false,
    onlyFiles: true
  });

  for (const file of files) {
    try {
      const filePath = path.join(projectPath, file);
      const content = await fs.readFile(filePath, 'utf-8');

      graph.addNode(file);

      const imports = extractImports(content);
      for (const importPath of imports) {
        if (importPath.startsWith('.')) {
          const resolvedPath = resolveImportPath(file, importPath);
          if (resolvedPath) {
            graph.addImport(file, resolvedPath);
          }
        }
      }

      const exports = extractExports(content);
      for (const exportName of exports) {
        graph.addExport(file, exportName);
      }
    } catch (_) {
      continue;
    }
  }

  return graph;
}

function extractImports(content: string): string[] {
  const imports: string[] = [];
  const es6ImportRegex = /import\s+(?:.+\s+from\s+)?['"]([^'"]+)['"]/g;
  const requireRegex = /require\(['"]([^'"]+)['"]\)/g;
  const dynamicImportRegex = /import\(['"]([^'"]+)['"]\)/g;

  let match: RegExpExecArray | null;
  while ((match = es6ImportRegex.exec(content)) !== null) {
    imports.push(match[1]);
  }
  while ((match = requireRegex.exec(content)) !== null) {
    imports.push(match[1]);
  }
  while ((match = dynamicImportRegex.exec(content)) !== null) {
    imports.push(match[1]);
  }

  return imports;
}

function extractExports(content: string): string[] {
  const exports: string[] = [];
  const namedExportRegex = /export\s+(?:const|let|var|function|class)\s+([a-zA-Z0-9_$]+)/g;
  const exportListRegex = /export\s+{([^}]+)}/g;

  let match: RegExpExecArray | null;
  while ((match = namedExportRegex.exec(content)) !== null) {
    exports.push(match[1]);
  }
  if (/export\s+default/.test(content)) {
    exports.push('default');
  }
  while ((match = exportListRegex.exec(content)) !== null) {
    const exportList = match[1].split(',');
    for (const exp of exportList) {
      const trimmed = exp.trim();
      const renamed = trimmed.split(' as ');
      exports.push(renamed.length > 1 ? renamed[1].trim() : trimmed);
    }
  }

  return exports;
}

function resolveImportPath(importerPath: string, importPath: string): string | null {
  if (importPath.endsWith('/')) {
    importPath += 'index';
  }
  const importPathWithoutExt = importPath.replace(/\.(js|jsx|ts|tsx)$/, '');
  const importerDir = path.dirname(importerPath);
  const rawResolved = path.join(importerDir, importPathWithoutExt);
  const resolvedPath = rawResolved.replace(/\\/g, '/');

  const extensions = ['.js', '.jsx', '.ts', '.tsx'];
  for (const ext of extensions) {
    return resolvedPath + ext;
  }
  for (const ext of extensions) {
    return resolvedPath + '/index' + ext;
  }
  return resolvedPath;
}