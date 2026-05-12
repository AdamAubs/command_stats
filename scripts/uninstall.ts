#!/usr/bin/env bun
import fs from "fs/promises";
import fsSync from "fs";
import os from "os";
import path from "path";
import readline from "readline";

const args = process.argv.slice(2);
const yes = args.includes("--yes") || args.includes("-y");
const dryRun = args.includes("--dry-run") || args.includes("--dryrun");

const home = os.homedir();
const shellPath = process.env.SHELL || "";
const shell = path.basename(shellPath);
const candidates =
  shell === "zsh"
    ? [path.join(home, ".zshrc")]
    : shell === "bash"
      ? [path.join(home, ".bashrc")]
      : [
          path.join(home, ".profile"),
          path.join(home, ".bashrc"),
          path.join(home, ".zshrc"),
        ];

const rcFile = candidates.find((p) => fsSync.existsSync(p)) || candidates[0];
const stateHome =
  process.env.XDG_STATE_HOME || path.join(home, ".local", "state");
const configDir = path.join(stateHome, "command-stats");
const envFile = path.join(configDir, "env");
const sourceMarker = "command-stats: source hook file";

async function removeRcSourceLine(): Promise<void> {
  if (!fsSync.existsSync(rcFile)) {
    console.log(`${rcFile} does not exist; nothing to remove.`);
    return;
  }

  const content = await fs.readFile(rcFile, "utf8");
  if (!content.includes(sourceMarker)) {
    console.log("No command-stats source line found in", rcFile);
    return;
  }

  const lines = content.split("\n");
  const filtered = lines.filter((line) => !line.includes(sourceMarker));
  const newContent = filtered.join("\n").trimEnd() + "\n";

  if (dryRun) {
    console.log(
      `[dry-run] Would back up rc file to ${rcFile}.command-stats.uninstall.bak`,
    );
    console.log(`[dry-run] Would remove source line from ${rcFile}`);
    return;
  }

  try {
    await fs.copyFile(rcFile, rcFile + ".command-stats.uninstall.bak");
    console.log(`Backup written to ${rcFile}.command-stats.uninstall.bak`);
  } catch (error: any) {
    console.warn("Warning: could not write backup:", error?.message ?? error);
  }

  await fs.writeFile(rcFile, newContent, "utf8");
  console.log("Removed command-stats source line from", rcFile);
}

async function main(): Promise<void> {
  try {
    if (dryRun) {
      console.log(
        "[dry-run] Would inspect and remove command-stats source line and config directory",
      );
      await removeRcSourceLine();
      console.log(`[dry-run] Would remove config directory ${configDir}`);
      return;
    }

    await removeRcSourceLine();

    if (yes) {
      try {
        await fs.rm(configDir, { recursive: true, force: true });
        console.log(`Removed ${configDir}`);
      } catch (error: any) {
        console.warn(
          "Warning: could not remove config dir:",
          error?.message ?? error,
        );
      }
      return;
    }

    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });
    rl.question(
      `Remove command-stats config directory (${configDir})? (y/N) `,
      async (ans: string) => {
        rl.close();
        if (/^y/i.test(ans)) {
          try {
            await fs.rm(configDir, { recursive: true, force: true });
            console.log(`Removed ${configDir}`);
          } catch (e: any) {
            console.warn(
              "Warning: could not remove config dir:",
              e?.message ?? e,
            );
          }
        }
        console.log(
          "You may restore your rc file from the .uninstall.bak file if needed.",
        );
      },
    );
  } catch (err: any) {
    console.error("Uninstall failed:", err?.message ?? err);
    process.exitCode = 1;
  }
}

main();
