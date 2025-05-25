import chalk from "chalk";
import ora from "ora";
import { scanProject, FinalResult } from "./scanner";
import { generateReport } from "./reporter";
import { cleanupFiles } from "./cleaner";
import { parseConfig } from "./utils/config";
import { displaySummary } from "./utils/summary";

type CLIOptions = {
  dryRun?: boolean;
  clean?: boolean;
  path?: string;
  exclude?: string;
  only?: string;
  report?: string;
  ignoreFile?: string;
  threshold?: string | number;
  verbose?: boolean;
  interactive?: boolean;
  gitSafe?: boolean;
  [key: string]: any;
};

type Config = {
  projectPath: string;
  onlyTypes: string[];
  excludePatterns: string[];
  threshold: number;
  interactive: boolean;
  gitSafe: boolean;
  verbose: boolean;
  [key: string]: any;
};

/**
 * Main function to run the cleanup process
 * @param options CLI options
 */
export async function runCleanup(options: CLIOptions): Promise<FinalResult> {
  // Parse configuration from CLI options and ignore file
  const config: Config = await parseConfig(options);

  // Initialize spinner
  const spinner = ora("Scanning project files...").start();

  try {
    spinner.text = "Analyzing project structure...";
    const results = await scanProject(config);

    spinner.succeed("Project analysis complete!");
    // Display results in the terminal
    displaySummary(results, {
      ...config,
      dryRun: false,
      clean: false
    });

    // Generate report if requested
    if (options.report) {
      await generateReport(results, options.report, {
        ...config,
        dryRun: options.dryRun,
        clean: options.clean,
      });
      console.log(chalk.green(`Report saved to ${options.report}`));
    }

    // Perform cleanup if requested
    if (options.clean && results.totalUnused > 0) {
      await cleanupFiles(results, config);
    } else if (options.dryRun && results.totalUnused > 0) {
      console.log(chalk.blue("\n🧪 Dry run complete. No files were modified."));
      console.log(
        chalk.blue(
          `Run with ${chalk.bold("--clean")} to remove unused files.\n`
        )
      );
    }

    return results;
  } catch (error: unknown) {
    spinner.fail("Error during project analysis");
    if (error instanceof Error) {
      throw error;
    }
    throw new Error("Unknown error during cleanup");
  }
}
