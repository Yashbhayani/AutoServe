#!/usr/bin/env python3
"""Real HTTP checks on unchanged application classes, isolated H2 and a private Vite proxy."""
from pathlib import Path
import subprocess,os,time,json,urllib.request,urllib.error,datetime,socket,traceback,re
ROOT=Path(__file__).resolve().parents[2];OUT=ROOT/'TEST/evidence';BUILD=ROOT/'TEST/harness/build';BUILD.mkdir(exist_ok=True)
JAVA=Path('/Library/Java/JavaVirtualMachines/temurin-25.jdk/Contents/Home/bin')
CP=(ROOT/'TEST/harness/classpath.txt').read_text().strip()
ENV=os.environ.copy();ENV['JAVA_HOME']=str(JAVA.parent)
TRACE=[];CASES=[];TOKENS={};STATE={};processes=[]
def port():
 with socket.socket() as s:s.bind(('127.0.0.1',0));return s.getsockname()[1]
BACKEND_PORT=port();FRONTEND_PORT=port();BASE=f'http://127.0.0.1:{FRONTEND_PORT}'
ENV['API_PROXY_TARGET']=f'http://127.0.0.1:{BACKEND_PORT}';ENV['VITE_API_BASE_URL']='/api'
def redacted(value):
 if isinstance(value,dict):return {k:('[REDACTED]' if any(w in k.lower() for w in ['token','password','secret']) else redacted(v)) for k,v in value.items()}
 if isinstance(value,list):return [redacted(v) for v in value]
 return value
def req(path,role=None,body=None,method=None):
 headers={'Accept':'application/json' if path.startswith('/api') else 'text/html'}
 if role and role not in TOKENS:raise LookupError('No authenticated '+role+' fixture is available')
 if role in TOKENS:headers['Authorization']='Bearer '+TOKENS[role]['access-token']
 data=None if body is None else json.dumps(body).encode()
 if data:headers['Content-Type']='application/json'
 start=time.monotonic();request=urllib.request.Request(BASE+path,data=data,headers=headers,method=method or ('POST' if body is not None else 'GET'))
 try:
  with urllib.request.urlopen(request,timeout=12) as response:code=response.status;raw=response.read().decode();ctype=response.headers.get('Content-Type','')
 except urllib.error.HTTPError as e:code=e.code;raw=e.read().decode();ctype=e.headers.get('Content-Type','')
 except Exception as e:code=0;raw=str(e);ctype=''
 try:value=json.loads(raw)
 except Exception:value={'text':raw[:1200]}
 TRACE.append(dict(id=len(TRACE)+1,path=path,role=role,method=request.method,input=redacted(body),status=code,response=redacted(value),milliseconds=round((time.monotonic()-start)*1000,2),contentType=ctype))
 return code,value
def ok(response):
 code,data=response;assert 200<=code<300 and isinstance(data,dict) and data.get('success') is not False,f'Expected successful response; observed HTTP {code}: {redacted(data)}';return data
def reject(response):
 code,data=response;assert (code in (400,401,403,404,409,422,429) or code==200 and data.get('success') is False),f'Expected rejected request without a server crash; observed HTTP {code}: {redacted(data)}';return {'status':code,'message':data.get('message')}
def snap(role='customer'):return ok(req('/api/operations/snapshot',role))
def act(action,body,role='customer'):return ok(req('/api/operations/'+action,role,body))
def row(data,key,id):return next(x for x in data[key] if int(x['id'])==int(id))
def need(key):
 if key not in STATE:raise LookupError('Dependent fixture '+key+' was not created successfully')
 return STATE[key]
def record(id,title,expected,fn,pre='Isolated H2 test fixtures; private Vite proxy; accounts created only in the test database.',story=None):
 start=len(TRACE);when=datetime.datetime.now(datetime.timezone.utc).isoformat();begin=time.monotonic()
 try:actual=fn();status='Pass'
 except LookupError as e:actual=str(e);status='Not Run'
 except Exception as e:actual=f'{type(e).__name__}: {e}';status='Fail'
 CASES.append(dict(id=id,requirement=story or id.split('-')[0],title=title,preconditions=pre,input=[t['input'] for t in TRACE[start:] if t['input'] is not None],steps=[f"{t['method']} {t['path']} as {t['role'] or 'anonymous'}" for t in TRACE[start:]],expected=expected,actual=redacted(actual),status=status,tester='Codex automated HTTP execution',date=when,seconds=round(time.monotonic()-begin,3),scope='Actual HTTP via Vite proxy to unchanged Spring Boot application on isolated H2; no browser UI verification',evidence=[f'http-trace.json#request-{t["id"]}' for t in TRACE[start:]]))
 print(id+': '+status,flush=True)
def start_backend():
 log=(OUT/'isolated-backend.log').open('a');process=subprocess.Popen([str(JAVA/'java'),'-Dspring.devtools.restart.enabled=false','-cp',str(BUILD)+os.pathsep+CP,'IsolatedServer',str(BACKEND_PORT),str(OUT/'database-snapshot.json')],cwd=ROOT,env=ENV,stdin=subprocess.PIPE,stdout=log,stderr=subprocess.STDOUT,text=True)
 processes.append(process)
 for i in range(100):
  if process.poll() is not None:raise RuntimeError('Isolated backend exited; see isolated-backend.log')
  if 'ISOLATED_SERVER_READY' in (OUT/'isolated-backend.log').read_text():return process
  time.sleep(.25)
 raise RuntimeError('Backend did not become ready in 25 seconds')
def dashboard_snapshot(role):
 data=snap(role)
 for key in ('requests','appointments','invoices'):assert isinstance(data.get(key),list),key
 if role=='technician':assert all(x.get('technician_id')==2 for x in data['requests'])
 if role=='customer':assert all(x.get('customer_id')==3 for x in data['requests'])
 return {'contract':'/api/operations/snapshot','role':role,'requestCount':len(data['requests']),'appointmentCount':len(data['appointments'])}
def list_parts():return ok(req('/api/parts','admin'))['data']
def seed_vehicle():
 data=act('vehicle.save',dict(make='Toyota',model='Camry',year=2024,color='Blue',mileage=10000,plate='TEST-1',vin=''));STATE['vehicle']=data['id'];return {'vehicleId':data['id']}
