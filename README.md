# command_stats

Brief progress

- Built XDG-compliant installer and managed shell hook file
- Migrated storage to `~/.local/state/command-stats/`
- Added CI workflow to build platform binaries and upload release artifacts

What it installs

- A standalone `command-stats` binary (installed to `~/.local/bin` by the installer)
- A managed shell hook file under the XDG state directory that records commands

What it tracks

- Records shell commands to `~/.local/state/command-stats/commands.log`
- Shows today's most-used commands in a compact terminal UI

Install via curl (replace with your repo URL):

```bash
# Example: replace USER/REPO and vX.Y.Z with your values
curl -fsSL https://raw.githubusercontent.com/USER/REPO/vX.Y.Z/install.sh | bash
```

Notes:

- The installer downloads the appropriate binary for your platform, verifies a SHA256 checksum, installs to `~/.local/bin`, and runs the shell-setup step.
- If `~/.local/bin` is not in your `PATH`, the installer will tell you how to add it.

Screenshot

![command-stats screenshot](path/to/screenshot.png)

Local developer notes

- To build locally (requires Bun):

```bash
bun install
bun build --compile --target bun ./index.tsx --outfile command-stats-local
```

- To remove a local build:

```bash
rm -f ./command-stats-local ./command-stats-local.sha256
```

Replace the placeholder `USER/REPO` and tag `vX.Y.Z` with your GitHub repo and release tag before publishing.
