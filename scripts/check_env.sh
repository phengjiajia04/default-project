#!/usr/bin/env bash
# 驗證開發環境
set -euo pipefail

echo "==> 檢查必要工具..."
for tool in git python3 node npm gh; do
  if command -v "$tool" >/dev/null 2>&1; then
    echo "  ✓ $tool: $("$tool" --version | head -n 1)"
  else
    echo "  ✗ $tool: 未安裝"
    exit 1
  fi
done
echo "==> 環境檢查完成"