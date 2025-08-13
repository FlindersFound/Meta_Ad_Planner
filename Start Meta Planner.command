#!/bin/bash
cd "$(dirname "$0")"
chmod +x run.sh
if [[ -n "$TERM_PROGRAM" ]]; then
  bash run.sh
else
  osascript -e 'tell application "Terminal" to do script "cd \"'$(pwd)'\" && bash run.sh"'
fi
