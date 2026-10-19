import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import path from 'node:path';
const exec = promisify(execFile);
export function isAuxiliaryMagpie(command) {
  // Match the executable and subcommand, not a script argument mentioning MCP.
  return /(?:^|[\\/])magpie(?:\.exe)?["']?\s+mcp(?:\s|$)/i.test(String(command).trim());
}
async function parentCommand(pid, platform) {
  if (!Number.isSafeInteger(pid) || pid < 1) throw new Error('invalid parent');
  if (platform === 'win32') {
    const binary = path.win32.join(process.env.SystemRoot ?? 'C:\\Windows', 'System32', 'WindowsPowerShell', 'v1.0', 'powershell.exe');
    return (await exec(binary, ['-NoProfile', '-NonInteractive', '-Command', `(Get-CimInstance Win32_Process -Filter 'ProcessId = ${pid}').CommandLine`], { timeout: 2000, maxBuffer: 65536, windowsHide: true })).stdout;
  }
  return (await exec('/bin/ps', ['-p', String(pid), '-o', 'command='], { timeout: 2000, maxBuffer: 65536 })).stdout;
}
export async function resolveHostRole(dependencies = {}) {
  const platform = dependencies.platform ?? process.platform;
  try {
    const command = await (dependencies.parentCommand ?? parentCommand)(dependencies.parentPid ?? process.ppid, platform);
    if (!command.trim()) throw new Error('parent not readable');
    return isAuxiliaryMagpie(command) ? 'auxiliary' : 'primary';
  } catch {
    // macOS/Windows must not accidentally let an unidentifiable MCP own OFM.
    // Linux container hosts may prohibit ps; retain their existing CLI support.
    return platform === 'linux' ? 'primary' : 'unknown';
  }
}
export const primaryRequired = () => Object.assign(new Error('图片 MCP 辅助宿主不会启动或接管 OFM；请先在 Magpie 主程序中启用 OFM。'), { code: 'OFM_PRIMARY_REQUIRED' });
