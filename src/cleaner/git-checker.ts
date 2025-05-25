import { promisify } from 'util';
import { exec as execCb } from 'child_process';
const exec = promisify(execCb);

export interface GitStatus {
  isGitRepo: boolean;
  hasUncommittedChanges: boolean;
  uncommittedFiles: string[];
}

/**
 * Check the Git status of the project
 * @param projectPath Path to the project
 * @returns Git status information
 */
export async function getGitStatus(projectPath: string): Promise<GitStatus> {
  const status: GitStatus = {
    isGitRepo: false,
    hasUncommittedChanges: false,
    uncommittedFiles: [],
  };

  try {
    // Check if this is a git repository
    await exec('git rev-parse --is-inside-work-tree', { cwd: projectPath });
    status.isGitRepo = true;

    // Check for uncommitted changes
    const { stdout } = await exec('git status --porcelain', { cwd: projectPath });

    if (stdout.trim()) {
      status.hasUncommittedChanges = true;
      status.uncommittedFiles = stdout
        .split('\n')
        .filter(line => line.trim())
        .map(line => line.slice(3)); // Remove status code and space
    }
  } catch (error) {
    // Not a git repository or git not installed
    status.isGitRepo = false;
  }

  return status;
}
