import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import vm from 'node:vm';
import ts from 'typescript';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
// Render production components without a browser. Effects/resize/pointer behavior still need browser QA.
const source=readFileSync(new URL('../src/components/charts.tsx',import.meta.url),'utf8');
const compiled=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2020}}).outputText;
const mod={exports:{}};
vm.runInNewContext(compiled,{module:mod,exports:mod.exports,require:createRequire(import.meta.url)});
const {BarChart,LineChart,DonutChart}=mod.exports;
const render=(Component,props)=>renderToStaticMarkup(React.createElement(Component,props));
test('trend chart keeps a fixed pixel height and bounded points over a full report period',()=>{
 const html=render(LineChart,{data:Array.from({length:367},(_,i)=>({month:`day-${i}`,value:i%17})),height:220});
 assert.match(html,/<svg[^>]*width="100%"[^>]*height="220"/);
 assert.match(html,/aria-label="Interactive trend chart/);
 const points=html.match(/<polyline points="([^"]+)"/)[1].split(' ').map(p=>p.split(',').map(Number));
 assert.equal(points.length,367);
 assert.ok(points.every(([x,y])=>x>=48&&x<=442&&y>=18&&y<=188));
 assert.ok((html.match(/<text /g)||[]).length<=9,'axis labels must remain sparse');
 assert.match(html,/View chart data/);
});
test('bar labels use HTML text sizing rather than scaling with number of bars',()=>{
 for(const count of [1,2,40]){
  const html=render(BarChart,{data:Array.from({length:count},(_,i)=>({label:'Long service label '+i,value:10+i}))});
  assert.doesNotMatch(html,/<svg/);
  assert.match(html,/break-words/);
  assert.match(html,/overflow-y-auto/);
  assert.equal((html.match(/aria-pressed=/g)||[]).length,count);
 }
});
test('donut legend wraps long labels and exposes keyboard-selectable controls',()=>{
 const html=render(DonutChart,{segments:[{label:'Awaiting Customer Approval',value:12,color:'#2563eb'},{label:'Completed',value:0,color:'#16a34a'}]});
 assert.match(html,/flex-wrap/);
 assert.match(html,/break-words/);
 assert.equal((html.match(/aria-pressed=/g)||[]).length,2);
 assert.match(html,/Total: 12/);
});
test('empty and single-point charts render without invalid coordinates',()=>{
 for(const data of [[],[{month:'2026-11-12',value:0}]]){
  const html=render(LineChart,{data});assert.doesNotMatch(html,/NaN|Infinity/);
 }
});