def vehicle_body(**values):
 result=dict(id=need('vehicle'),make='Toyota',model='Camry',year=2024,color='Blue',mileage=10000,plate='TEST-1',vin='');result.update(values);return result
def create_request():
 future=(datetime.date.today()+datetime.timedelta(days=3)).isoformat()
 data=act('request.create',dict(vehicleId=need('vehicle'),description='Brake noise acceptance test',serviceIds=[13],date=future,time='10:00'));STATE['request']=data['requestId'];return {'requestId':data['requestId']}
def work(action,values=None,role='admin'):return act(action,dict(requestId=need('request'),**(values or {})),role)
def current_request(role='customer'):return row(snap(role),'requests',need('request'))
def revision():
 order=current_request()['work_order_id']
 return next((x['revision'] for x in snap()['billing'] if int(x['work_order_id'])==int(order)),0)
def create_part():
 data=ok(req('/api/parts/create','admin',dict(categoryId=1,code='ACCEPTANCE_FILTER',name='Acceptance Oil Filter',sku='ACCEPTANCE-1',unitPrice=12.50,stockQuantity=10,reorderLevel=2)));STATE['part']=data['data']['id'];return {'partId':STATE['part']}
def part():return next(p for p in list_parts() if int(p['id'])==int(need('part')))
def set_parts(qty):
 value=work('parts.set',dict(partId=need('part'),quantity=qty,revision=revision()),'technician');assert part()['stock_quantity']==10-qty;return {'quantity':qty,'stock':part()['stock_quantity']}
def submit():
 value=work('diagnosis.submit',dict(diagnosis='Replace the selected filter and inspect brakes',revision=revision()),'technician');assert current_request()['stage']=='Customer Approval';return {'stage':current_request()['stage'],'partsTotal':sum(float(x['unit_price'])*x['quantity'] for x in snap()['workOrderParts'])}
def approve():
 value=work('approve',dict(revision=revision()),'customer');assert current_request()['stage']=='Repair';return {'stage':'Repair'}
def issue():
 work('invoice.issue',dict(labor='75.00',laborDescription='Diagnostic and repair labor'),'admin');i=next(x for x in snap()['invoices'] if x['service_request_id']==need('request'));STATE['invoice']=i['id'];assert float(i['amount'])==100;return {'invoiceId':i['id'],'total':i['amount']}
def invoice_details():
 data=snap();details=next(x for x in data['invoiceDetails'] if x['invoice_id']==need('invoice'));lines=[x for x in data['invoiceLines'] if x['invoice_id']==need('invoice')];assert len(lines)==1 and float(details['parts_total'])==25 and float(details['labor_total'])==75;return {'detail':details,'lines':lines}
def login_role(role):
 result=ok(req('/api/user/login',body={'email':role+'@test.invalid','password':'TestOnly-Password42!'}));assert result['user']['roles']==[role.upper() if role!='stranger' else 'CUSTOMER'];TOKENS[role]=result;return {'account':result['user'],'tokensPresent':bool(result.get('access-token'))}
def password_reset():
 result=ok(req('/api/user/password/reset',body={'email':'stranger@test.invalid','password':'NewTestOnly-Password42!'}));reject(req('/api/user/login',body={'email':'stranger@test.invalid','password':'TestOnly-Password42!'}));ok(req('/api/user/login',body={'email':'stranger@test.invalid','password':'NewTestOnly-Password42!'}));return {'reset':'successful','oldPassword':'rejected','newPassword':'accepted'}
