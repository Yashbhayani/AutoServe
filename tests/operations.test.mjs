import test from 'node:test';
import assert from 'node:assert/strict';
import {operations} from '../src/api/operations.ts';
import {saveTokens,clearSession} from '../src/api/session.ts';
test('live workflow actions use the central authenticated JSON API',async()=>{
 const original=globalThis.fetch;saveTokens({accessToken:'test-access',refreshToken:'test-refresh'});
 try{globalThis.fetch=async(url,options)=>{assert.equal(url,'/api/operations/diagnosis.submit');assert.equal(options.method,'POST');assert.equal(options.headers.Authorization,'Bearer test-access');assert.deepEqual(JSON.parse(options.body),{requestId:123,diagnosis:'Inspect brakes'});return new Response(JSON.stringify({success:true,id:123,requestId:123}));};assert.equal((await operations.act('diagnosis.submit',{requestId:123,diagnosis:'Inspect brakes'})).requestId,123);}finally{clearSession();globalThis.fetch=original;}
});
test('snapshot loads preserve the API contract and do not fall back to sample records',async()=>{
 const original=globalThis.fetch;saveTokens({accessToken:'test',refreshToken:'refresh'});const data={success:true,vehicles:[],requests:[],appointments:[],serviceTypes:[],technicians:[],invoices:[],events:[],settings:[]};
 try{globalThis.fetch=async(url)=>{assert.equal(url,'/api/operations/snapshot');return new Response(JSON.stringify(data));};assert.deepEqual(await operations.load(),data);globalThis.fetch=async()=>new Response(JSON.stringify({success:false,message:'Database unavailable'}),{status:503});await assert.rejects(operations.load(),/Database unavailable/);}finally{clearSession();globalThis.fetch=original;}
});
