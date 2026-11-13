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
function load(file){if(cache.has(file))return cache.get(file).exports;const mod={exports:{}};cache.set(file,mod);const code=ts.transpileModule(readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2020}}).outputText;function dep(name){if(name.includes('store/AppContext'))return {useApp:()=>({accountId:role==='technician'?'db:2002':'db:2003',isAdmin:role==='admin',availableRoles:[role]})};if(name.includes('hooks/useRemote'))return {useRemote:(_load,keys)=>({data:keys?.length===1 && keys[0]===undefined ? [] : snapshot,loading:false,error:'',refresh:()=>{}})};if(name.includes('NotificationsContext'))return {useNotifications:()=>({refresh:()=>{}})};if(name.endsWith('router'))return {useLogicalPath:()=>logical,useLocation:()=>({search:''}),useNavigate:()=>()=>{},Link:({to,children,...props})=>React.createElement('a',{href:to,...props},children)};if(name.includes('api/request') || (name.startsWith('.')&&path.resolve(path.dirname(file),name).includes('/api/request')))return {apiRequest:async()=>({})};if(name.startsWith('.')){const base=path.resolve(path.dirname(file),name),resolved=[base,base+'.tsx',base+'.ts'].find(p=>existsSync(p));if(!resolved)throw new Error(name);return load(resolved);}return require(name);}vm.runInNewContext(code,{module:mod,exports:mod.exports,require:dep,URLSearchParams},{filename:file});return mod.exports;}
const screens=load(path.join(root,'pages/operations.tsx'));
const render=name=>renderToStaticMarkup(React.createElement(screens[name]));
const liveScreens=load(path.join(root,'pages/live.tsx'));
const renderLive=name=>renderToStaticMarkup(React.createElement(liveScreens[name]));
test('technician parts page shows inventory without part request controls',()=>{
 role='technician';const previous={parts:snapshot.parts,categories:snapshot.categories,requests:snapshot.requests,archivedParts:snapshot.archivedParts};
 try{
  snapshot.parts=[{id:1,is_active:1,category_id:1,code:'FLT-1',name:'Oil filter',sku:'SKU-1',category_name:'Filters',unit_price:12,stock_quantity:8,reorder_level:2}];snapshot.categories=[{id:1,code:'FILTERS',name:'Filters'}];snapshot.requests=[];snapshot.archivedParts=[];
  const html=renderLive('TechParts');
  assert.match(html,/Oil filter/);assert.match(html,/Parts/);
  assert.doesNotMatch(html,/Request a part|Submit request|My requests|Pending requests|Assigned work order/);
 }finally{Object.assign(snapshot,previous);}
});
test('dashboard renders metrics and records from the operations snapshot',()=>{
 role='admin';const created=snapshot.requests[0].created_at,scheduled=snapshot.appointments[0].scheduled_date;
 try{
  snapshot.requests[0].created_at=new Date().toISOString();snapshot.appointments[0].scheduled_date=`${new Date().getFullYear()+1}-01-01`;
  const html=renderLive('AdminDashboard');
    for(const text of ['Requests in period','Open requests','Open work orders','#11 / #22','Brake concern','Upcoming appointments'])assert.ok(html.includes(text),text);
 }finally{snapshot.requests[0].created_at=created;snapshot.appointments[0].scheduled_date=scheduled;}
});
test('work-order check-in requires an active appointment and offers scheduling when missing',()=>{
 role='admin';logical='/admin/work-orders/11';const appointments=snapshot.appointments,stage=snapshot.requests[0].stage;
 try{
  snapshot.requests[0].stage='Service Requested';snapshot.appointments=[];
  let html=render('WorkOrderDetail');assert.match(html,/Schedule appointment/);assert.doesNotMatch(html,/Check in vehicle/);
  role='technician';logical='/technician/work-orders/11';html=render('WorkOrderDetail');assert.match(html,/An admin must schedule an active appointment/);assert.doesNotMatch(html,/Schedule appointment|Check in vehicle/);
  role='admin';logical='/admin/work-orders/11';
  snapshot.appointments=appointments;html=render('WorkOrderDetail');assert.match(html,/Change appointment/);assert.match(html,/Check in vehicle/);
 }finally{snapshot.appointments=appointments;snapshot.requests[0].stage=stage;}
});
test('appointment slots enforce business hours and close Sundays',()=>{
 assert.equal(screens.appointmentSlotError({date:'2026-11-16',time:'09:00'}),null);
 assert.equal(screens.appointmentSlotError({date:'2026-11-16',time:'17:00'}),null);
 assert.match(screens.appointmentSlotError({date:'2026-11-16',time:'08:30'}),/9:00 AM and 5:00 PM/);
 assert.match(screens.appointmentSlotError({date:'2026-11-15',time:'10:00'}),/Sundays/);
 const yesterday=new Date();yesterday.setDate(yesterday.getDate()-1);const pastDate=`${yesterday.getFullYear()}-${String(yesterday.getMonth()+1).padStart(2,'0')}-${String(yesterday.getDate()).padStart(2,'0')}`;
 assert.match(screens.appointmentSlotError({date:pastDate,time:'10:00'}),/future appointment date/);
});
test('admin service requests show only unstarted requests and appointment times appear for staff',()=>{
 const requests=snapshot.requests;role='admin';logical='/admin/requests';
 try{
  snapshot.requests=[{...requests[0],id:11,stage:'Service Requested'},{...requests[0],id:12,stage:'Diagnosis'},{...requests[0],id:13,stage:'Completed'}];
  const adminHtml=render('AdminRequests');
  assert.match(adminHtml,/2026-11-13 10:00/);assert.doesNotMatch(adminHtml,/Schedule or reschedule an appointment|Schedule appointment/);
  assert.doesNotMatch(adminHtml,/#12|#13/);
  role='technician';logical='/technician/work-orders';const technicianHtml=render('WorkOrders');
  assert.match(technicianHtml,/2026-11-13 10:00/);
 }finally{snapshot.requests=requests;}
});
test('work orders include every held request last, even without assignment or stage match',()=>{
 const requests=snapshot.requests;role='admin';logical='/admin/work-orders';
 try{
  snapshot.requests=[
   {...requests[0],id:21,work_order_id:31,stage:'Diagnosis',held:0},
   {...requests[0],id:22,work_order_id:null,stage:'Service Requested',held:1,hold_reason:"Customer didn't show up"},
   {...requests[0],id:23,work_order_id:33,stage:'Diagnosis',held:1,hold_reason:"Customer didn't show up"},
  ];
  const html=render('WorkOrders');
  assert.ok(html.indexOf('#21 / #31')<html.indexOf('#22'));
  assert.ok(html.indexOf('#22')<html.indexOf('#23 / #33'));
  assert.equal((html.match(/On hold/g)??[]).length,2);
 }finally{snapshot.requests=requests;}
});
test('customers cannot edit or check in and see cancel after activity history',()=>{
 role='customer';logical='/customer/repair-status/11';const stage=snapshot.requests[0].stage;
 try{
  snapshot.requests[0].stage='Service Requested';const html=render('WorkOrderDetail');
  assert.doesNotMatch(html,/Edit unstarted service request|Check in vehicle/);
  assert.ok(html.indexOf('Activity history')<html.indexOf('Cancel service request'));
 }finally{snapshot.requests[0].stage=stage;}
});
test('admin can cancel an unstarted work order while customers cannot cancel work orders',()=>{
 const stage=snapshot.requests[0].stage;try{
  snapshot.requests[0].stage='Service Requested';role='admin';logical='/admin/work-orders/11';
  assert.match(render('WorkOrderDetail'),/Cancel work order/);
  role='technician';logical='/technician/work-orders/11';assert.doesNotMatch(render('WorkOrderDetail'),/Cancel work order/);
 }finally{snapshot.requests[0].stage=stage;}
});
test('customer can change an active appointment but cannot set one when none exists',()=>{
 role='customer';logical='/customer/repair-status/11';const stage=snapshot.requests[0].stage;
 const appointments=snapshot.appointments;
 try{
  snapshot.requests[0].stage='Service Requested';const html=render('WorkOrderDetail');
  assert.match(html,/Current appointment: 2026-11-13 at 10:00/);assert.match(html,/Change appointment/);
  snapshot.appointments=[];const unscheduled=render('WorkOrderDetail');assert.match(unscheduled,/An admin will schedule an appointment/);assert.doesNotMatch(unscheduled,/Change appointment|Schedule appointment/);
 }finally{snapshot.requests[0].stage=stage;snapshot.appointments=appointments;}
});
test('US-UI-01: customer requests omit completed requests and appointment panels',()=>{
 role='customer';logical='/customer/requests';const requests=snapshot.requests;
 try{
  snapshot.requests=[{...requests[0],id:11,stage:'Diagnosis'},{...requests[0],id:12,stage:'Completed'}];
  const html=render('CustomerRequests');assert.match(html,/Service Requests/);assert.match(html,/Brake Inspection/);assert.match(html,/#11/);assert.doesNotMatch(html,/#12|Appointments|Schedule or reschedule/);assert.doesNotMatch(html,/>Total</);
 }finally{snapshot.requests=requests;}
});
test('US-UI-02: technician work orders show diagnosis and customer approval without estimate or hours editors',()=>{role='technician';logical='/technician/work-orders/11';const html=render('WorkOrderDetail');assert.match(html,/Request customer approval/);assert.match(html,/Save diagnosis/);assert.doesNotMatch(html,/Estimate|Daily Hours|Working Hours|Rating|Feedback/);});
test('US-UI-03: customers cannot see admin billing or assignment controls',()=>{role='customer';logical='/customer/repair-status/11';const html=render('WorkOrderDetail');assert.doesNotMatch(html,/Assign technician|Record confirmed payment|Issue final invoice/);assert.match(html,/Inspect pads/);});
test('US-UI-04: diagnosis exposes part quantities to technicians and admins',()=>{
 snapshot.parts=[{id:1,name:'Oil filter',sku:'SKU-1',stock_quantity:8,unit_price:12.5}];
 snapshot.workOrderParts=[{work_order_id:22,part_id:1,name:'Oil filter',sku:'SKU-1',quantity:2,unit_price:12.5}];snapshot.billing=[{work_order_id:22,revision:1}];
 for(const r of ['technician','admin']){role=r;logical=`/${r}/work-orders/11`;const html=render('WorkOrderDetail');assert.match(html,/Choose parts during diagnosis/);assert.match(html,/Oil filter/);assert.match(html,/Parts total:.*25\.00/);assert.match(html,/Remove unused part/);}
 role='customer';logical='/customer/repair-status/11';const html=render('WorkOrderDetail');assert.match(html,/Oil filter/);assert.doesNotMatch(html,/Choose parts during diagnosis|Remove unused part/);
});
test('US-UI-05: customer sees approval totals and full downloadable invoice',()=>{
 role='customer';logical='/customer/repair-status/11';snapshot.requests[0].stage='Customer Approval';let html=render('WorkOrderDetail');assert.match(html,/Approve repairs/);assert.match(html,/Parts total:.*25\.00/);assert.doesNotMatch(html,/Choose parts during diagnosis/);
 snapshot.invoices=[{id:7,work_order_id:22,amount:100,collected:0,status:'Issued'}];snapshot.invoiceDetails=[{invoice_id:7,parts_total:25,labor_total:75,labor_description:'Repair labor',customer_name:'Customer One',vehicle:'Toyota Camry'}];snapshot.invoiceLines=[{invoice_id:7,part_id:1,name:'Oil filter',sku:'SKU-1',quantity:2,unit_price:12.5,line_total:25}];logical='/customer/invoice/7';html=render('InvoiceDetail');for(const text of ['Oil filter','SKU-1','Repair labor','Download invoice','100.00'])assert.ok(html.includes(text),text);
 snapshot.requests[0].stage='Diagnosis';snapshot.invoices=[];
});
test('US-UI-06: admin reviews parts and adds labor instead of entering an arbitrary invoice amount',()=>{
 role='admin';logical='/admin/work-orders/11';snapshot.requests[0].stage='Completed';const html=render('WorkOrderDetail');assert.match(html,/Labor charges/);assert.match(html,/Issue final invoice/);assert.match(html,/Oil filter/);assert.doesNotMatch(html,/Final invoice amount/);snapshot.requests[0].stage='Diagnosis';
});
