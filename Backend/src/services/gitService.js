// src/services/gitService.js
// Safe Git integration service to extract daily commits for an employee or active repository.

import { exec } from "child_process";
import { promisify } from "util";
import path from "path";

const execAsync = promisify(exec);

/**
 * Fetches commits from git log for a specific date window.
 *
 * @param {Object} params
 * @param {string|Date} params.date - Target date (e.g. '2026-08-14' or Date)
 * @param {string} [params.author] - Optional author filter (email or name)
 * @param {number} [params.limit=25] - Max commits to return
 * @returns {Promise<Array>} List of parsed commits
 */
export async function getGitCommitsForDate({ date, author, limit = 25 }) {
  try {
    const targetDate = new Date(date || Date.now());
    if (isNaN(targetDate.getTime())) {
      throw new Error("Invalid date provided for git commit query");
    }

    const yyyy = targetDate.getFullYear();
    const mm = String(targetDate.getMonth() + 1).padStart(2, '0');
    const dd = String(targetDate.getDate()).padStart(2, '0');

    const sinceDate = `${yyyy}-${mm}-${dd} 00:00:00`;
    const untilDate = `${yyyy}-${mm}-${dd} 23:59:59`;

    // Root repo directory
    const repoRoot = path.resolve(process.cwd(), "..");

    // Safe formatting with custom delimiters: %H (hash), %an (author), %ae (email), %ad (date), %s (subject)
    const delimiter = "|||---|||";
    let cmd = `git log --since="${sinceDate}" --until="${untilDate}" --pretty=format:"%h${delimiter}%an${delimiter}%ae${delimiter}%ad${delimiter}%s" --date=format:"%I:%M %p" -n ${limit}`;

    if (author && typeof author === 'string' && author.trim()) {
      // Escape author string safely
      const cleanAuthor = author.replace(/["\\]/g, '');
      cmd += ` --author="${cleanAuthor}"`;
    }

    const { stdout } = await execAsync(cmd, { cwd: repoRoot, timeout: 5000 });

    if (!stdout || !stdout.trim()) {
      // Fallback: If no commits strictly matched author on that date, fetch the most recent 10 commits to allow manual selection
      const fallbackCmd = `git log -n 10 --pretty=format:"%h${delimiter}%an${delimiter}%ae${delimiter}%ad${delimiter}%s" --date=format:"%I:%M %p"`;
      const fallback = await execAsync(fallbackCmd, { cwd: repoRoot, timeout: 5000 }).catch(() => ({ stdout: '' }));
      
      return parseGitLogOutput(fallback.stdout, delimiter);
    }

    return parseGitLogOutput(stdout, delimiter);
  } catch (error) {
    console.warn("Git log scan notice:", error.message);
    return [];
  }
}

function parseGitLogOutput(stdout, delimiter) {
  if (!stdout || !stdout.trim()) return [];

  const lines = stdout.trim().split('\n');
  const commits = [];

  for (const line of lines) {
    if (!line.includes(delimiter)) continue;
    const parts = line.split(delimiter);
    if (parts.length >= 5) {
      const [hash, authorName, authorEmail, time, message] = parts;
      commits.push({
        hash: hash.trim(),
        authorName: authorName.trim(),
        authorEmail: authorEmail.trim(),
        time: time.trim(),
        message: message.trim(),
        imported: false
      });
    }
  }

  return commits;
}

export default {
  getGitCommitsForDate
};
