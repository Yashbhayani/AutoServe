#!/usr/bin/env python3
"""Runs existing application tests without editing backend sources/configuration."""
from pathlib import Path
import subprocess,os,time,json,re,xml.etree.ElementTree as ET
ROOT=Path(__file__).resolve().parents[1];OUT=ROOT/'TEST/evidence';OUT.mkdir(exist_ok=True)
env=os.environ.copy();env['JAVA_HOME']='/Library/Java/JavaVirtualMachines/temurin-25.jdk/Contents/Home'
secrets=[]
for file in (ROOT/'Backend/.env',ROOT/'Frontend/.env'):
 if file.exists():
  for line in file.read_text().splitlines():
   if '=' in line and not line.lstrip().startswith('#'):
    k,v=line.split('=',1)
    if any(s in k.upper() for s in ['PASSWORD','SECRET','TOKEN','USERNAME','DB_URL']):
     v=v.strip().strip('"\'')
     if len(v)>3:secrets.append(v)
def sanitize(text):
 for secret in secrets:text=text.replace(secret,'[REDACTED]')
 return re.sub(r'Using generated security password: [^\n]+','Using generated security password: [REDACTED]',text)
steps=[('frontend-unit-render',ROOT/'Frontend',['node','--experimental-strip-types','--test','--test-reporter=tap',*[str(p.relative_to(ROOT/'Frontend')) for p in sorted((ROOT/'Frontend/tests').glob('*.test.mjs'))]]),('typescript',ROOT/'Frontend',['npx','--no-install','tsc','--noEmit']),('frontend-build',ROOT/'Frontend',['npm','run','build']),('backend-tests',ROOT/'Backend',['mvn','-B','-ntp','test'])]
results=[]
for name,cwd,cmd in steps:
 print('Running '+name,flush=True);t=time.monotonic()
 try:
  proc=subprocess.run(cmd,cwd=cwd,env=env,stdout=subprocess.PIPE,stderr=subprocess.STDOUT,text=True,timeout=240)
  code=proc.returncode;output=proc.stdout
 except subprocess.TimeoutExpired as e:code=124;output=str(e.stdout or '')+'\nTimed out after 240 seconds.'
 (OUT/(name+'.log')).write_text(sanitize(output))
 results.append(dict(name=name,exitCode=code,status='PASS' if code==0 else 'FAIL',seconds=round(time.monotonic()-t,2),command=cmd))
 print(name+': '+results[-1]['status'],flush=True)
# Only collect fresh XML files corresponding to current test source classes.
junit=OUT/'junit';junit.mkdir(exist_ok=True)
for src in (ROOT/'Backend/src/test/java').rglob('*Tests.java'):
 file=ROOT/'Backend/target/surefire-reports'/('TEST-com.example.DevAutoServ.'+src.stem+'.xml')
 if not file.exists():continue
 tree=ET.parse(file);root=tree.getroot()
 props=root.find('properties')
 if props is not None:
  cp=next((p.get('value') for p in props if p.get('name')=='java.class.path'),None)
  if cp:(ROOT/'TEST/harness/classpath.txt').write_text(cp)
  root.remove(props)
 for child in root:
  if child.text:child.text=sanitize(child.text)
 tree.write(junit/file.name,encoding='utf-8',xml_declaration=True)
(OUT/'automated-runs.json').write_text(json.dumps(results,indent=2)+'\n')
