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

llm_api_key="${LLM_API_KEY:-${OPENAI_COMPAT_API_KEY:-${OPENAI_API_KEY:-}}}"
deepseek_api_key="${DEEPSEEK_API_KEY:-}"

if [ -n "${LLM_API_KEY:-}" ]; then
  key_source="env:LLM_API_KEY"
elif [ -n "${OPENAI_COMPAT_API_KEY:-}" ]; then
  key_source="env:OPENAI_COMPAT_API_KEY"
elif [ -n "${OPENAI_API_KEY:-}" ]; then
  key_source="env:OPENAI_API_KEY"
else
  key_source="unset"
fi

if [ -z "$llm_api_key" ]; then
  llm_api_key="$(read_keychain_secret LLM_API_KEY)"
  key_source="keychain:LLM_API_KEY"
fi

if [ -z "$llm_api_key" ]; then
  llm_api_key="$(read_keychain_secret OPENAI_COMPAT_API_KEY)"
  key_source="keychain:OPENAI_COMPAT_API_KEY"
fi

if [ -z "$llm_api_key" ]; then
  llm_api_key="$(read_keychain_secret OPENAI_API_KEY)"
  key_source="keychain:OPENAI_API_KEY"
fi

if [ -z "$deepseek_api_key" ]; then
  deepseek_api_key="$(read_keychain_secret DEEPSEEK_API_KEY)"
fi

if [ -z "$llm_api_key" ]; then
  echo "Missing LLM_API_KEY, OPENAI_COMPAT_API_KEY, or OPENAI_API_KEY in env or keychain."
  exit 1
fi

export LLM_PROVIDER="${LLM_PROVIDER:-openai}"
export LLM_API_KEY="$llm_api_key"
export LLM_BASE_URL="${LLM_BASE_URL:-https://api.xcode.best/v1}"
export LLM_MODEL="${LLM_MODEL:-gpt-5.4}"
export NEXT_PUBLIC_DEFAULT_LLM_PROVIDER="${NEXT_PUBLIC_DEFAULT_LLM_PROVIDER:-openai}"
export NEXT_PUBLIC_DEFAULT_LLM_BASE_URL="${NEXT_PUBLIC_DEFAULT_LLM_BASE_URL:-$LLM_BASE_URL}"
export NEXT_PUBLIC_DEFAULT_LLM_MODEL="${NEXT_PUBLIC_DEFAULT_LLM_MODEL:-$LLM_MODEL}"

export OPENAI_COMPAT_API_KEY="$llm_api_key"
export OPENAI_COMPAT_BASE_URL="${OPENAI_COMPAT_BASE_URL:-$LLM_BASE_URL}"
export OPENAI_COMPAT_MODEL="${OPENAI_COMPAT_MODEL:-$LLM_MODEL}"
export OPENAI_API_KEY="$llm_api_key"
export OPENAI_BASE_URL="${OPENAI_BASE_URL:-$LLM_BASE_URL}"
export OPENAI_MODEL="${OPENAI_MODEL:-$LLM_MODEL}"
export OPENAI_CUSTOMIZATION_BASE_URL="${OPENAI_CUSTOMIZATION_BASE_URL:-$OPENAI_BASE_URL}"
export OPENAI_CUSTOMIZATION_MODEL="${OPENAI_CUSTOMIZATION_MODEL:-$OPENAI_MODEL}"

unset SEMANTIC_PROVIDER
unset SEMANTIC_API_KEY
unset SEMANTIC_BASE_URL
unset SEMANTIC_MODEL
unset DESIGN_PROVIDER
unset DESIGN_API_KEY
unset DESIGN_BASE_URL
unset DESIGN_MODEL

parser_planner_override_label="disabled"

if [ -n "$deepseek_api_key" ]; then
  export DEEPSEEK_API_KEY="$deepseek_api_key"
  export DEEPSEEK_BASE_URL="${DEEPSEEK_BASE_URL:-https://api.deepseek.com}"
  export DEEPSEEK_MODEL="${DEEPSEEK_MODEL:-deepseek-chat}"
  export SEMANTIC_PROVIDER="${SEMANTIC_PROVIDER:-deepseek}"
  export SEMANTIC_API_KEY="${SEMANTIC_API_KEY:-$DEEPSEEK_API_KEY}"
  export SEMANTIC_BASE_URL="${SEMANTIC_BASE_URL:-$DEEPSEEK_BASE_URL}"
  export SEMANTIC_MODEL="${SEMANTIC_MODEL:-$DEEPSEEK_MODEL}"
  export DESIGN_PROVIDER="${DESIGN_PROVIDER:-deepseek}"
  export DESIGN_API_KEY="${DESIGN_API_KEY:-$DEEPSEEK_API_KEY}"
  export DESIGN_BASE_URL="${DESIGN_BASE_URL:-$DEEPSEEK_BASE_URL}"
  export DESIGN_MODEL="${DESIGN_MODEL:-$DEEPSEEK_MODEL}"
  parser_planner_override_label="${SEMANTIC_PROVIDER}/${SEMANTIC_MODEL} + ${DESIGN_PROVIDER}/${DESIGN_MODEL}"
else
  unset DEEPSEEK_API_KEY
  unset DEEPSEEK_BASE_URL
  unset DEEPSEEK_MODEL
fi

export GENERATION_ADAPTER=blender-mcp
setup_blender_mcp_env

echo "Provider preset: OpenAI-compatible (manual fallback)"
echo "Key source: $key_source"
echo "Base URL: $LLM_BASE_URL"
echo "Model: $LLM_MODEL"
echo "Parser/Planner override: $parser_planner_override_label"
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