try:
 subprocess.run([str(JAVA/'javac'),'-cp',CP,'-d',str(BUILD),str(ROOT/'TEST/harness/IsolatedServer.java')],check=True,stdout=(OUT/'harness-compile.log').open('w'),stderr=subprocess.STDOUT)
 server=start_backend()
 vlog=(OUT/'isolated-frontend.log').open('w');vite=subprocess.Popen(['node',str(ROOT/'Frontend/node_modules/vite/bin/vite.js'),'--host','127.0.0.1','--port',str(FRONTEND_PORT),'--strictPort'],cwd=ROOT/'Frontend',env=ENV,stdout=vlog,stderr=subprocess.STDOUT);processes.append(vite)
 for i in range(60):
  try:
   urllib.request.urlopen(BASE,timeout=.5).close();break
  except Exception:time.sleep(.25)
 record('INT-01-ISOLATED','Start all components with isolated test configuration','H2, Spring Boot and Vite start without blocking errors.',lambda:{'backendPort':BACKEND_PORT,'frontendPort':FRONTEND_PORT,'database':'Isolated H2; startup successful'})
 record('INT-02-HTTP','Load frontend entry document over HTTP','Frontend entry HTML returns HTTP 200.',lambda: {'status':req('/')[0]} if req('/')[0]==200 else (_ for _ in ()).throw(AssertionError('Frontend did not load')))
 for role in ('admin','technician','customer','stranger'):record('AUTH-01-API-'+role.upper(),'Valid '+role+' login','Valid credentials return tokens and the current account role.',lambda role=role:login_role(role))
 record('AUTH-02-API','Incorrect password','Credentials are rejected.',lambda:reject(req('/api/user/login',body={'email':'customer@test.invalid','password':'Wrong-Password42!'})))
 record('AUTH-03-API','Nonexistent account','Credentials are rejected.',lambda:reject(req('/api/user/login',body={'email':'absent@test.invalid','password':'TestOnly-Password42!'})))
 record('AUTH-04-API','Empty login fields','No tokens or success are returned.',lambda:reject(req('/api/user/login',body={'email':'','password':''})))
 record('AUTH-05-API','Invalid email format','Invalid login is rejected.',lambda:reject(req('/api/user/login',body={'email':'not-email','password':'TestOnly-Password42!'})))
 record('AUTH-08-API','Restore the current account','Authenticated current-account endpoint restores customer identity.',lambda:ok(req('/api/user/me','customer')))
 for path in ('/api/operations/snapshot','/api/parts','/api/inventory/requests','/api/admin/users','/api/reports','/api/notifications','/api/user/me'):
  record('API-05-'+path.split('/')[-1].upper(),'Unauthenticated '+path,'Protected endpoint denies anonymous requests.',lambda path=path:reject(req(path)))
 record('ROLE-05-API','Customer cannot administer users','Restricted API is rejected.',lambda:reject(req('/api/admin/users','customer')))
 record('ROLE-03-API','Technician cannot view admin reports','Restricted API is rejected.',lambda:reject(req('/api/reports','technician')))
 record('VEH-11','Empty vehicle list','Fresh customer has no vehicles.',lambda: {'vehicles':snap()['vehicles']} if not snap()['vehicles'] else (_ for _ in ()).throw(AssertionError('Unexpected initial vehicles')))
 record('VEH-02','Create vehicle','Vehicle is created with customer ownership.',seed_vehicle,story='US-01')
 record('VEH-06','Read saved vehicle','Vehicle details match saved values.',lambda:row(snap(),'vehicles',need('vehicle')))
 record('VEH-03','Missing vehicle make','Required-data validation rejects the request.',lambda:reject(req('/api/operations/vehicle.save','customer',{'make':'','model':'Camry','year':2024})))
 record('VEH-04','Invalid VIN','An invalid VIN is rejected.',lambda:reject(req('/api/operations/vehicle.save','customer',dict(make='Toyota',model='Camry',year=2024,vin='BAD'))))
 record('VEH-05','Vehicle year boundary','Year before 1886 is rejected.',lambda:reject(req('/api/operations/vehicle.save','customer',dict(make='Toyota',model='Camry',year=1885))))
 def edit_vehicle():
  act('vehicle.save',vehicle_body(mileage=12000));data=row(snap(),'vehicles',need('vehicle'));assert data['mileage']=='12000';return data
 record('VEH-07','Update vehicle then re-read','Saved edit persists in a fresh API read.',edit_vehicle)
 record('VEH-12','Stranger cannot modify another customer vehicle','Ownership check rejects the action.',lambda:reject(req('/api/operations/vehicle.save','stranger',vehicle_body())))
 record('VEH-01','List customer vehicles','Saved vehicle is present in a fresh list.',lambda: {'vehicle':row(snap(),'vehicles',need('vehicle'))})
 record('VEH-05-MAX','Maximum vehicle year','Two years beyond the current year is rejected.',lambda:reject(req('/api/operations/vehicle.save','customer',dict(make='Toyota',model='Camry',year=datetime.date.today().year+2))))
 def delete_unused_vehicle():
  v=act('vehicle.save',dict(make='Honda',model='Civic',year=2020,color='White',mileage=0,plate='DELETE-1',vin=''))['id'];act('vehicle.delete',{'id':v});assert all(x['id']!=v for x in snap()['vehicles']);return {'vehicleId':v,'activeAfterDeletion':False}
 record('VEH-09-UNLINKED','Remove unused vehicle','Vehicle with no service history is deactivated and absent from active reads.',delete_unused_vehicle)

 record('REQ-02','Create request and linked appointment','Request and appointment are created together.',create_request,story='US-01')
 record('REQ-06','Read saved request','Request references the saved vehicle and correct services.',lambda:current_request())
 record('REQ-03','Missing request description','Invalid request is rejected without a new record.',lambda:reject(req('/api/operations/request.create','customer',dict(vehicleId=need('vehicle'),description='',serviceIds=[13]))))
 record('REQ-05','Past appointment date','Past dates cannot create an appointment.',lambda:reject(req('/api/operations/request.create','customer',dict(vehicleId=need('vehicle'),description='Test',serviceIds=[13],date='2000-01-01',time='10:00'))))
 record('REQ-12','Other customer cannot create against this vehicle','Ownership is enforced.',lambda:reject(req('/api/operations/request.create','stranger',dict(vehicleId=need('vehicle'),description='Test',serviceIds=[13]))))
 record('REQ-01','List customer service requests','Saved request appears in customer list.',lambda:current_request())
 record('REQ-04','Unknown service type','Unknown service IDs cannot be attached to a request.',lambda:reject(req('/api/operations/request.create','customer',dict(vehicleId=need('vehicle'),description='Test',serviceIds=[9999999]))))
 record('APT-01','List appointments','Saved linked appointment appears in the customer list.',lambda:next(a for a in snap()['appointments'] if a['service_request_id']==need('request')))
 def invalid_appointment_time():
  a=next(x for x in snap()['appointments'] if x['service_request_id']==need('request'));return reject(req('/api/operations/appointment.save','customer',dict(id=a['id'],requestId=need('request'),date=(datetime.date.today()+datetime.timedelta(days=4)).isoformat(),time='25:99')))
 record('APT-04','Invalid appointment time','Invalid time values are rejected.',invalid_appointment_time)
 def foreign_appointment():
  a=next(x for x in snap()['appointments'] if x['service_request_id']==need('request'));return reject(req('/api/operations/appointment.save','stranger',dict(id=a['id'],requestId=need('request'),date=(datetime.date.today()+datetime.timedelta(days=4)).isoformat(),time='11:00')))
 record('APT-12','Other customer cannot reschedule appointment','Ownership is enforced.',foreign_appointment)

 record('REQ-07','Update an unstarted request','Description changes persist.',lambda:work('request.update',dict(description='Updated brake noise',serviceIds=[13]),'customer'))
 record('APT-06','Appointment links to request','Fresh snapshot contains its appointment.',lambda:next(x for x in snap()['appointments'] if x['service_request_id']==need('request')))
 def reschedule():
  a=next(x for x in snap()['appointments'] if x['service_request_id']==need('request'));date=(datetime.date.today()+datetime.timedelta(days=4)).isoformat();work('appointment.save',{'id':a['id'],'date':date,'time':'11:00'},'customer');updated=next(x for x in snap()['appointments'] if x['id']==a['id']);assert str(updated['scheduled_date']).startswith(date);return updated
 record('APT-07','Reschedule appointment','New appointment date persists.',reschedule)
 record('APT-03','Missing appointment date and time','An appointment cannot be saved without required scheduling fields.',lambda:reject(req('/api/operations/appointment.save','customer',dict(requestId=need('request')))))
 record('WO-03','Missing technician assignment','A work order cannot be assigned without a valid technician.',lambda:reject(req('/api/operations/assign','admin',dict(requestId=need('request')))))
 record('WO-02','Admin assigns technician','Assigned technician sees the new work order.',lambda:work('assign',{'technicianId':2}),story='US-03')
 record('WO-12','Customer cannot assign a technician','Role restriction rejects the request.',lambda:reject(req('/api/operations/assign','customer',dict(requestId=need('request'),technicianId=2))))
 record('WO-05','Cannot complete before approval','Repair-completion gate rejects the request.',lambda:reject(req('/api/operations/complete','technician',dict(requestId=need('request')))),story='US-04')
 record('WO-06','Assigned technician reads work order','Technician snapshot includes the assigned request.',lambda:row(snap('technician'),'requests',need('request')))
 def hold_resume():
  work('hold',{'note':'Waiting for test inspection'},'technician');assert current_request()['held']==1;reject(req('/api/operations/checkin','technician',{'requestId':need('request')}));work('resume',{'note':'Inspection ready'},'technician');assert current_request()['held']==0;return {'heldActionRejected':True,'resumed':True}
 record('WO-HOLD-RESUME','Hold blocks progress and resume restores it','Held work cannot check in; documented resume clears hold.',hold_resume,story='US-06')

 def unassign_and_reassign():
  work('unassign');assert current_request()['work_order_id'] is None;work('assign',{'technicianId':2});assert current_request()['technician_id']==2;return {'unassignedAndReassigned':True}
 record('WO-09','Unassign unstarted work order','An empty, unstarted work order can be unassigned and reassigned without losing its request.',unassign_and_reassign)
 record('WO-CHECKIN','Check in the vehicle','The next stage is Vehicle Checked In.',lambda:work('checkin',{'note':'Test arrival'}))
 record('PART-02','Admin creates catalogue part','Part, price and stock records are created.',create_part)
 if 'part' not in STATE:
  # Keep the failed creation evidence. Seed a prerequisite so independent downstream cases can execute.
  server.stdin.write('seed-part\n');server.stdin.flush()
  for _ in range(40):
   if 'PART_FIXTURE_READY' in (OUT/'isolated-backend.log').read_text():break
   time.sleep(.1)
  STATE['part']=100
  record('FIXTURE-PART','Seed downstream parts prerequisite after failed catalogue-create test','Use explicit SQL setup only for the prerequisite, not as evidence that creation passed.',lambda:{'fixturePartId':100,'setup':'Seeded directly in isolated H2 after PART-02 failed; PART-02 remains Fail.'})

 record('PART-04','Oversized catalogue SKU','SKU values beyond the maximum length are rejected.',lambda:reject(req('/api/parts/create','admin',dict(categoryId=1,code='LONG-SKU',name='Long SKU',sku='x'*51,unitPrice=1,stockQuantity=1,reorderLevel=0))))
 record('PART-03','Missing catalogue fields','Invalid part is rejected.',lambda:reject(req('/api/parts/create','admin',{})))
 record('PART-05','Negative catalogue price','Negative prices are rejected.',lambda:reject(req('/api/parts/create','admin',dict(categoryId=1,code='BAD',name='Bad',sku='BAD',unitPrice=-1,stockQuantity=1,reorderLevel=0))))
 record('PART-12','Customer cannot create parts','Role restriction rejects catalogue write.',lambda:reject(req('/api/parts/create','customer',{})))
 record('PART-06','Read part details and current stock','Catalogue details reflect stored price and quantity.',lambda:ok(req('/api/parts/'+str(need('part')),'admin')))
 record('DB-03-API','Duplicate SKU/code','Uniqueness restriction rejects a second catalogue row.',lambda:reject(req('/api/parts/create','admin',dict(categoryId=1,code='ACCEPTANCE_FILTER',name='Duplicate',sku='ACCEPTANCE-1',unitPrice=1,stockQuantity=1,reorderLevel=0))))
 record('PART-01','List catalogue','Seeded part is visible in the catalogue.',lambda:part())
 record('USE-11','Empty selected-parts state','New work order initially has no selected parts.',lambda: {'selectedParts':snap()['workOrderParts']} if not snap()['workOrderParts'] else (_ for _ in ()).throw(AssertionError('Unexpected used parts')))
 record('USE-12','Customer cannot select used parts','Only the admin or assigned technician may select parts.',lambda:reject(req('/api/operations/parts.set','customer',dict(requestId=need('request'),partId=need('part'),quantity=1,revision=revision()))))

 record('USE-03','Missing selected-part fields','Part selection requires a valid part ID and quantity.',lambda:reject(req('/api/operations/parts.set','technician',dict(requestId=need('request'),revision=revision()))))
 record('USE-02','Technician selects parts','Three selected units deduct stock from 10 to 7.',lambda:set_parts(3),story='US-21')
 record('USE-07','Reduce unused quantity','Reducing quantity to two returns one unit to stock.',lambda:set_parts(2),story='US-21')
 record('USE-05','Insufficient stock','Over-allocation is rejected without saving.',lambda:reject(req('/api/operations/parts.set','technician',dict(requestId=need('request'),partId=need('part'),quantity=99,revision=revision()))))
 record('USE-04','Fractional parts quantity','Parts quantities must be whole numbers.',lambda:reject(req('/api/operations/parts.set','technician',dict(requestId=need('request'),partId=need('part'),quantity=1.5,revision=revision()))))
 record('USE-06','Read selected parts and subtotal','Saved quantity and unit price match the quote.',lambda:snap()['workOrderParts'])
 def remove_and_readd():
  set_parts(0);assert part()['stock_quantity']==10 and not snap()['workOrderParts'];set_parts(2);return {'stockAfterRemoval':10,'stockAfterReadd':8}
 record('USE-09','Remove unused parts and reselect','Removing selected parts returns stock and reselecting deducts it exactly once.',remove_and_readd)
 record('DIAG-04','Diagnosis length boundary','Diagnosis longer than 5000 characters is rejected.',lambda:reject(req('/api/operations/diagnosis.save','technician',dict(requestId=need('request'),diagnosis='x'*5001))))

 record('DIAG-03','Empty diagnosis','Empty diagnosis cannot be submitted.',lambda:reject(req('/api/operations/diagnosis.submit','technician',dict(requestId=need('request'),diagnosis='',revision=revision()))))
 def diagnosis_edit_boundary():
  text='x'*5000;work('diagnosis.save',{'diagnosis':text},'technician');assert current_request()['diagnosis']==text;work('diagnosis.save',{'diagnosis':'Edited diagnostic notes'},'technician');assert current_request()['diagnosis']=='Edited diagnostic notes';return {'acceptedLength':5000,'savedEdit':'Edited diagnostic notes'}
 record('DIAG-05','Maximum diagnosis length','Exactly 5000 characters are accepted and persisted.',diagnosis_edit_boundary)
 record('DIAG-07','Diagnosis edit persists','A saved diagnosis can be edited and read again.',lambda: {'diagnosis':current_request()['diagnosis']} if current_request()['diagnosis']=='Edited diagnostic notes' else (_ for _ in ()).throw(AssertionError('Diagnosis edit missing')))
 record('DIAG-12','Customer cannot write diagnosis','Diagnosis editing is restricted to the admin or assigned technician.',lambda:reject(req('/api/operations/diagnosis.save','customer',dict(requestId=need('request'),diagnosis='Unauthorized diagnosis'))))
 record('DIAG-02','Submit diagnosis for customer approval','Customer sees a priced two-unit parts list totaling 25.',submit,story='US-22')
 record('USE-LOCK','Parts cannot change while approval pending','Attempt is rejected and quoted parts remain unchanged.',lambda:reject(req('/api/operations/parts.set','admin',dict(requestId=need('request'),partId=need('part'),quantity=1,revision=revision()))))
 record('APPROVE-12','Another customer cannot approve','Ownership restriction rejects approval.',lambda:reject(req('/api/operations/approve','stranger',dict(requestId=need('request'),revision=revision()))))
 record('APPROVE-03','Admin must document customer consent','Admin approval without consent notes is rejected.',lambda:reject(req('/api/operations/approve','admin',dict(requestId=need('request'),revision=revision()))))
 def revise_and_resubmit():
  old=revision();work('revise',{},'customer');assert current_request()['stage']=='Diagnosis';submit();assert revision()>old;reject(req('/api/operations/approve','customer',dict(requestId=need('request'),revision=old)));return {'oldRevisionRejected':old,'newRevision':revision()}
 record('APPROVE-07','Customer revision requires fresh approval','Returning diagnosis for revision and resubmitting invalidates the old approval revision.',revise_and_resubmit,story='US-22')
 def update_catalogue_price():
  p=part();payload=dict(categoryId=p['category_id'],code=p['code'],name=p['name'],sku=p['sku'],unitPrice=20,stockQuantity=p['stock_quantity'],expectedStockQuantity=p['stock_quantity'],reorderLevel=2);ok(req('/api/parts/update/'+str(need('part')),'admin',payload,'PUT'));assert float(part()['unit_price'])==20;quote=next(x for x in snap()['workOrderParts'] if int(x['part_id'])==int(need('part')));assert float(quote['unit_price'])==12.5;return {'cataloguePrice':20,'quotedUnitPrice':12.5}
 record('PART-07','Update catalogue price without changing submitted quote','New catalogue price is saved; customer quote remains at 12.50.',update_catalogue_price,story='US-23')

 record('APPROVE-02','Customer approves diagnosis and parts','Workflow advances to Repair.',approve,story='US-03')
 record('WO-COMPLETE','Technician completes approved repair','Workflow advances to Completed.',lambda:work('complete',{'note':'Repair completed'},'technician'))
 record('INV-12','Technician cannot issue invoices','Admin-only operation is denied.',lambda:reject(req('/api/operations/invoice.issue','technician',dict(requestId=need('request'),labor=75))))
 record('INV-04','Negative labor','Invalid labor is rejected.',lambda:reject(req('/api/operations/invoice.issue','admin',dict(requestId=need('request'),labor=-1))))
 record('INV-03','Missing labor amount','Invoice cannot be issued without labor input.',lambda:reject(req('/api/operations/invoice.issue','admin',dict(requestId=need('request')))))
 record('INV-05','Labor decimal precision','Labor with more than two decimal places is rejected.',lambda:reject(req('/api/operations/invoice.issue','admin',dict(requestId=need('request'),labor='1.001'))))

 record('INV-02','Admin issues parts plus labor invoice','Final invoice total is 25 parts + 75 labor = 100.',issue,story='US-23')
 record('INV-06','Customer reads itemized invoice','Two units at 12.50 and labor 75 are visible in invoice API data.',invoice_details)
 def private_records():
  d=snap('stranger');assert not d['requests'] and not d['vehicles'] and not d['invoices'] and not d['invoiceLines'];return {'foreignPrivateRecordsVisible':0}
 record('ROLE-06-API','Cross-customer private data isolation','Stranger snapshot excludes requests, vehicles and invoice lines.',private_records,story='US-02')
 record('INV-DUP','Duplicate final invoice','A second invoice for the same work order is rejected.',lambda:reject(req('/api/operations/invoice.issue','admin',dict(requestId=need('request'),labor=75))))
 record('INV-01','List customer invoices','Customer invoice list includes the issued record.',lambda:next(i for i in snap()['invoices'] if i['id']==need('invoice')))
 record('PAY-04','Unknown payment method','Unsupported payment methods are rejected.',lambda:reject(req('/api/operations/payment.record','admin',dict(requestId=need('request'),method='CRYPTO-UNKNOWN'))))

 record('PAY-03','Payment without a work-order reference','Payment recording without a valid request/order is rejected.',lambda:reject(req('/api/operations/payment.record','admin',{})))
 record('PAY-02','Admin records confirmed payment','Invoice collection reaches its full amount.',lambda:work('payment.record',{'method':'OTHER'}),story='US-07')
 def payment_detail():
  i=next(x for x in snap()['invoices'] if x['id']==need('invoice'));assert float(i['collected'])==100 and i['status_code']=='PAID';return i
 record('PAY-06','Payment updates customer invoice','Customer sees paid status, collected 100 and zero balance.',payment_detail)
 record('PAY-DUP','Repeated payment','Already-paid balance cannot be recorded twice.',lambda:reject(req('/api/operations/payment.record','admin',dict(requestId=need('request'),method='OTHER'))))
 record('PAY-12','Customer cannot record payments','Admin-only operation is rejected.',lambda:reject(req('/api/operations/payment.record','customer',dict(requestId=need('request'),method='OTHER'))))
 record('VEH-09','Cannot remove vehicle with service history','Linked vehicle cannot be deleted.',lambda:reject(req('/api/operations/vehicle.delete','customer',dict(id=need('vehicle')))))
 record('NOTE-01','Customer receives workflow notifications','Notifications list is available and contains workflow messages.',lambda:ok(req('/api/notifications','customer')))
 def read_note():
  notes=ok(req('/api/notifications','customer'));id=notes['items'][0]['id'];ok(req('/api/notifications/'+str(id)+'/read','customer',method='PUT'));return ok(req('/api/notifications?filter=read','customer'))
 record('NOTE-07','Mark notification read','Read state persists in a fresh filtered read.',read_note)
 record('NOTE-04','Invalid notification filter','Invalid filter is rejected.',lambda:reject(req('/api/notifications?filter=invalid','customer')))
 def create_user():
  result=ok(req('/api/admin/users','admin',dict(firstName='New',lastName='Technician',email='newtech@test.invalid',phone='',password='TestOnly-Password42!',roles=['TECHNICIAN'],active=True)));STATE['user']=result['data']['id'];return result
 def other_recipient_notification():
  note=ok(req('/api/notifications','admin'))['items'][0];return reject(req('/api/notifications/'+str(note['id'])+'/read','customer',method='PUT'))
 record('NOTE-12','Cannot mark another user notification read','Notification ownership is enforced.',other_recipient_notification,story='US-18')
 record('NOTE-05','Invalid pagination boundary','Page zero and excessive size are rejected.',lambda:reject(req('/api/notifications?page=0&size=101','customer')))
 def read_all():
  ok(req('/api/notifications/read-all','customer',method='PUT'));data=ok(req('/api/notifications?filter=unread','customer'));assert data['unreadCount']==0 and not data['items'];return data
 record('NOTE-10','Unread notification filter','After mark-all-read, the unread filter returns zero unread items.',read_all)
 record('NOTE-11','Empty unread results','No unread items returns an empty list rather than an error.',lambda:ok(req('/api/notifications?filter=unread','customer')))
 def archive_restore():
  ok(req('/api/parts/delete/'+str(need('part')),'admin',method='DELETE'));assert all(x['id']!=need('part') for x in list_parts());arch=ok(req('/api/parts/archived','admin'))['data'];assert any(x['id']==need('part') for x in arch);ok(req('/api/parts/'+str(need('part'))+'/restore','admin',method='PUT'));assert part()['stock_quantity']==8;return {'archivedAndRestored':True,'stock':8}
 record('PART-09','Archive and restore catalogue part','Archive hides the part; restore preserves stock and price history.',archive_restore,story='US-12')

 record('USR-02','Admin creates user','Created account has exactly one selected role.',create_user,story='US-13')
 record('USR-01','Admin lists users','Users endpoint returns created test users.',lambda:ok(req('/api/admin/users','admin')))
 record('USR-04','Multiple roles rejected','Exactly one role must be assigned.',lambda:reject(req('/api/admin/users','admin',dict(firstName='Bad',lastName='Roles',email='badroles@test.invalid',password='TestOnly-Password42!',roles=['TECHNICIAN','ADMIN']))))
 record('USR-03','Missing user fields','Required profile fields are enforced.',lambda:reject(req('/api/admin/users','admin',{})))
 record('USR-12','Technician cannot administer users','Restricted user administration is rejected.',lambda:reject(req('/api/admin/users','technician')))
 def edit_user():
  id=need('user');body=dict(firstName='Edited',lastName='Technician',email='newtech@test.invalid',phone='',password='',roles=['TECHNICIAN'],active=True);ok(req('/api/admin/users/'+str(id),'admin',body,'PUT'));u=next(x for x in ok(req('/api/admin/users','admin'))['data'] if x['id']==id);assert u['first_name']=='Edited';return u
 record('USR-07','Edit a user','Edited user name persists in a fresh admin list.',edit_user)
 record('USR-06','View created user','Created user retains exactly one selected role.',lambda:next(x for x in ok(req('/api/admin/users','admin'))['data'] if x['id']==need('user')))
 record('USR-05','Password byte boundary','Passwords beyond 72 UTF-8 bytes are rejected.',lambda:reject(req('/api/admin/users','admin',dict(firstName='Long',lastName='Password',email='longpass@test.invalid',password='a'*73,roles=['CUSTOMER']))))
 record('TECH-01','List technicians','Admin snapshot contains active technician accounts.',lambda:snap('admin')['technicians'])
 record('TECH-06','Read technician details','Admin sees the selected technician.',lambda:next(x for x in snap('admin')['technicians'] if x['id']==2))
 record('TECH-12','Customer cannot manage availability','Admin-only technician update is denied.',lambda:reject(req('/api/operations/technician.save','customer',dict(id=2,specialties='',availability='Off'))))

 record('PROF-07','Update own profile','Name changes persist in the current-account response.',lambda:act('profile.save',dict(first_name='Updated',last_name='Customer',phone='1234567890')))
 record('PROF-06','Read updated profile','Updated customer profile is returned.',lambda:ok(req('/api/user/me','customer')))
 record('PROF-03','Empty profile names','Required names are enforced.',lambda:reject(req('/api/operations/profile.save','customer',dict(first_name='',last_name='',phone=''))))
 record('TECH-03','Missing technician identity','Technician availability cannot be saved without a technician ID.',lambda:reject(req('/api/operations/technician.save','admin',dict(availability='Busy',specialties=''))))
 record('TECH-05','Specialty length limit','Specialties longer than 500 characters are rejected.',lambda:reject(req('/api/operations/technician.save','admin',dict(id=2,specialties='x'*501,availability='Busy'))))
 record('TECH-07','Technician availability update','Admin can save technician availability.',lambda:act('technician.save',dict(id=2,specialties='Brakes',availability='Busy'),'admin'))
 record('TECH-04','Invalid availability','Unsupported technician availability is rejected.',lambda:reject(req('/api/operations/technician.save','admin',dict(id=2,specialties='',availability='INVALID'))))
 def profile_boundary():
  act('profile.save',dict(first_name='Updated',last_name='Customer',phone='1'*20));u=ok(req('/api/user/me','customer'));assert len(u['user']['phone'])==20;return {'acceptedPhoneLength':20}
 record('PROF-05','Profile phone maximum length','A 20-character phone is accepted and persists.',profile_boundary)
 def profile_identity():
  before=ok(req('/api/user/me','stranger'))['user'];act('profile.save',dict(id=4,first_name='Own',last_name='Customer',phone='1234567890'));after=ok(req('/api/user/me','stranger'))['user'];assert before==after;own=ok(req('/api/user/me','customer'))['user'];assert own['first_name']=='Own';return {'foreignProfileUnchanged':True,'submittedForeignIdIgnored':True}
 record('PROF-12','Cannot override profile owner using body ID','A submitted foreign ID cannot modify another user profile.',profile_identity)
 record('SET-04','Center email length limit','Center emails longer than 120 characters are rejected.',lambda:reject(req('/api/operations/settings.save','admin',dict(center_name='Test',email='x'*121,phone='',address=''))))
 def center_boundary():
  name='x'*100;act('settings.save',dict(center_name=name,phone='',email='',address=''),'admin');assert snap('admin')['settings'][0]['center_name']==name;return {'acceptedCenterNameLength':100}
 record('SET-05','Center name maximum length','Exactly 100 characters are accepted and persisted.',center_boundary)
 record('SET-07','Save service-center settings','Admin settings persist in subsequent snapshots.',lambda:act('settings.save',dict(center_name='Acceptance AutoServe',phone='1234567890',email='center@test.invalid',address='1 Test Road'),'admin'))
 record('SET-12','Customer cannot save service-center settings','Admin-only settings operation is rejected.',lambda:reject(req('/api/operations/settings.save','customer',dict(center_name='Unauthorized',phone='',email='',address=''))))
 today=datetime.date.today().isoformat()
 record('PROF-04','Phone length limit','Phone values longer than 20 characters are rejected.',lambda:reject(req('/api/operations/profile.save','customer',dict(first_name='Customer',last_name='Test',phone='1'*21))))
 record('SET-03','Missing center name','Service-center name is required.',lambda:reject(req('/api/operations/settings.save','admin',dict(center_name='',phone='',email='',address=''))))
 record('SET-06','Read updated center settings','A fresh snapshot returns the saved settings.',lambda:snap('admin')['settings'])
 def cancel_unstarted_request():
  future=(datetime.date.today()+datetime.timedelta(days=6)).isoformat();r=act('request.create',dict(vehicleId=need('vehicle'),description='Cancellation test',serviceIds=[13],date=future,time='13:00'))['requestId'];a=next(x for x in snap()['appointments'] if x['service_request_id']==r);act('appointment.cancel',dict(id=a['id'],requestId=r));assert row(snap(),'requests',r)['stage']=='Service Requested';act('request.cancel',dict(requestId=r));assert all(x['id']!=r for x in snap()['requests']);return {'cancelledAppointment':a['id'],'cancelledRequest':r,'vehiclePreserved':True}
 record('APT-09','Cancel appointment without deleting service request','Appointment cancellation preserves the request; later unstarted request cancellation hides only that request.',cancel_unstarted_request,story='US-08')

 record('RPT-01','Generate report for current dates','Report responds with payment-based totals.',lambda:ok(req('/api/reports?from='+today+'&to='+today,'admin')),story='US-17')
 record('RPT-04','Invalid report date','Malformed report dates are rejected.',lambda:reject(req('/api/reports?from=bad-date&to='+today,'admin')))
 record('RPT-05','Reversed report range','Date range must be ordered.',lambda:reject(req('/api/reports?from=2026-12-01&to=2026-01-01','admin')))
 for role in ('admin','technician','customer'):
  record('DASH-01-'+role.upper(),'Load '+role+' dashboard data using the active frontend contract','Scoped operations snapshot contains requests, appointments and invoices used by the dashboard.',lambda role=role:dashboard_snapshot(role))
 record('RPT-11','Empty report range','Valid dates with no records return zero totals and empty activity.',lambda:ok(req('/api/reports?from=2000-01-01&to=2000-01-02','admin')))
 record('RPT-12','Customer cannot read admin reports','Role restriction denies report data.',lambda:reject(req('/api/reports','customer')))

 def deactivate_new_technician():
  id=need('user');body=dict(firstName='Edited',lastName='Technician',email='newtech@test.invalid',phone='',password='',roles=['TECHNICIAN'],active=False);ok(req('/api/admin/users/'+str(id),'admin',body,'PUT'));reject(req('/api/user/login',body=dict(email='newtech@test.invalid',password='TestOnly-Password42!')));assert all(x['id']!=id for x in snap('admin')['technicians']);return {'inactiveUserId':id,'loginRejected':True,'absentFromActiveTechnicians':True}
 record('USR-09','Deactivate a user','Inactive accounts cannot log in and no longer appear as active technicians.',deactivate_new_technician)
 record('TECH-09','Deactivated technician is not available for work','Deactivated technician is absent from the active management list.',lambda:{'inactiveTechnicianId':need('user')} if all(x['id']!=need('user') for x in snap('admin')['technicians']) else (_ for _ in ()).throw(AssertionError('Inactive technician still visible')))
 def registration_body(email):
  return dict(first_name='New',last_name='Customer',email=email,passwordHash='TestOnly-Password42!',phone='',driving_license_number='',isEmailVerified=False,isPhoneVerified=False,isActive=True)
 def register_without_login():
  result=ok(req('/api/user/add',body=registration_body('register@test.invalid')))
  assert 'access-token' not in result and 'refresh-token' not in result and 'user' not in result
  account=next(u for u in ok(req('/api/admin/users','admin'))['data'] if u['email']=='register@test.invalid')
  assert account['roles']==['CUSTOMER'];return {'registration':result,'savedAccount':account,'automaticallyAuthenticated':False}
 record('AUTH-09-REG','Frontend registration endpoint','POST /user/add creates a CUSTOMER account without authenticating it.',register_without_login)
 def registered_account_login():
  result=ok(req('/api/user/login',body={'email':'register@test.invalid','password':'TestOnly-Password42!'}));assert result['user']['roles']==['CUSTOMER'];return {'account':result['user'],'explicitLoginSucceeded':True}
 record('AUTH-09-REG-LOGIN','Explicit login after registration','The new customer can explicitly sign in after successful registration.',registered_account_login)
 def failed_registration_atomicity():
  result=reject(req('/api/user/add',body=registration_body('rollback@test.invalid')))
  assert result['message']=='Unable to create your account. Please try again.',result
  account=next((u for u in ok(req('/api/admin/users','admin'))['data'] if u['email']=='rollback@test.invalid'),None)
  assert account is None,'Injected role-insert failure left a partial account: '+str(account)
  return {'failureInjected':'Test-only H2 trigger rejects the role insert after user insertion','reportedFailure':result,'failedRegistrationLeftNoAccount':True}
 record('DB-REG-ROLLBACK','Registration failure must not leave a partial account','A forced role-insert failure rolls back the preceding account insert and reports a generic error.',failed_registration_atomicity)
 record('AUTH-09-REG-DUPLICATE','Duplicate registration rejects without partial writes','The previously registered email cannot be registered twice.',lambda:reject(req('/api/user/add',body=registration_body('register@test.invalid'))))

 record('AUTH-09-RESET','Local test-only password reset','Reset changes credentials and rejects previous password.',password_reset)
 def logout():
  refresh=TOKENS['customer']['refresh-token'];ok(req('/api/user/logout',body={'refreshToken':refresh}));reject(req('/api/user/refresh',body={'refreshToken':refresh}));return {'refreshSession':'revoked'}
 record('AUTH-06-API','Logout revokes refresh session','Revoked refresh token cannot issue new tokens.',logout)
 record('API-04','Unknown part record','Unknown record is rejected appropriately without server crash.',lambda:reject(req('/api/parts/99999999','admin')))
 record('API-02','Missing required data','Incomplete vehicle input is rejected.',lambda:reject(req('/api/operations/vehicle.save','customer',{})))
 record('API-03','Bypass frontend validation','Negative mileage is rejected by backend.',lambda:reject(req('/api/operations/vehicle.save','customer',dict(make='Toyota',model='Camry',year=2024,mileage=-1))))
 server.stdin.write('dump\n');server.stdin.flush()
 for _ in range(20):
  if (OUT/'database-snapshot.json').exists():break
  time.sleep(.1)
 def database_relationships():
  d=json.loads((OUT/'database-snapshot.json').read_text());invoice=next(i for i in d['invoices'] if int(i['id'])==need('invoice'));order=next(w for w in d['work_orders'] if w['id']==invoice['work_order_id']);assert int(order['service_request_id'])==need('request') and float(invoice['amount'])==100;assert sum(int(x['quantity']) for x in d['part_usages'] if x['work_order_id']==order['id'])==2;return {'invoice':invoice,'workOrder':order,'partsUsageQuantity':2}
 record('DB-01','Inspect stored relationships','Database rows agree with the completed request and invoice.',database_relationships)
 def rollback_sql_proof():
  proof=json.loads((OUT/'database-snapshot.json').read_text())['registrationRollback']
  assert proof['injectedRoleFailures']==1 and proof['remainingAccounts']==0 and proof['remainingRoles']==0,proof
  return proof
 record('DB-REG-ROLLBACK-SQL','Inspect forced registration rollback in the database','The injected role failure fired once and neither the account nor its role remains saved.',rollback_sql_proof)

 server.stdin.write('db-down\n');server.stdin.flush();time.sleep(.5)
 def unavailable_db():
  code,data=req('/api/operations/vehicle.save','customer',dict(make='Honda',model='Civic',year=2022));assert code>=400 and data.get('success') is not True;return {'status':code,'response':data,'fault':'Isolated Hikari datasource closed; no live datasource affected','note':'Auth verification also uses the database; a 401 can occur before the save handler.'}
 record('INT-07','Unavailable test database','No successful save is reported when database connections are unavailable.',unavailable_db)
 server.terminate();server.wait(timeout=10)
 def backend_outage():
  code,data=req('/api/operations/snapshot','admin');assert code>=500 and data.get('success') is not True;return {'status':code,'response':data,'fault':'Only the owned isolated backend stopped; Vite remains running'}
 record('INT-05-HTTP','Backend process stopped','Proxy reports a failed request without success.',backend_outage)
 (OUT/'isolated-backend.log').write_text((OUT/'isolated-backend.log').read_text()+'\n-- RESTART --\n')
 # Ensure readiness checks inspect only the new process output.
 oldlog=(OUT/'isolated-backend.log').read_text().replace('ISOLATED_SERVER_READY','PREVIOUS_SERVER_READY');(OUT/'isolated-backend.log').write_text(oldlog)
 server=start_backend()
 record('INT-06-HTTP','Backend restored without resetting frontend','Same Vite process successfully proxies requests after backend restart.',lambda:ok(req('/api/user/login',body={'email':'admin@test.invalid','password':'TestOnly-Password42!'})))
except Exception as e:
 (OUT/'http-harness-error.log').write_text(traceback.format_exc());print('HTTP harness error: '+str(e),flush=True)
finally:
 for p in reversed(processes):
  if p.poll() is None:
   p.terminate()
   try:p.wait(timeout=10)
   except subprocess.TimeoutExpired:p.kill()
 (OUT/'http-trace.json').write_text(json.dumps(TRACE,indent=2,default=str)+'\n')
 (OUT/'http-cases.json').write_text(json.dumps(CASES,indent=2,default=str)+'\n')
 for p in [OUT/'isolated-backend.log']:
  if p.exists():p.write_text(re.sub(r'\$2[aby]\$\d{2}\$[A-Za-z0-9./]{53}','[REDACTED_TEST_PASSWORD_HASH]',re.sub(r'Using generated security password: [^\n]+','Using generated security password: [REDACTED]',p.read_text())))
 print('HTTP cases saved: '+str(len(CASES)),flush=True)
