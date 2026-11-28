import { readdirSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

const files = readdirSync('scripts/tests')
  .filter(name => /\.test\.(ts|mjs)$/.test(name))
  .sort()
  .map(name => `scripts/tests/${name}`);
if (!files.length) throw new Error('scripts/tests 下没有找到测试文件。');

const result = spawnSync(process.execPath, ['--import', 'tsx', '--test', ...process.argv.slice(2), ...files], { stdio: 'inherit' });
if (result.error) throw result.error;
process.exit(result.status ?? 1);
