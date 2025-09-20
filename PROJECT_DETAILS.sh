#!/usr/bin/env bash

OUTFILE="PROJECT_DETAILS.JSON"

if [[ -f ".gitignore" ]]; then
  IGNORE_PATTERNS=($(cat .gitignore | grep -v '^#' | grep -v '^$'))
else
  IGNORE_PATTERNS=()
fi

# Проверка, игнорируется ли файл
is_ignored() {
  local path="$1"
  [[ "$path" == *"/.git/"* ]] && return 0
  [[ "$path" == *"/node_modules/"* ]] && return 0
  [[ "$path" == *"/venv/"* ]] && return 0
  [[ "$path" == *"package-lock"* ]] && return 0
  [[ "$path" == *"node_modules"* ]] && return 0
  [[ "$path" == *"PROJECT_DETAILS"* ]] && return 0
  [[ "$path" == *"fix"* ]] && return 0
  
  for pattern in "${IGNORE_PATTERNS[@]}"; do
    [[ "$pattern" ]] || continue
    [[ "$path" == *"$pattern"* ]] && return 0
  done
  return 1
}

# Формирует JSON структуру
dir_to_json() {
  local dir="$1"
  echo "{"
  echo "\"name\": \"$(basename "$dir")\", \"type\": \"directory\", \"children\": ["
  local first=1
  for entry in "$dir"/*; do
    [[ -e "$entry" ]] || continue
    is_ignored "$entry" && continue

    if [ $first -eq 0 ]; then echo ","; fi
    first=0

    if [ -d "$entry" ]; then
      dir_to_json "$entry"
    elif [ -f "$entry" ]; then # Проверку на -f лучше оставить, она не вредит
      # Файл
      echo -n "{ \"name\": \"$(basename "$entry")\", \"type\": \"file\""
      if [[ "$entry" == *.md ]]; then
        echo ", \"content\": \"markdown skipped\""
      else
        # Вот исправленная команда
        CONTENT=$(base64 < "$entry" 2>/dev/null || echo "")
        echo -n ", \"content_base64\": \"$CONTENT\""
      fi
      echo " }"
    fi
  done
  echo "]}"
}

{
  echo "{ \"project\":"
  dir_to_json "."
  echo "}"
} > "$OUTFILE"

echo "PROJECT_DETAILS.JSON создан с полным содержимым файлов в base64.[web:24][3]"
