import { createRequire } from 'node:module';
import { readFileSync, writeFileSync, mkdirSync, copyFileSync, rmSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join, dirname } from 'node:path';
const require = createRequire(import.meta.url);
const entry = process.env.TYPESCRIPT_PATH || require.resolve('typescript');
const ts = require(entry);
if (ts.version !== '5.9.3') throw new Error(`Use the pinned TypeScript 5.9.3 (found ${ts.version}).`);
const root = dirname(fileURLToPath(import.meta.url));
const out = join(root, 'dist'); mkdirSync(out, {recursive:true});
rmSync(join(out, 'README.md'), {force:true});
const options = {target:ts.ScriptTarget.ES2022, module:ts.ModuleKind.CommonJS, strict:true, noEmit:true,
  baseUrl:root, paths:{typescript:[entry.replace(/\.js$/, '.d.ts')]}, lib:['lib.es2022.d.ts','lib.dom.d.ts']};
const program = ts.createProgram([join(root,'analyzer.ts'), join(root,'example.ts')], options);
const diagnostics = ts.getPreEmitDiagnostics(program);
if (diagnostics.length) {
  console.error(ts.formatDiagnosticsWithColorAndContext(diagnostics, {getCurrentDirectory:()=>root,getCanonicalFileName:p=>p,getNewLine:()=> '\n'}));
  process.exit(1);
}
const compiled = ts.transpileModule(readFileSync(join(root,'analyzer.ts'),'utf8'), {compilerOptions: options}).outputText;
writeFileSync(join(out,'analyzer.cjs'),compiled);
writeFileSync(join(out,'gilb.js'),`(() => { const exports = {}; const require = () => globalThis.ts;\n${compiled}\nglobalThis.Gilb = exports; })();\n`);
writeFileSync(join(out,'example.js'),ts.transpileModule(readFileSync(join(root,'example.ts'),'utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText);
writeFileSync(join(out,'example-source.js'),`globalThis.EXAMPLE_SOURCE = ${JSON.stringify(readFileSync(join(root,'example.ts'),'utf8'))};\n`);
copyFileSync(entry,join(out,'typescript.js'));
for (const name of ['LICENSE.txt','ThirdPartyNoticeText.txt']) copyFileSync(join(dirname(entry),'..',name),join(out,name));
for (const name of ['index.html','style.css','app.js','example.ts']) {
  copyFileSync(join(root,name),join(out,name));
}
console.log('Built offline dist/ with TypeScript 5.9.3.');
