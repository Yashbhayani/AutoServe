#!/usr/bin/env python3
"""Owned local processes for interactive testing; no live database configuration is loaded."""
from pathlib import Path
import os,subprocess,socket,time,json,datetime,re
ROOT=Path(__file__).resolve().parents[2];OUT=ROOT/'TEST/evidence/browser';OUT.mkdir(parents=True,exist_ok=True)
JAVA=Path('/Library/Java/JavaVirtualMachines/temurin-25.jdk/Contents/Home/bin');CP=(ROOT/'TEST/harness/classpath.txt').read_text().strip();BUILD=ROOT/'TEST/harness/build'
def free_port():
 with socket.socket() as s:s.bind(('127.0.0.1',0));return s.getsockname()[1]
bp,fp=free_port(),free_port();env=os.environ.copy();env.update(API_PROXY_TARGET=f'http://127.0.0.1:{bp}',VITE_API_BASE_URL='/api')
backend=None;vite=None
log=(OUT/'backend.log').open('w');vlog=(OUT/'frontend.log').open('w')
def start():
 global backend
 backend=subprocess.Popen([str(JAVA/'java'),'-Dspring.devtools.restart.enabled=false','-cp',str(BUILD)+os.pathsep+CP,'IsolatedServer',str(bp),str(OUT/'database-snapshot.json')],cwd=ROOT,stdin=subprocess.PIPE,stdout=log,stderr=subprocess.STDOUT,text=True)
 time.sleep(3)
 if backend.poll() is not None:raise RuntimeError('Backend did not start; see browser/backend.log')
def stop_backend():
 if backend and backend.poll() is None:backend.terminate();backend.wait(timeout=15)
try:
 subprocess.run([str(JAVA/'javac'),'-cp',CP,'-d',str(BUILD),str(ROOT/'TEST/harness/IsolatedServer.java')],check=True,stdout=(OUT/'compile.log').open('w'),stderr=subprocess.STDOUT)
 start()
 vite=subprocess.Popen(['node',str(ROOT/'Frontend/node_modules/vite/bin/vite.js'),'--host','127.0.0.1','--port',str(fp),'--strictPort'],cwd=ROOT/'Frontend',env=env,stdout=vlog,stderr=subprocess.STDOUT)
 metadata={'url':f'http://127.0.0.1:{fp}','backendPort':bp,'frontendPort':fp,'database':'isolated H2 only','backendPid':backend.pid,'frontendPid':vite.pid,'startedUtc':datetime.datetime.now(datetime.timezone.utc).isoformat()}
 (OUT/'environment.json').write_text(json.dumps(metadata,indent=2)+'\n');print(json.dumps(metadata),flush=True)
 for command in __import__('sys').stdin:
  command=command.strip()
  if command=='dump':backend.stdin.write('dump\n');backend.stdin.flush();print('Requested isolated database snapshot',flush=True)
  elif command=='stop-backend':stop_backend();print('Owned backend stopped',flush=True)
  elif command=='start-backend':start();print('Owned backend restarted',flush=True)
  elif command=='stop':break
finally:
 stop_backend()
 if vite and vite.poll() is None:vite.terminate();vite.wait(timeout=15)
 log.close();vlog.close()
 p=OUT/'backend.log'
 if p.exists():p.write_text(re.sub(r'Using generated security password: [^\n]+','Using generated security password: [REDACTED]',p.read_text()))
 (OUT/'cleanup.json').write_text(json.dumps({'backendStopped':backend is None or backend.poll() is not None,'frontendStopped':vite is None or vite.poll() is not None},indent=2)+'\n')
 print('Owned browser-test environment stopped',flush=True)
