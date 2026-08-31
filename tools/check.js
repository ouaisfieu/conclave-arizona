/* Vérification interne : liens relatifs, JSON-LD, doublons de titres. */
const fs=require('fs'),path=require('path');
const ROOT=path.resolve(__dirname,'..');
function walk(d,out=[]){for(const f of fs.readdirSync(d)){const p=path.join(d,f);const s=fs.statSync(p);
 if(s.isDirectory()){ if(!['.git','node_modules','data','tools'].includes(f)) walk(p,out);} else if(f.endsWith('.html')) out.push(p);} return out;}
const files=walk(ROOT);
let bad=0, titles=new Map(), descs=new Map();
for(const f of files){
  const html=fs.readFileSync(f,'utf8');
  const dir=path.dirname(f);
  // titres / descriptions uniques
  const t=(html.match(/<title>([^<]*)<\/title>/)||[])[1];
  const d=(html.match(/<meta name="description" content="([^"]*)"/)||[])[1];
  if(t){ titles.set(t,(titles.get(t)||0)+1); }
  if(!d||d.length<60){ console.log('DESC courte/absente:',path.relative(ROOT,f)); bad++; }
  if(d) descs.set(d,(descs.get(d)||0)+1);
  // JSON-LD parsable
  const lds=[...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)];
  for(const m of lds){ try{ JSON.parse(m[1].replace(/\\u003c/g,'<')); }catch(e){ console.log('JSON-LD invalide dans',path.relative(ROOT,f),e.message); bad++; } }
  // liens relatifs
  const links=[...html.matchAll(/(?:href|src)="([^"#:]+?)"/g)].map(m=>m[1]);
  for(let l of links){
    if(l.startsWith('http')||l.startsWith('data:')||l.startsWith('mailto:')||l.startsWith('//'))continue;
    let q=l.split('?')[0]; if(!q)continue;
    let target=path.resolve(dir,q);
    if(q.endsWith('/')) target=path.join(target,'index.html');
    if(!fs.existsSync(target)){ console.log('LIEN CASSÉ:',path.relative(ROOT,f),'->',l); bad++; }
  }
}
for(const [t,n] of titles) if(n>1){ console.log('TITRE DUPLIQUÉ x'+n+':',t); bad++; }
for(const [d,n] of descs) if(n>1){ console.log('DESCRIPTION DUPLIQUÉE x'+n+':',d.slice(0,70)); bad++; }
console.log(files.length+' fichiers HTML vérifiés — '+bad+' problème(s).');
