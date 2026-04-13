#!/bin/zsh

set -euo pipefail

script_dir=${0:A:h}
repo_root=${script_dir:h}
cd "$repo_root"

source "$script_dir/lib/blender-mcp-startup.zsh"

set -a
[ -f .env.local ] && source .env.local
set +a

read_keychain_secret() {
  security find-generic-password -s "$1" -w 2>/dev/null || true
}

deepseek_api_key="${DEEPSEEK_API_KEY:-}"
key_source="env:DEEPSEEK_API_KEY"

if [ -z "$deepseek_api_key" ]; then
  deepseek_api_key="$(read_keychain_secret DEEPSEEK_API_KEY)"
  key_source="keychain:DEEPSEEK_API_KEY"
fi

if [ -z "$deepseek_api_key" ]; then
  echo "Missing DEEPSEEK_API_KEY in env or keychain."
  exit 1
fi

export DEEPSEEK_API_KEY="$deepseek_api_key"
export DEEPSEEK_BASE_URL="${DEEPSEEK_BASE_URL:-https://api.deepseek.com}"
export DEEPSEEK_MODEL="${DEEPSEEK_MODEL:-deepseek-chat}"
export LLM_PROVIDER="${LLM_PROVIDER:-deepseek}"
export NEXT_PUBLIC_DEFAULT_LLM_PROVIDER="${NEXT_PUBLIC_DEFAULT_LLM_PROVIDER:-deepseek}"
export NEXT_PUBLIC_DEFAULT_LLM_BASE_URL="${NEXT_PUBLIC_DEFAULT_LLM_BASE_URL:-$DEEPSEEK_BASE_URL}"
export NEXT_PUBLIC_DEFAULT_LLM_MODEL="${NEXT_PUBLIC_DEFAULT_LLM_MODEL:-$DEEPSEEK_MODEL}"

export LLM_API_KEY="$DEEPSEEK_API_KEY"
export LLM_BASE_URL="$DEEPSEEK_BASE_URL"
export LLM_MODEL="$DEEPSEEK_MODEL"

unset OPENAI_API_KEY
unset OPENAI_BASE_URL
unset OPENAI_MODEL
unset OPENAI_CUSTOMIZATION_BASE_URL
unset OPENAI_CUSTOMIZATION_MODEL

export GENERATION_ADAPTER=blender-mcp
setup_blender_mcp_env

echo "Provider preset: DeepSeek (default local-dev)"
echo "Key source: $key_source"
echo "Base URL: $LLM_BASE_URL"
echo "Model: $LLM_MODEL"
echo "Frontend default LLM: $NEXT_PUBLIC_DEFAULT_LLM_PROVIDER / $NEXT_PUBLIC_DEFAULT_LLM_BASE_URL / $NEXT_PUBLIC_DEFAULT_LLM_MODEL"
echo "Blender MCP: $BLENDER_MCP_SERVER_URL (port $BLENDER_MCP_PORT)"

if [ "${PROMPTPET_START_DRY_RUN:-0}" = "1" ]; then
  exit 0
fi

trap 'kill 0' EXIT INT TERM

ensure_blender_mcp_server

npm run dev &
npm run worker:blender-mcp:poly-http &
wait
