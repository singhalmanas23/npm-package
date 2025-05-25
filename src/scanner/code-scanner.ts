import path from 'path';
import fs from 'fs/promises';
import glob from 'fast-glob';
import recast from 'recast';
import parser from '@babel/parser';
import * as acorn from 'acorn';
import * as walk from 'acorn-walk';

interface ExportInfo {
  name: string;
  type: string;
}

interface ImportInfo {
  name: string;
  type: string;
  source: string;
}

interface UnusedExport {
  name: string;
  filePath: string;
  confidence: number;
  type: string;
}

interface UnusedImport {
  name: string;
  filePath: string;
  source: string;
  confidence: number;
  type: string;
}

interface UnusedFile {
  path: string;
  type: string;
  confidence: number;
  size: number;
}

interface ScanResult {
  unusedExports: UnusedExport[];
  unusedImports: UnusedImport[];
  unusedFiles: UnusedFile[];
}

interface DependencyGraph {
  isExportUsed: (file: string, exportName: string) => boolean;
  isReferenced: (file: string) => boolean;
}

interface Config {
  excludePatterns: string[];
}

/**
 * Scan for unused exports and imports in JS/TS files
 * @param {string} projectPath Path to the project
 * @param {Object} dependencyGraph Dependency graph
 * @param {Object} config Configuration options
 * @returns {Object} Scan results
 */
export async function scanCodeExports(
  projectPath: string,
  dependencyGraph: DependencyGraph,
  config: Config
): Promise<ScanResult> {
  const result: ScanResult = {
    unusedExports: [],
    unusedImports: [],
    unusedFiles: []
  };
  
  // Find all JS/TS files
  const patterns = ['**/*.js', '**/*.jsx', '**/*.ts', '**/*.tsx'];
  const excludePatterns = config.excludePatterns.map(p => `!${p}`);
  
  const files = await glob([...patterns, ...excludePatterns], {
    cwd: projectPath,
    absolute: false,
    onlyFiles: true
  });
  
  // Process each file
  for (const file of files) {
    try {
      const filePath = path.join(projectPath, file);
      const content = await fs.readFile(filePath, 'utf-8');
      
      // Skip empty files
      if (!content.trim()) {
        continue;
      }
      
      // Extract exports and imports from the file
      const { exports, imports } = extractExportsAndImports(content, file);
      
      // Check which exports are used
      const unusedExports = [];
      
      for (const exp of exports) {
        const isUsed = dependencyGraph.isExportUsed(file, exp.name);
        
        if (!isUsed) {
          unusedExports.push({
            name: exp.name,
            filePath: file,
            confidence: calculateExportConfidence(exp, file),
            type: exp.type
          });
        }
      }
      
      // Check which imports are used
      const unusedImports = [];
      
      for (const imp of imports) {
        const isUsed = isImportUsed(content, imp);
        
        if (!isUsed) {
          unusedImports.push({
            name: imp.name,
            filePath: file,
            source: imp.source,
            confidence: 90, // High confidence for unused imports
            type: imp.type
          });
        }
      }
      
      // Add to results
      if (unusedExports.length > 0) {
        result.unusedExports.push(...unusedExports);
      }
      
      if (unusedImports.length > 0) {
        result.unusedImports.push(...unusedImports);
      }
      
      // If all exports are unused, consider the file as unused
      if (exports.length > 0 && unusedExports.length === exports.length) {
        // Only mark as unused if it's not imported anywhere
        if (!dependencyGraph.isReferenced(file)) {
          result.unusedFiles.push({
            path: file,
            type: 'scripts',
            confidence: 90,
            size: await getFileSize(filePath)
          });
        }
      }
    } catch (error) {
      // Skip files that can't be parsed
      continue;
    }
  }
  
  return result;
}

/**
 * Extract exports and imports from a file
 * @param {string} content File content
 * @param {string} filePath Path to the file
 * @returns {Object} Object containing exports and imports
 */
