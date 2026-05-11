#!/usr/bin/env node
import fs from "fs/promises";
import fsSync from "fs";
import os from "os";
import path from "path";

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

async function main() {
  try {
    if (!fsSync.existsSync(rcFile)) {
      console.log(`${rcFile} does not exist; nothing to remove.`);
      return;
    }

    const content = await fs.readFile(rcFile, "utf8");
    const start = content.indexOf("# >>> command-stats start");
    const end = content.indexOf("# <<< command-stats end");
    if (start === -1 || end === -1) {
      console.log("No command-stats block found in", rcFile);
      return;
    }

    const before = content.slice(0, start);
    const after = content.slice(end + "# <<< command-stats end".length);
    const newContent = before.trimEnd() + "\n\n" + after.trimStart();

    // backup current
    try {
      await fs.copyFile(rcFile, rcFile + ".command-stats.uninstall.bak");
      console.log(`Backup written to ${rcFile}.command-stats.uninstall.bak`);
    } catch (e) {
      console.warn("Warning: could not write backup:", e.message);
    }

    await fs.writeFile(rcFile, newContent, "utf8");
    console.log("Removed command-stats block from", rcFile);
    console.log(
      "You may restore the original from the .uninstall.bak file if needed.",
    );
  } catch (err) {
    console.error("Uninstall failed:", err && err.message ? err.message : err);
    process.exitCode = 1;
  }
}

main();
