#!/bin/bash
# Download shaders21k dataset and MiniMax shader-dev skill
# Run: bash scripts/download-shaders.sh

set -e

DATA_DIR="data"
SHADERS21K_DIR="$DATA_DIR/shaders21k"
MINIMAX_DIR="$DATA_DIR/minimax-templates"

echo "=== Downloading Shader Knowledge Sources ==="

# Create data directory
mkdir -p "$DATA_DIR"

# 1. Download shaders21k
echo ""
echo "--- shaders21k ---"
if [ -d "$SHADERS21K_DIR/all_codes" ]; then
  echo "Already downloaded: $SHADERS21K_DIR/all_codes"
  echo "Files: $(ls "$SHADERS21K_DIR/all_codes" | wc -l)"
else
  echo "Downloading shaders21k..."
  cd "$DATA_DIR"

  # Clone the repo (shallow)
  if [ ! -d "shaders21k" ]; then
    git clone --depth 1 https://github.com/mbaradad/shaders21k.git
  fi

  cd shaders21k

  # Download shader codes
  echo "Downloading shader codes..."
  if [ -f "scripts/download/download_shader_codes.sh" ]; then
    bash scripts/download/download_shader_codes.sh
  else
    echo "Download script not found. Trying direct download..."
    # Try to download all_codes.zip from the repo releases or data directory
    mkdir -p all_codes
    echo "Please download shader codes manually from: https://github.com/mbaradad/shaders21k"
    echo "Place .glsl files in: $SHADERS21K_DIR/all_codes/"
  fi

  cd ../..
  echo "shaders21k download complete"
fi

# 2. Download MiniMax shader-dev skill
echo ""
echo "--- MiniMax shader-dev skill ---"
if [ -d "$MINIMAX_DIR" ] && [ "$(ls -A "$MINIMAX_DIR" 2>/dev/null)" ]; then
  echo "Already downloaded: $MINIMAX_DIR"
else
  echo "Downloading MiniMax shader-dev skill..."
  mkdir -p "$MINIMAX_DIR"

  # Download the skill SKILL.md
  curl -sL "https://raw.githubusercontent.com/MiniMax-AI/skills/main/skills/shader-dev/SKILL.md" -o "$MINIMAX_DIR/SKILL.md"

  # Download technique files
  echo "Downloading technique files..."
  curl -sL "https://api.github.com/repos/MiniMax-AI/skills/contents/skills/shader-dev/techniques" | \
    grep -o '"name": *"[^"]*"' | sed 's/"name": *"//;s/"//' | while read -r fname; do
      echo "  Downloading: $fname"
      curl -sL "https://raw.githubusercontent.com/MiniMax-AI/skills/main/skills/shader-dev/techniques/$fname" -o "$MINIMAX_DIR/$fname"
    done

  echo "MiniMax download complete"
fi

# 3. Summary
echo ""
echo "=== Summary ==="
echo "shaders21k: $(find "$SHADERS21K_DIR" -name "*.glsl" -o -name "*.frag" 2>/dev/null | wc -l) shader files"
echo "MiniMax: $(find "$MINIMAX_DIR" -type f 2>/dev/null | wc -l) template files"
echo ""
echo "Next step: Run preprocessing to build the knowledge index"
echo "  npx tsx src/ai/knowledge/rag/preprocess.ts"
