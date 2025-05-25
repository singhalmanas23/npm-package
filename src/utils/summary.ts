import chalk from 'chalk';
import { FinalResult } from '../scanner';
import { Config } from './config';

type ChalkColor = 'green' | 'yellowBright' | 'yellow' | 'red' | 'blue' | 'cyan' | 'gray';

interface Category {
  title: string;
  items: Array<{
    path: string;
    confidence: number;
    display: string;
  }>;
}

interface Categories {
  [key: string]: Category;
}

/**
 * Display a summary of the scan results
 * @param results The scan results
 * @param config The configuration
 */
export function displaySummary(results: FinalResult, config: Config): void {
  const { unusedFiles, unusedExports, totalUnused } = results;
  
  console.log('\n' + chalk.bold('📊 Scan Results:'));
  console.log(chalk.gray('──────────────────────────────────────'));
  
  // Display unused files by category
  const categories: Categories = {
    images: { title: '🖼️  Images & Media', items: [] },
    styles: { title: '🎨 Style Files', items: [] },
    components: { title: '🧩 Components', items: [] },
    scripts: { title: '📜 Scripts', items: [] },
    other: { title: '📁 Other Files', items: [] }
  };
  
  // Categorize files
  unusedFiles.forEach(file => {
    const { path, confidence, type } = file;
    const category = categories[type] || categories.other;
    
    const confidenceColor = getConfidenceColor(confidence);
    const confidenceText = chalk[confidenceColor as ChalkColor](`${confidence}%`);
    
    category.items.push({
      path,
      confidence,
      display: `${chalk.yellow(path)} (${confidenceText})`
    });
  });
  
  // Display categorized files
  Object.values(categories).forEach(category => {
    if (category.items.length > 0) {
      console.log(`\n${chalk.bold(category.title)}:`);
      
      // Sort by confidence (highest first)
      category.items
        .sort((a, b) => b.confidence - a.confidence)
        .forEach(item => {
          console.log(`  ${item.confidence >= config.threshold ? chalk.green('✅') : chalk.gray('❔')} ${item.display}`);
        });
    }
  });
  
  // Display unused exports
  if (unusedExports.length > 0) {
    console.log(`\n${chalk.bold('📦 Unused Exports:')}`);
    unusedExports.forEach(exp => {
      const confidenceColor = getConfidenceColor(exp.confidence);
      const confidenceText = chalk[confidenceColor as ChalkColor](`${exp.confidence}%`);
      
      console.log(`  ${exp.confidence >= config.threshold ? chalk.green('✅') : chalk.gray('❔')} ${chalk.yellow(exp.filePath)} > ${chalk.cyan(exp.name)} (${confidenceText})`);
    });
  }
  
  // Display summary counts
  console.log('\n' + chalk.bold('📋 Summary:'));
  console.log(chalk.gray('──────────────────────────────────────'));
  
  const filesAboveThreshold = unusedFiles.filter(f => f.confidence >= config.threshold).length;
  const exportsAboveThreshold = unusedExports.filter(e => e.confidence >= config.threshold).length;
  
  console.log(`  ${chalk.cyan(filesAboveThreshold)} files can likely be removed`);
  console.log(`  ${chalk.cyan(exportsAboveThreshold)} unused exports detected`);
  console.log(`  ${chalk.cyan(totalUnused - filesAboveThreshold - exportsAboveThreshold)} items below confidence threshold (${config.threshold}%)`);
  
  if (totalUnused === 0) {
    console.log(`\n${chalk.green('✨ Your project is clean! No unused files or code detected.')}`);
  } else {
    console.log(`\n${chalk.blue('💡 Tip:')} Run with ${chalk.bold('--clean')} to remove items, or ${chalk.bold('--report report.md')} to save findings.`);
  }
  
  console.log(''); // Add an empty line for spacing
}

/**
 * Get color for confidence value
 * @param confidence The confidence percentage
 * @returns Color name for chalk
 */
function getConfidenceColor(confidence: number): ChalkColor {
  if (confidence >= 90) return 'green';
  if (confidence >= 70) return 'yellowBright';
  if (confidence >= 50) return 'yellow';
  return 'red';
}