#!/bin/sh
set -eu
ofm_root=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
ofm_config=${MAGPIE_CONFIG_DIR:-${XDG_CONFIG_HOME:-$HOME/.config}/magpie}
if command -v node >/dev/null 2>&1; then
  exec node "$ofm_root/scripts/open-console.mjs" "$@"
fi
for ofm_node in "$ofm_config"/our-free-model/runtime/node-v*/bin/node; do
  if [ -x "$ofm_node" ]; then exec "$ofm_node" "$ofm_root/scripts/open-console.mjs" "$@"; fi
done
printf '%s\n' '未找到 Node。请先启动 Magpie 插件，或用已安装的 Node 执行 scripts/open-console.mjs。'
read -r ofm_answer
