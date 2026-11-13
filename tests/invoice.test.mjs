import test from 'node:test';
import assert from 'node:assert/strict';
import {invoiceDocument} from '../src/lib/invoice.ts';

test('downloaded invoice includes itemized parts, labor, totals and payment balance',()=>{
 const html=invoiceDocument({id:7,work_order_id:22,created_at:'2026-11-13',amount:130.25,collected:30,status:'Issued'},
  {center_name:'AutoServe',customer_name:'Customer One',vehicle:'Toyota Camry',parts_total:55.25,labor_total:75,labor_description:'Brake repair'},
  [{part_id:1,name:'Oil filter',sku:'SKU-1',quantity:2,unit_price:12.50,line_total:25},{part_id:2,name:'Brake pad',sku:'SKU-2',quantity:1,unit_price:30.25,line_total:30.25}]);
 for(const value of ['Oil filter','SKU-1','Brake pad','SKU-2','$55.25','$75.00','$130.25','$100.25','Customer One','Toyota Camry','Brake repair']) assert.ok(html.includes(value),value);
 assert.match(html,/@media print/);
});
test('downloaded invoice safely escapes customer, part and labor text',()=>{
 const html=invoiceDocument({id:1,work_order_id:2,amount:10,collected:0,status:'Issued'},
  {center_name:'<script>alert(1)</script>',labor_description:'<img src=x onerror=alert(1)>',labor_total:10,parts_total:0},
  [{name:'<iframe src="bad">',sku:'A&B',quantity:1,unit_price:10,line_total:10}]);
 assert.doesNotMatch(html,/<script|<img|<iframe/);assert.match(html,/&lt;script&gt;/);assert.match(html,/A&amp;B/);
});
test('historical invoices do not invent a parts or labor breakdown',()=>{
 const html=invoiceDocument({id:1,work_order_id:2,amount:25,collected:0,status:'Issued'},undefined,[]);
 assert.match(html,/historical invoice has no stored itemized breakdown/);assert.match(html,/Total: \$25.00/);
});
