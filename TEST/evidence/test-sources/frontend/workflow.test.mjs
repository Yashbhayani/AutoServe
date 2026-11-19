import test from 'node:test';
import assert from 'node:assert/strict';
import {STAGES} from '../src/lib/constants.ts';
import {canAdvance,diagnosisUpdate} from '../src/lib/workflow.ts';
import {parseSnapshot} from '../src/store/persistence.ts';
import * as seed from '../src/data/mock.ts';
test('work progresses through exactly six stages and cannot skip customer approval',()=>{
 assert.deepEqual(STAGES,['Service Requested','Vehicle Checked In','Diagnosis','Customer Approval','Repair','Completed']);
 for(let i=0;i<STAGES.length-1;i++)assert.equal(canAdvance(STAGES[i],STAGES[i+1]),true);
 assert.equal(canAdvance('Diagnosis','Repair'),false);
 assert.equal(canAdvance('Vehicle Checked In','Completed'),false);
 assert.equal(canAdvance('Completed','Repair'),false);
 assert.equal(canAdvance('Customer Approval','Diagnosis'),true);
});
test('diagnosis can be saved and submitted without an estimate or repair-price lines',()=>{
 assert.deepEqual(diagnosisUpdate('Vehicle Checked In',' Inspect brakes ',false),{diagnosis:'Inspect brakes',stages:['Diagnosis']});
 assert.deepEqual(diagnosisUpdate('Diagnosis','Replace worn brake pads',true).stages,['Diagnosis','Customer Approval']);
 assert.throws(()=>diagnosisUpdate('Service Requested','Diagnosis',true),/cannot be changed/);
 assert.throws(()=>diagnosisUpdate('Diagnosis','  ',true),/Enter a diagnosis/);
 assert.throws(()=>diagnosisUpdate('Customer Approval','Changed after submission',false),/cannot be changed/);
});
test('saved demo requests migrate old stage names without losing linked records',()=>{
 const snapshot={version:2,accounts:seed.accounts,laborRate:100,vehicles:seed.vehicles,requests:seed.serviceRequests.map(r=>({...r,stage:r.stage==='Customer Approval'?'Pending Admin Review':r.stage==='Vehicle Checked In'?'Checked In':r.stage})),appointments:seed.appointments,parts:seed.parts,invoices:seed.invoices,users:seed.users,technicians:seed.technicians,assignments:seed.assignments,notifications:seed.notifications,timeLogs:seed.timeLogs,partRequests:seed.partRequests,specialties:seed.specialties};
 const restored=parseSnapshot(JSON.stringify(snapshot));assert.ok(restored);assert.equal(restored.requests.length,snapshot.requests.length);assert.ok(restored.requests.every(r=>STAGES.includes(r.stage)));assert.equal(restored.appointments.length,snapshot.appointments.length);
});
