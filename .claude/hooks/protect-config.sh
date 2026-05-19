#!/bin/bash
# PreToolUse hook (Write|Edit matcher): Guards critical config files.
# Aidevx2: protects Supabase config, env, Vite config, and linter/build configs.
#
# Exit code 0 with JSON = prompt user for confirmation before proceeding

PYTHON=$(command -v python3 2>/dev/null || command -v python 2>/dev/null)
if [ -z "$PYTHON" ]; then exit 0; fi

INPUT=$(cat)
FILE_PATH=$(echo "$INPUT" | "$PYTHON" -c "import sys,json;d=json.load(sys.stdin);print(d.get('tool_input',{}).get('file_path',''))" 2>/dev/null)

# Aidevx2 critical config files
if echo "$FILE_PATH" | grep -qiE '(supabase/config\.toml|\.env(\.local|\.example)?$|vite\.config\.(ts|js)|docker-compose\.yml)'; then
  echo '{"decision": "ask", "reason": "This is a critical Aidevx2 config file (Supabase, env, Vite, or Docker). Confirm this edit is intentional and will not break the deployment or local setup."}'
  exit 0
fi

# Standard linter/formatter/build configs
if echo "$FILE_PATH" | grep -qiE '(eslint\.config|\.eslintrc|prettier\.config|\.prettierrc|tsconfig|biome\.json|vitest\.config|tailwind\.config|jest\.config|\.npmrc|rollup\.config)'; then
  echo '{"decision": "ask", "reason": "This is a linter/formatter/build config. Confirm this edit improves the config rather than weakening rules to suppress errors."}'
  exit 0
fi

exit 0
