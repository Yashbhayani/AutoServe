import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {createRequire} from 'node:module';
import path from 'node:path';
import vm from 'node:vm';
import ts from 'typescript';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
const require=createRequire(import.meta.url),root=path.resolve(path.dirname(new URL(import.meta.url).pathname),'../src');
const snapshot={vehicles:[{id:1,customer_id:2003,year:2024,make:'Toyota',model:'Camry',mileage:'500',license_plate:'TEST'}],requests:[{id:11,customer_id:2003,technician_id:2002,work_order_id:22,vehicle:'2024 Toyota Camry',services:'Brake Inspection',stage:'Diagnosis',description:'Brake concern',diagnosis:'Inspect pads',held:0}],appointments:[{id:1,service_request_id:11,scheduled_date:'2026-11-13',scheduled_time:'10:00',status:'Scheduled',status_code:'SCHEDULED'}],serviceTypes:[{id:1,name:'Brake Inspection'}],technicians:[],invoices:[],events:[],settings:[{center_name:'AutoServe'}]};
let role='customer',logical='/customer/requests';const cache=new Map();
function load(file){if(cache.has(file))return cache.get(file).exports;const mod={exports:{}};cache.set(file,mod);const code=ts.transpileModule(readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2020}}).outputText;function dep(name){if(name.includes('store/AppContext'))return {useApp:()=>({accountId:role==='technician'?'db:2002':'db:2003',isAdmin:role==='admin',availableRoles:[role]})};if(name.includes('hooks/useRemote'))return {useRemote:()=>({data:snapshot,loading:false,error:'',refresh:()=>{}})};if(name.includes('NotificationsContext'))return {useNotifications:()=>({refresh:()=>{}})};if(name.endsWith('router'))return {useLogicalPath:()=>logical,useNavigate:()=>()=>{},Link:({to,children,...props})=>React.createElement('a',{href:to,...props},children)};if(name.includes('api/request') || (name.startsWith('.')&&path.resolve(path.dirname(file),name).includes('/api/request')))return {apiRequest:async()=>({})};if(name.startsWith('.')){const base=path.resolve(path.dirname(file),name),resolved=[base,base+'.tsx',base+'.ts'].find(p=>existsSync(p));if(!resolved)throw new Error(name);return load(resolved);}return require(name);}vm.runInNewContext(code,{module:mod,exports:mod.exports,require:dep},{filename:file});return mod.exports;}
const screens=load(path.join(root,'pages/operations.tsx'));
const render=name=>renderToStaticMarkup(React.createElement(screens[name]));
test('US-UI-01: customer requests and appointments share a page without request totals',()=>{role='customer';logical='/customer/requests';const html=render('CustomerRequests');assert.match(html,/Service Requests &amp; Appointments/);assert.match(html,/Appointments/);assert.match(html,/Brake Inspection/);assert.doesNotMatch(html,/>Total</);});
test('US-UI-02: technician work orders show diagnosis and customer approval without estimate or hours editors',()=>{role='technician';logical='/technician/work-orders/11';const html=render('WorkOrderDetail');assert.match(html,/Request customer approval/);assert.match(html,/Save diagnosis/);assert.doesNotMatch(html,/Estimate|Daily Hours|Working Hours|Rating|Feedback/);});
test('US-UI-03: customers cannot see admin billing or assignment controls',()=>{role='customer';logical='/customer/repair-status/11';const html=render('WorkOrderDetail');assert.doesNotMatch(html,/Assign technician|Record confirmed payment|Issue final invoice/);assert.match(html,/Inspect pads/);});
