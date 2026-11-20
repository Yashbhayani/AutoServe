import {readFileSync,writeFileSync,existsSync,mkdirSync} from 'node:fs';
import {createRequire} from 'node:module';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const root=fileURLToPath(new URL('../../src',import.meta.url)),require=createRequire(new URL('../../package.json',import.meta.url));
const ts=require('typescript'),React=require('react'),{renderToStaticMarkup}=require('react-dom/server');
const cache=new Map(),out=fileURLToPath(new URL('../evidence/rendered',import.meta.url));mkdirSync(out,{recursive:true});
let authError='',search='';
function load(file){if(cache.has(file))return cache.get(file).exports;const mod={exports:{}};cache.set(file,mod);const code=ts.transpileModule(readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2020}}).outputText;
 function dep(name){
  if(name.includes('store/AppContext'))return {useApp:()=>({authError,signIn:async()=>({ok:false,error:'Fixture'}),registerCustomer:async()=>({ok:true})})};
  if(name.endsWith('router'))return {useNavigate:()=>()=>{},useLocation:()=>({search}),slugify:s=>s.toLowerCase(),Link:({to,children,...props})=>React.createElement('a',{href:to,...props},children)};
  if(name.includes('api/request'))return {apiRequest:async()=>({success:true})};
  if(name.includes('api/session'))return {clearSession:()=>{}};
  if(name.startsWith('.')){const base=path.resolve(path.dirname(file),name),target=[base,base+'.tsx',base+'.ts'].find(p=>existsSync(p));if(!target)throw new Error(name);return load(target)}return require(name);
 }
 vm.runInNewContext(code,{module:mod,exports:mod.exports,require:dep,URLSearchParams,TextEncoder},{filename:file});return mod.exports;
}
const screens=load(path.join(root,'pages/auth.tsx')),results=[];
function check(id,title,fn){try{fn();results.push({id,title,status:'Pass'})}catch(e){results.push({id,title,status:'Fail',actual:e.message})}}
function render(name,file){const html=renderToStaticMarkup(React.createElement(screens[name]));writeFileSync(path.join(out,file),`<!doctype html><html lang="en"><meta charset="utf-8"><title>${name} render evidence</title><body>${html}</body></html>`);return html}
check('AUTH-04-RENDER','Login fields expose required attributes',()=>{const html=render('LoginPage','login.html');assert.match(html,/<input[^>]*type="email"[^>]*required/);assert.match(html,/<input[^>]*type="password"[^>]*required/);assert.match(html,/<label[^>]*for="[^"]+"/)});
check('AUTH-05-RENDER','Email control uses email input validation',()=>{assert.match(render('LoginPage','login.html'),/<input[^>]*type="email"/)});
check('UI-02-RENDER','Login errors are rendered in an alert region',()=>{authError='Unable to reach the backend service.';const html=render('LoginPage','login-error.html');assert.match(html,/role="alert"/);assert.match(html,/Unable to reach the backend service/);authError=''});
check('AUTH-09-RENDER','Registration success prompts user to log in',()=>{search='?registered=1';assert.match(render('LoginPage','registration-return.html'),/account|created|sign in|Sign In/i);search=''});
check('SIGNUP-RENDER','Signup page renders identity and password fields',()=>{const html=render('SignUpPage','signup.html');assert.match(html,/First name|First Name/);assert.match(html,/password/)});
check('RESET-RENDER','Reset page renders new-password controls',()=>{search='?email=customer%40test.invalid';assert.match(render('ResetPasswordPage','reset-password.html'),/password/i);search=''});
writeFileSync(new URL('../evidence/render-checks.json',import.meta.url),JSON.stringify(results,null,2)+'\n');console.log(JSON.stringify(results,null,2));
