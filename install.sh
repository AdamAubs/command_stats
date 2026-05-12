#!/bin/bash
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
REPO="AdamAubs/command_stats"
BIN_DIR="${HOME}/.local/bin"
INSTALL_MARKER="command-stats-installed"

# Detect OS and architecture
detect_platform() {
  local uname_out=$(uname -s)
  local uname_arch=$(uname -m)
  
  case "$uname_out" in
    Darwin)
      case "$uname_arch" in
        arm64) echo "darwin-arm64" ;;
        x86_64) echo "darwin-x64" ;;
        *) echo ""; return 1 ;;
      esac
      ;;
    Linux)
      case "$uname_arch" in
        x86_64) echo "linux-x64" ;;
        aarch64) echo "linux-arm64" ;;
        *) echo ""; return 1 ;;
      esac
      ;;
    *)
      echo ""
      return 1
      ;;
  esac
}

# Download file with fallback methods
download_file() {
  local url=$1
  local output=$2
  
  if command -v curl &> /dev/null; then
    curl -fL -o "$output" "$url"
  elif command -v wget &> /dev/null; then
    wget -O "$output" "$url"
  else
    echo -e "${RED}Error: Neither curl nor wget found${NC}"
    return 1
  fi
}

# Get latest release tag
get_latest_version() {
  if command -v curl &> /dev/null; then
    curl -fL https://api.github.com/repos/$REPO/releases/latest 2>/dev/null | grep '"tag_name"' | head -1 | sed 's/.*"v\([^"]*\)".*/\1/'
  elif command -v wget &> /dev/null; then
    wget -qO- https://api.github.com/repos/$REPO/releases/latest 2>/dev/null | grep '"tag_name"' | head -1 | sed 's/.*"v\([^"]*\)".*/\1/'
  fi
}

# Ensure BIN_DIR is in PATH
ensure_bin_in_path() {
  # Detect shell rc file
  local shell_rc=""
  if [[ "$SHELL" == *"zsh"* ]]; then
    shell_rc="$HOME/.zshrc"
  elif [[ "$SHELL" == *"bash"* ]]; then
    shell_rc="$HOME/.bashrc"
  else
    return 0  # Can't detect shell, skip
  fi
  
  # Check if BIN_DIR is already in PATH line
  if ! grep -q "export PATH.*$BIN_DIR" "$shell_rc" 2>/dev/null; then
    echo -e "${YELLOW}Adding $BIN_DIR to PATH in $shell_rc${NC}"
    echo "export PATH=\"$BIN_DIR:\$PATH\"" >> "$shell_rc"
  fi
}

main() {
  echo -e "${YELLOW}Installing command-stats...${NC}"
  
  # Detect platform
  PLATFORM=$(detect_platform)
  if [ -z "$PLATFORM" ]; then
    echo -e "${RED}Error: Unsupported platform${NC}"
    exit 1
  fi
  echo -e "${GREEN}Detected platform: $PLATFORM${NC}"
  
  # Get latest version
  VERSION=$(get_latest_version)
  if [ -z "$VERSION" ]; then
    echo -e "${RED}Error: Could not fetch latest release${NC}"
    exit 1
  fi
  echo -e "${GREEN}Latest version: $VERSION${NC}"
  
  # Create bin directory if it doesn't exist
  mkdir -p "$BIN_DIR"
  
  # Download binary and checksum
  BINARY_NAME="command-stats-$PLATFORM"
  BINARY_URL="https://github.com/$REPO/releases/download/v$VERSION/$BINARY_NAME"
  CHECKSUM_URL="https://github.com/$REPO/releases/download/v$VERSION/$BINARY_NAME.sha256"
  
  TEMP_DIR=$(mktemp -d)
  trap "rm -rf $TEMP_DIR" EXIT
  
  echo "Downloading binary..."
  download_file "$BINARY_URL" "$TEMP_DIR/$BINARY_NAME"
  
  echo "Downloading checksum..."
  download_file "$CHECKSUM_URL" "$TEMP_DIR/$BINARY_NAME.sha256"
  
  # Verify checksum
  echo "Verifying checksum..."
  cd "$TEMP_DIR"
  if command -v sha256sum &> /dev/null; then
    sha256sum -c "$BINARY_NAME.sha256" || {
      echo -e "${RED}Checksum verification failed${NC}"
      exit 1
    }
  elif command -v shasum &> /dev/null; then
    shasum -a 256 -c "$BINARY_NAME.sha256" || {
      echo -e "${RED}Checksum verification failed${NC}"
      exit 1
    }
  else
    echo -e "${YELLOW}Warning: sha256sum/shasum not found, skipping checksum verification${NC}"
  fi
  
  # Install binary
  echo "Installing binary to $BIN_DIR..."
  mv "$BINARY_NAME" "$BIN_DIR/command-stats"
  chmod +x "$BIN_DIR/command-stats"
  
  # Ensure BIN_DIR is in PATH
  ensure_bin_in_path
  
  # Verify binary in PATH
  if ! command -v command-stats &> /dev/null; then
    if [[ ":$PATH:" == *":$BIN_DIR:"* ]]; then
      echo -e "${YELLOW}Warning: command-stats installed but not in PATH. Add $BIN_DIR to your PATH.${NC}"
    else
      echo -e "${YELLOW}Warning: $BIN_DIR is not in PATH. Add the following to your shell rc:${NC}"
      echo "export PATH=\"$BIN_DIR:\$PATH\""
    fi
  fi
  
  # Run shell setup
  echo -e "${YELLOW}Setting up shell hook...${NC}"
  if command -v bun &> /dev/null; then
    # If bun is available, use it to run the install script
    bun ./scripts/install.ts --yes 2>/dev/null || {
      echo -e "${YELLOW}Shell setup via install script failed. You can run it manually:${NC}"
      echo "bun ./scripts/install.ts --yes"
    }
  else
    echo -e "${YELLOW}Bun not found. Run shell setup manually:${NC}"
    echo "cd $(pwd) && bun ./scripts/install.ts --yes"
  fi
  
  echo -e "${GREEN}Installation complete!${NC}"
  echo "Run 'command-stats' to see today's command statistics."
}

main "$@"
