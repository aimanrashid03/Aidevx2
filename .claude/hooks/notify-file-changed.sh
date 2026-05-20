#!/bin/bash
# PostToolUse hook (Write|Edit matcher): Injects a verify reminder after source edits.
# Aidevx2: covers React/TS frontend (.tsx/.ts), SQL migrations, and Deno edge functions.
# Excludes test files and generated files.

PYTHON=$(command -v python3 2>/dev/null || command -v python 2>/dev/null)
if [ -z "$PYTHON" ]; then exit 0; fi

INPUT=$(cat)
FILE_PATH=$(echo "$INPUT" | "$PYTHON" -c "import sys,json;d=json.load(sys.stdin);print(d.get('tool_input',{}).get('file_path',''))" 2>/dev/null)

# Source files: frontend TS/TSX, edge function TS, SQL migrations
if echo "$FILE_PATH" | grep -qE '\.(ts|tsx|sql)$'; then
  # Exclude test/spec files and generated files
  if echo "$FILE_PATH" | grep -qE '(\.test\.|\.spec\.|/__tests__/|/tests?/|corradDesign\.ts)'; then
    exit 0
  fi

  # SQL migration reminder
  if echo "$FILE_PATH" | grep -qE '\.sql$'; then
    echo '{"systemMessage": "SQL migration modified. Verify: (1) run `supabase db reset` locally if needed, (2) check for missing RLS policies, (3) confirm migration filename follows project naming convention."}'
    exit 0
  fi

  # Edge function reminder
  if echo "$FILE_PATH" | grep -qE 'supabase/functions/'; then
    echo '{"systemMessage": "Edge function modified. Verify before declaring done: run `npm run build` (type-check), re-read the edited file to confirm the change landed, and remember to deploy with `supabase functions deploy <name> --no-verify-jwt`."}'
    exit 0
  fi

  # Frontend source file
  echo '{"systemMessage": "Source file modified. Verify before declaring done: run `npm run build` to check for TypeScript errors, re-read the edited file to confirm the change landed correctly."}'
fi

exit 0
