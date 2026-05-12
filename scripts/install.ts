#!/usr/bin/env bun
import fs from "fs/promises";
import fsSync from "fs";
import os from "os";
import path from "path";
import readline from "readline";
import { spawnSync } from "child_process";

const args = process.argv.slice(2);
const yes = args.includes("--yes") || args.includes("-y");
const dryRun = args.includes("--dry-run") || args.includes("--dryrun");
const doUninstall = args.includes("--uninstall");
const doInstall =
  args.includes("--install") || (!doUninstall && !args.includes("--help"));

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

const rcFile =
  candidates.find((candidate) => fsSync.existsSync(candidate)) || candidates[0];
const stateHome =
  process.env.XDG_STATE_HOME || path.join(home, ".local", "state");
const configDir = path.join(stateHome, "command-stats");
const envFile = path.join(configDir, "env");
const logFile = path.join(configDir, "commands.log");
const sourceMarker = "command-stats: source hook file";
const sourceLine = `[ -f "${envFile}" ] && source "${envFile}" # ${sourceMarker}`;

const zshEnv = `# command-stats hook for zsh
preexec_functions+=(command_stats_preexec)
command_stats_preexec() {
  printf '%s | %s\\n' "$(date '+%Y-%m-%d %H:%M:%S')" "$1" >> "${logFile}"
}
`;

const bashEnv = `# command-stats hook for bash
__command_stats_log() {
  printf '%s | %s\\n' "$(date '+%Y-%m-%d %H:%M:%S')" "$BASH_COMMAND" >> "${logFile}"
}
PROMPT_COMMAND="__command_stats_log\${PROMPT_COMMAND:+;$PROMPT_COMMAND}"
`;

const envContent = rcFile.endsWith(".zshrc") ? zshEnv : bashEnv;

function runUninstall(): void {
  const uninstallArgs = ["./scripts/uninstall.ts"];
  if (yes) uninstallArgs.push("--yes");
  if (dryRun) uninstallArgs.push("--dry-run");

  const result = spawnSync("bun", uninstallArgs, {
    stdio: "inherit",
  });
  if (result.error) {
    console.error("Failed to run uninstall script:", result.error.message);
    process.exitCode = 1;
  }
}

async function performInstall(): Promise<void> {
  try {
    if (fsSync.existsSync(rcFile)) {
      const rcContent = await fs.readFile(rcFile, "utf8");
      if (rcContent.includes(sourceMarker)) {
        console.log(`command-stats hook already installed in ${rcFile}`);
        return;
      }
    } else {
      console.log(`${rcFile} does not exist; it will be created.`);
    }

    if (dryRun)
      console.log(`[dry-run] Would create config directory ${configDir}`);
    else await fs.mkdir(configDir, { recursive: true });

    if (dryRun) console.log(`[dry-run] Would write hook file ${envFile}`);
    else await fs.writeFile(envFile, envContent, "utf8");

    if (dryRun)
      console.log(`[dry-run] Would create log file ${logFile} if missing`);
    else if (!fsSync.existsSync(logFile))
      await fs.writeFile(logFile, "", "utf8");

    if (fsSync.existsSync(rcFile)) {
      try {
        if (dryRun)
          console.log(
            `[dry-run] Would back up rc file to ${rcFile}.command-stats.bak`,
          );
        else {
          await fs.copyFile(rcFile, rcFile + ".command-stats.bak");
          console.log(`Backup written to ${rcFile}.command-stats.bak`);
        }
      } catch (error: any) {
        console.warn(
          "Warning: could not write backup:",
          error?.message ?? error,
        );
      }
    }

    if (dryRun) console.log(`[dry-run] Would append source line to ${rcFile}`);
    else {
      await fs.appendFile(rcFile, "\n" + sourceLine + "\n");
      console.log(`Appended source line to ${rcFile}`);
      console.log(
        "Installation complete. Please restart your shell or source the rc file.",
      );
    }
  } catch (error: any) {
    console.error("Setup failed:", error?.message ?? error);
    process.exitCode = 1;
  }
}

async function main(): Promise<void> {
  try {
    if (doUninstall) {
      if (dryRun) {
        console.log("[dry-run] Would run uninstall routine");
        return;
      }
      runUninstall();
      return;
    }

    if (!doInstall) {
      console.log(
        "Usage: bun ./scripts/install.ts [--install] [--uninstall] [--yes|-y] [--dry-run]",
      );
      return;
    }

    if (yes || dryRun) {
      await performInstall();
      return;
    }

    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });
    rl.question(
      `Install command-stats preexec hook into ${rcFile}? (y/N) `,
      async (answer: string) => {
        rl.close();
        if (!/^y/i.test(answer)) {
          console.log("Aborted. No changes made.");
          return;
        }

        await performInstall();
      },
    );
  } catch (error: any) {
    console.error("Install failed:", error?.message ?? error);
    process.exitCode = 1;
  }
}

main();
