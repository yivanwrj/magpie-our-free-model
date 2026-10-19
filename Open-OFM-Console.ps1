$ErrorActionPreference = 'Stop'
$ofmConfig = if ($env:MAGPIE_CONFIG_DIR) { $env:MAGPIE_CONFIG_DIR } elseif ($env:XDG_CONFIG_HOME) { Join-Path $env:XDG_CONFIG_HOME 'magpie' } else { Join-Path $HOME '.config/magpie' }
$ofmNode = Get-Command node -ErrorAction SilentlyContinue
if ($ofmNode) { $ofmExe = $ofmNode.Source } else {
  $ofmExe = Get-ChildItem (Join-Path $ofmConfig 'our-free-model/runtime/node-v*/node.exe') -ErrorAction SilentlyContinue | Select-Object -First 1 -ExpandProperty FullName
}
if (!$ofmExe) { throw '未找到 Node。请先启动 Magpie 插件，或安装 Node。' }
& $ofmExe (Join-Path $PSScriptRoot 'scripts/open-console.mjs') @args
