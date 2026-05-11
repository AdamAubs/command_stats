#!/usr/bin/env bun
import fs from 'fs/promises';
import fsSync from 'fs';
import os from 'os';
import path from 'path';
import readline from 'readline';

const home = os.homedir();
const shellPath = process.env.SHELL || '';
const shell = path.basename(shellPath);
const candidates = shell === 'zsh'
  ? [path.join(home, '.zshrc')]
  : shell === 'bash'
    ? [path.join(home, '.bashrc')]
    : [path.join(home, '.profile'), path.join(home, '.bashrc'), path.join(home, '.zshrc')];

const rcFile = candidates.find(p => fsSync.existsSync(p)) || candidates[0];

const zshSnippet = `# >>> command-stats start\npreexec() {\n  echo "$(date '+%Y-%m-%d %H:%M:%S') | $1" >> "$HOME/.command_stats.log"\n}\n# <<< command-stats end\n`;

const bashSnippet = `# >>> command-stats start\n__command_stats_log() {\n  printf '%s | %s\\n' "$(date '+%Y-%m-%d %H:%M:%S')" "$BASH_COMMAND" >> "$HOME/.command_stats.log"\n}\nPROMPT_COMMAND="__command_stats_log${PROMPT_COMMAND:+;$PROMPT_COMMAND}"\n# <<< command-stats end\n`;

const snippet = rcFile.endsWith('.zshrc') ? zshSnippet : bashSnippet;

async function main(): Promise<void> {
  try {
    let content = '';
    if (fsSync.existsSync(rcFile)) {
      content = await fs.readFile(rcFile, 'utf8');
      if (content.includes('# >>> command-stats start')) {
        console.log(`command-stats hook already installed in ${rcFile}`);
        return;
      }
    } else {
      console.log(`${rcFile} does not exist; it will be created.`);
    }

    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    rl.question(`Install command-stats preexec hook into ${rcFile}? (y/N) `, async (ans: string) => {
      rl.close();
      if (!/^y/i.test(ans)) {
        console.log('Aborted. No changes made.');
        return;
      }

      // backup
      try {
        if (fsSync.existsSync(rcFile)) {
          await fs.copyFile(rcFile, rcFile + '.command-stats.bak');
          console.log(`Backup written to ${rcFile}.command-stats.bak`);
        }
      } catch (e: any) {
        console.warn('Warning: could not write backup:', e?.message ?? e);
      }

      // append snippet
      try {
        await fs.appendFile(rcFile, '\n' + snippet);
        console.log(`Appended command-stats hook to ${rcFile}`);
        console.log('Installation complete. Please restart your shell or source the rc file.');
      } catch (e: any) {
        console.error('Failed to append snippet:', e?.message ?? e);
      }
    });
  } catch (err: any) {
    console.error('Install failed:', err?.message ?? err);
    process.exitCode = 1;
  }
}

main();
