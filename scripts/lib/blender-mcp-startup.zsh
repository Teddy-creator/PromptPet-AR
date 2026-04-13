#!/bin/zsh

normalize_blender_mcp_url() {
  local url="$1"
  echo "${url%/}"
}

extract_blender_mcp_port() {
  local url
  url="$(normalize_blender_mcp_url "$1")"

  if [[ "$url" =~ '^https?://[^/:]+:([0-9]+)(/.*)?$' ]]; then
    echo "$match[1]"
    return 0
  fi

  return 1
}

is_port_listening() {
  local port="$1"
  lsof -nP -iTCP:"$port" -sTCP:LISTEN >/dev/null 2>&1
}

is_blender_mcp_server() {
  local url
  url="$(normalize_blender_mcp_url "$1")"

  local response
  response="$(curl -fsS "$url/mcp/list_tools" 2>/dev/null)" || return 1

  RESPONSE_JSON="$response" python3 - <<'PY'
import json
import os
import sys

required = {
    "import_file",
    "export_file",
    "create_mesh_object",
    "render_image",
    "delete_objects",
}

try:
    payload = json.loads(os.environ["RESPONSE_JSON"])
except Exception:
    raise SystemExit(1)

tools = []
if isinstance(payload, list):
    tools = payload
elif isinstance(payload, dict) and isinstance(payload.get("tools"), list):
    tools = payload["tools"]

names = {
    entry.get("name")
    for entry in tools
    if isinstance(entry, dict) and isinstance(entry.get("name"), str)
}

raise SystemExit(0 if required.issubset(names) else 1)
PY
}

select_default_blender_mcp_url() {
  local ports=(8010 8011 8012 8013)

  if [ -n "${PROMPTPET_BLENDER_MCP_PORT_CANDIDATES:-}" ]; then
    ports=(${=PROMPTPET_BLENDER_MCP_PORT_CANDIDATES})
  fi

  local port
  for port in $ports; do
    local candidate_url="http://127.0.0.1:${port}"

    if is_blender_mcp_server "$candidate_url"; then
      echo "$candidate_url"
      return 0
    fi

    if ! is_port_listening "$port"; then
      echo "$candidate_url"
      return 0
    fi
  done

  echo "http://127.0.0.1:8010"
}

setup_blender_mcp_env() {
  local selected_url

  if [ -n "${BLENDER_MCP_SERVER_URL:-}" ]; then
    selected_url="$(normalize_blender_mcp_url "$BLENDER_MCP_SERVER_URL")"
  elif [ -n "${BLENDER_MCP_PORT:-}" ]; then
    selected_url="http://127.0.0.1:${BLENDER_MCP_PORT}"
  else
    selected_url="$(select_default_blender_mcp_url)"
  fi

  local selected_port
  selected_port="$(extract_blender_mcp_port "$selected_url")" || {
    echo "Invalid BLENDER_MCP_SERVER_URL: $selected_url"
    return 1
  }

  export BLENDER_MCP_SERVER_URL="$selected_url"
  export BLENDER_MCP_PORT="$selected_port"
}

ensure_blender_mcp_server() {
  if is_blender_mcp_server "$BLENDER_MCP_SERVER_URL"; then
    echo "Blender MCP already running at $BLENDER_MCP_SERVER_URL"
    return 0
  fi

  if is_port_listening "$BLENDER_MCP_PORT"; then
    echo "Port $BLENDER_MCP_PORT is occupied by a non-Blender-MCP service."
    echo "Please free that port or set BLENDER_MCP_SERVER_URL to a real Blender MCP endpoint."
    return 1
  fi

  npm run blender:mcp:start &
  local blender_mcp_pid=$!
  local attempts=0

  until is_blender_mcp_server "$BLENDER_MCP_SERVER_URL"; do
    attempts=$((attempts + 1))

    if ! kill -0 "$blender_mcp_pid" >/dev/null 2>&1; then
      echo "Blender MCP process exited before $BLENDER_MCP_SERVER_URL became ready."
      return 1
    fi

    if [ "$attempts" -ge 60 ]; then
      echo "Timed out waiting for Blender MCP at $BLENDER_MCP_SERVER_URL"
      return 1
    fi

    sleep 2
  done
}
