#!/bin/bash
# Prepara sessões Claude Code na nuvem para verificar o recorte público.
# Instala o Node do projeto (24.11.1, usado na verificação da exportação)
# e as dependências declaradas no lockfile, sem scripts de instalação.
set -euo pipefail

if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  exit 0
fi

NODE_VERSION=24.11.1
export NVM_DIR="${NVM_DIR:-/opt/nvm}"
# shellcheck disable=SC1091
. "$NVM_DIR/nvm.sh"
nvm install "$NODE_VERSION" >/dev/null
nvm alias default "$NODE_VERSION" >/dev/null
NODE_BIN="$(dirname "$(nvm which "$NODE_VERSION")")"

if [ -n "${CLAUDE_ENV_FILE:-}" ]; then
  echo "export PATH=\"$NODE_BIN:\$PATH\"" >> "$CLAUDE_ENV_FILE"
fi
export PATH="$NODE_BIN:$PATH"

cd "$CLAUDE_PROJECT_DIR"
npm ci --ignore-scripts --no-audit --no-fund