function extractExportsAndImports(content: string, filePath: string): { exports: ExportInfo[], imports: ImportInfo[] } {
  const exports: ExportInfo[] = [];
  const imports: ImportInfo[] = [];
  const isTypeScript = filePath.endsWith('.ts') || filePath.endsWith('.tsx');
  
  try {
    // Try to parse with recast (for detailed AST)
    let ast;
    
    try {
      ast = recast.parse(content, {
        parser: {
          parse: (source: string) => parser.parse(source, {
            sourceType: 'module',
            plugins: isTypeScript ? ['typescript', 'jsx'] : ['jsx']
          })
        }
      });
      
      recast.visit(ast, {
        visitImportDeclaration(path) {
          const node = path.node as any;
          const source = node.source.value;
          
          // Handle default imports
          if (node.specifiers) {
            node.specifiers.forEach((specifier: any) => {
              if (specifier.type === 'ImportDefaultSpecifier' && specifier.local) {
                imports.push({
                  name: specifier.local.name,
                  type: 'default',
                  source
                });
              } else if (specifier.type === 'ImportSpecifier') {
                imports.push({
                  name: specifier.local.name,
                  type: 'named',
                  source
                });
              }
            });
          }
          
          this.traverse(path);
        },
        visitExportNamedDeclaration(path) {
          const node = path.node as any;
          // Handle named exports
          if (node.declaration) {
            if (node.declaration.type === 'FunctionDeclaration' && node.declaration.id && typeof node.declaration.id.name === 'string') {
              exports.push({
                name: node.declaration.id.name,
                type: 'function'
              });
            } else if (node.declaration.type === 'ClassDeclaration' && node.declaration.id && typeof node.declaration.id.name === 'string') {
              exports.push({
                name: node.declaration.id.name,
                type: 'class'
              });
            } else if (node.declaration.type === 'VariableDeclaration') {
              node.declaration.declarations.forEach((decl: any) => {
                if (decl.id && typeof decl.id.name === 'string') {
                  exports.push({
                    name: decl.id.name,
                    type: 'variable'
                  });
                }
              });
            }
          }
          // Handle export specifiers
          if (node.specifiers) {
            node.specifiers.forEach((specifier: any) => {
              if (specifier.exported && typeof specifier.exported.name === 'string') {
                exports.push({
                  name: specifier.exported.name,
                  type: 'specifier'
                });
              }
            });
          }
          this.traverse(path);
        },
        visitExportDefaultDeclaration(path) {
          const node = path.node as any;
          // Handle default exports
          if (node.declaration) {
            if (node.declaration.type === 'FunctionDeclaration' && node.declaration.id) {
              exports.push({
                name: 'default',
                type: 'function'
              });
            } else if (node.declaration.type === 'ClassDeclaration' && node.declaration.id) {
              exports.push({
                name: 'default',
                type: 'class'
              });
            }
          }
          this.traverse(path);
        }
      });
    } catch (error) {
      // Fallback to acorn for simpler parsing
      const ast = acorn.parse(content, {
        sourceType: 'module',
        ecmaVersion: 2020
      });
      
      walk.simple(ast, {
        ImportDeclaration(node: any) {
          const source = node.source.value;
          node.specifiers.forEach((specifier: any) => {
            if (specifier.type === 'ImportDefaultSpecifier') {
              imports.push({
                name: specifier.local.name,
                type: 'default',
                source
              });
            } else if (specifier.type === 'ImportSpecifier') {
              imports.push({
                name: specifier.local.name,
                type: 'named',
                source
              });
            }
          });
        },
        ExportNamedDeclaration(node: any) {
          if (node.declaration) {
            if (node.declaration.type === 'FunctionDeclaration' && node.declaration.id) {
              exports.push({
                name: node.declaration.id.name,
                type: 'function'
              });
            } else if (node.declaration.type === 'ClassDeclaration' && node.declaration.id) {
              exports.push({
                name: node.declaration.id.name,
                type: 'class'
              });
            }
          }
        },
        ExportDefaultDeclaration() {
          exports.push({
            name: 'default',
            type: 'default'
          });
        }
      });
    }
  } catch (error) {
    // Skip files that can't be parsed
  }
  
  return { exports, imports };
}

/**
 * Check if an import is used in the file
 * @param {string} content File content
 * @param {ImportInfo} imp Import information
 * @returns {boolean} Whether the import is used
 */
function isImportUsed(content: string, imp: ImportInfo): boolean {
  // Skip checking for default imports as they're often used implicitly
  if (imp.type === 'default') {
    return true;
  }
  
  // Look for the import name in the content, but exclude import statements
  const importName = imp.name;
  const lines = content.split('\n');
  
  for (const line of lines) {
    // Skip import statements
    if (line.includes('import ')) {
      continue;
    }
    
    // Look for the import name as a whole word
    // This regex matches:
    // - The import name as a whole word
    // - The import name followed by a dot (for method calls)
    // - The import name followed by JSX/TSX syntax
    const regex = new RegExp(`\\b${importName}\\b(?:\\s*\\.|\\s*<|\\s*\\()?`);
    if (regex.test(line)) {
      return true;
    }
  }
  
  return false;
}

/**
 * Calculate confidence score for an export
 * @param {ExportInfo} exp Export information
 * @param {string} filePath Path to the file
 * @returns {number} Confidence score (0-100)
 */
function calculateExportConfidence(exp: ExportInfo, filePath: string): number {
  // Base confidence on export type
  let confidence = 70;
  
  if (exp.type === 'function' || exp.type === 'class') {
    confidence = 90;
  } else if (exp.type === 'variable') {
    confidence = 80;
  }
  
  // Adjust confidence based on file type
  if (filePath.endsWith('.ts') || filePath.endsWith('.tsx')) {
    confidence += 5; // TypeScript files are more likely to have unused exports
  }
  
  return Math.min(confidence, 100);
}

/**
 * Get file size in bytes
 * @param {string} filePath Path to the file
 * @returns {Promise<number>} File size in bytes
 */
async function getFileSize(filePath: string): Promise<number> {
  const stats = await fs.stat(filePath);
  return stats.size;
}