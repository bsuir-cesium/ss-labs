import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const {analyze} = require('./dist/analyzer.cjs');
const cases = [
 ['linear', 'let x=1; console.log(x);', [0,2,0]],
 ['empty function', 'function f(){}', [0,0,0]],
 ['four cases','switch(x){case 1:break;case 2:break;case 3:break;case 4:break;default:break;}',[4,6,3]],
 ['first case','switch(x){case 1:if(x)++x;break;case 2:break;case 3:break;case 4:break;}',[5,7,3]],
 ['last case','switch(x){case 1:break;case 2:break;case 3:break;case 4:if(x)++x;break;}',[5,7,4]],
 ['default body','switch(x){default:if(x)++x;break;case 1:break;case 2:break;}',[3,6,2]],
 ['nested switch','switch(x){case 1:switch(y){case 1:break;case 2:break;}break;case 2:break;}',[4,6,2]],
 ['fallthrough','switch(x){case 1:case 2:if(x)++x;break;}',[3,4,2]],
 ['dangling else','if(x)if(y)++x;else --x;',[2,4,1]],
 ['header expressions','for(let i=0;i<3;++i){}',[1,1,0]],
 ['five loops','for(;;){}while(x){}do{}while(x);for(const k in obj){}for(const x of xs){}',[5,5,0]],
 ['ternary','const x = a ? (b ? 1:2):3;',[2,1,1]],
 ['literals','const s=`if; switch case`; const r=/if\(\)/; /* while */ ;',[0,3,0]],
 ['template interpolation','const x=`${a?1:2}`;',[1,1,0]],
 ['asi and type','type X = number; let x:X=1\nx++\n',[0,2,0]],
 ['function scope','if(x){function f(){if(y)++y;}}',[2,3,0]],
 ['arrow scope','const f=(x:number)=>x?1:2;',[1,2,0]],
 ['unicode lines','const s="ёжик";\nif(s){}',[1,2,0]],
 ['import inert','import x from "file:///private/secret"; if(x){}',[1,1,0]],
];
for(const [name, source, expected] of cases){
 const r=analyze(source); assert.deepEqual([r.CL,r.N,r.CLI],expected,name);
 assert.ok(r.CL===0 || r.CL>r.CLI,name);
}
for(const source of ['if (', 'try {} catch(e){}', 'class X {}', 'break;', 'continue;', 'return 1;', 'label:while(x)break label;', 'const obj={f(){if(x)y();}}']) assert.throws(()=>analyze(source), source);
const r=analyze(readFileSync(new URL('./example.ts',import.meta.url),'utf8'));
assert.deepEqual([r.CL,r.N,r.CLI],[12,33,5]);
assert.equal(analyze('function f(){}').cl,null);
assert.equal(globalThis.GILB_EXECUTED,undefined);
analyze('globalThis.GILB_EXECUTED=true;');
assert.equal(globalThis.GILB_EXECUTED,undefined);
console.log('PASS: 19 manual cases, 8 rejection cases, no source execution, full TS example.');
console.log(JSON.stringify(r));
