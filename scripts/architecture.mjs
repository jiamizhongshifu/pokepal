import { readFileSync } from 'node:fs';
import { resolve, relative } from 'node:path';
import ts from 'typescript';

// Inspect emitted imports so a type-only reference cannot create a runtime cycle.
// The same resolver and compiler options are used by the application type check.
const config = ts.readConfigFile('tsconfig.json', ts.sys.readFile);
if (config.error) throw new Error(ts.flattenDiagnosticMessageText(config.error.messageText, '\n'));
const project = ts.parseJsonConfigFileContent(config.config, ts.sys, resolve('.'));
const graph = new Map();
for (const file of project.fileNames.filter(file => /\.(?:tsx?|m?js)$/.test(file) && !file.endsWith('.d.ts'))) {
  const source = readFileSync(file, 'utf8');
  const { outputText } = ts.transpileModule(source, { compilerOptions: project.options, fileName: file });
  const imports = ts.preProcessFile(outputText, true, true).importedFiles;
  const targets = imports.map(({ fileName }) => ts.resolveModuleName(fileName, file, project.options, ts.sys).resolvedModule)
    .filter(target => target && !target.isExternalLibraryImport && /\.(?:tsx?|m?js)$/.test(target.resolvedFileName))
    .map(target => relative('.', target.resolvedFileName));
  graph.set(relative('.', file), new Set(targets));
}

if (process.argv.includes('--dot')) {
  console.log('digraph imports {');
  for (const [file, targets] of graph) {
    console.log(`  "${file}";`);
    for (const target of targets) console.log(`  "${file}" -> "${target}";`);
  }
  console.log('}');
} else {
  const visited = new Set();
  const active = new Set();
  const path = [];
  const problems = new Set();
  function visit(file) {
    if (active.has(file)) {
      problems.add('运行时循环依赖，请把共有规则移到其所属模块：' + [...path.slice(path.indexOf(file)), file].join(' → '));
      return;
    }
    if (visited.has(file)) return;
    visited.add(file);
    active.add(file);
    path.push(file);
    for (const target of graph.get(file) ?? []) visit(target);
    path.pop();
    active.delete(file);
  }
  for (const file of graph.keys()) visit(file);
  // These entries must work before the child opens a game or grants device access.
  const isolated = [
    'src/parentInfoMain.tsx', 'functions/api/traffic.ts', 'src/lib/saveValidation.ts',
    ...[...graph.keys()].filter(file => file.startsWith('src/data/')),
  ];
  const gameServices = new Set(['src/store.ts', 'src/lib/db.ts', 'src/lib/speech.ts', 'src/lib/mic.ts']);
  for (const root of isolated) {
    const reached = new Set();
    function checkBoundary(file, chain) {
      if (reached.has(file)) return;
      reached.add(file);
      if (gameServices.has(file)) {
        problems.add('该入口必须能独立加载，请把所需数据或纯规则移出游戏服务：' + [...chain, file].join(' → '));
        return;
      }
      for (const target of graph.get(file) ?? []) checkBoundary(target, [...chain, file]);
    }
    checkBoundary(root, []);
  }
  const reachable = new Set();
  function markReachable(file) {
    if (reachable.has(file)) return;
    reachable.add(file);
    for (const target of graph.get(file) ?? []) markReachable(target);
  }
  for (const entry of ['src/main.tsx', 'src/parentInfoMain.tsx', 'src/storyPreviewMain.tsx']) markReachable(entry);
  for (const file of graph.keys()) {
    if (file.endsWith('.tsx') && !reachable.has(file)) problems.add('页面入口无法加载此组件，请接入现有入口或移除失效实现：' + file);
  }
  for (const problem of problems) console.error(problem);
  if (problems.size) process.exitCode = 1;
  else console.log(`已检查 ${graph.size} 个应用和接口模块的运行时依赖。`);
}
