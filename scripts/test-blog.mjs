import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {execFileSync,spawnSync} from 'node:child_process';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const config=JSON.parse(fs.readFileSync(path.join(root,'content/blog.json'),'utf8'));
const run=(dir,args=[])=>execFileSync(process.execPath,['scripts/build-blog.mjs',...args],{cwd:dir,encoding:'utf8'});
run(root,['--check']);
let checks=0;const ok=(x,msg)=>{assert.ok(x,msg);checks++;};
const manifest=JSON.parse(fs.readFileSync(path.join(root,'content/generated-blog.json'),'utf8'));
const decode=s=>s.replace(/&amp;/g,'&').replace(/&#39;/g,"'").replace(/&quot;/g,'"').replace(/&lt;/g,'<').replace(/&gt;/g,'>');
for(const rel of manifest.filter(x=>x.endsWith('.html'))){
 const html=fs.readFileSync(path.join(root,rel),'utf8');
 ok((html.match(/<h1\b/g)||[]).length===1,`${rel}: exactly one H1`);
 ok(/<meta name="description" content="[^"]+"/.test(html),`${rel}: description`);
 ok(html.includes('<meta name="robots" content="index,follow">'),`${rel}: indexable after deployment`);
 const expected=config.origin+'/'+rel.replace(/index\.html$/,'');
 ok(html.includes(`<link rel="canonical" href="${expected}">`),`${rel}: canonical`);
 const schema=JSON.parse(html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1]);
 ok(schema['@type']===(rel==='blog/index.html'?'Blog':'BlogPosting'),`${rel}: schema type`);
 if(schema['@type']==='BlogPosting'){ok(schema.mainEntityOfPage===expected,`${rel}: schema URL`);ok(html.includes(`By ${schema.author.name}`),`${rel}: visible author matches schema`);}
 ok(!/\bundefined\b|\[TODO\]|\[INSERT/.test(html),`${rel}: no unfilled placeholders`);
 for(const m of html.matchAll(/\b(?:href|src)="([^"]+)"/g)){
  const u=decode(m[1]);if(/^(https:|data:|mailto:)/.test(u))continue;
  const [pathname,fragment]=u.split('#');const target=pathname?path.join(root,pathname.replace(/^\//,'')):path.join(root,rel);
  const resolved=fs.existsSync(target)&&fs.statSync(target).isDirectory()?path.join(target,'index.html'):target;
  ok(fs.existsSync(resolved),`${rel}: local target ${u}`);
  if(fragment&&resolved.endsWith('.html')){const dest=fs.readFileSync(resolved,'utf8');ok(dest.includes(`id="${fragment}"`),`${rel}: anchor ${u}`);}
 }
}
for(const name of ['cart-checkout.png','creatine-loading.png']){const p=path.join(root,'assets/blog',name);if(fs.existsSync(p)){const b=fs.readFileSync(p);ok(b.readUInt32BE(16)===1200&&b.readUInt32BE(20)===630,'1200×630 sharing image');}}
const sitemap=fs.readFileSync(path.join(root,'sitemap.xml'),'utf8'),base=fs.readFileSync(path.join(root,'content/base-sitemap.xml'),'utf8');
for(const m of base.matchAll(/<loc>(.*?)<\/loc>/g))ok(sitemap.includes(m[0]),'original sitemap URL preserved');
ok(sitemap.includes(config.origin+'/blog/'),'blog sitemap entry');
ok(!sitemap.includes('/onboarding/'),'onboarding remains excluded');
const home=fs.readFileSync(path.join(root,'index.html'),'utf8');ok(home.includes('href="blog/"'),'homepage blog navigation');
ok(fs.readFileSync(path.join(root,'CNAME'),'utf8').trim()===new URL(config.origin).hostname,'custom domain preserved');
const rss=fs.readFileSync(path.join(root,'blog/feed.xml'),'utf8');ok(rss.includes('<rss version="2.0"'),'RSS feed exists');
const temp=fs.mkdtempSync(path.join(os.tmpdir(),'brand-blog-test-'));
try{
 fs.mkdirSync(path.join(temp,'scripts'),{recursive:true});fs.mkdirSync(path.join(temp,'content/posts'),{recursive:true});
 for(const f of ['content/blog.json','content/base-sitemap.xml','scripts/build-blog.mjs'])fs.copyFileSync(path.join(root,f),path.join(temp,f));
 const first=fs.readdirSync(path.join(root,'content/posts')).find(x=>x.endsWith('.md'));
 const original=fs.readFileSync(path.join(root,'content/posts',first),'utf8');fs.writeFileSync(path.join(temp,'content/posts',first),original);run(temp);
 const match=original.match(/^---\r?\n([\s\S]+?)\r?\n---\r?\n([\s\S]*)$/),meta=JSON.parse(match[1]);
 const write=(m,body=match[2])=>fs.writeFileSync(path.join(temp,'content/posts/second.md'),'---\n'+JSON.stringify(m,null,2)+'\n---\n'+body);
 write({...meta,slug:'second-guide',title:'A second guide',status:'draft'});run(temp);ok(!fs.existsSync(path.join(temp,'blog/posts/second-guide/index.html')),'drafts are excluded');
 write({...meta,slug:'second-guide',title:'A second guide',hero:'image',status:'ready'});run(temp);ok(fs.existsSync(path.join(temp,'blog/posts/second-guide/index.html')),'second article generates');
 ok(fs.readFileSync(path.join(temp,'blog/posts/second-guide/index.html'),'utf8').includes('class="article-image"'),'future topics can use their own image instead of a hardcoded first-topic visual');
 ok(fs.readFileSync(path.join(temp,'blog/index.html'),'utf8').includes('A second guide'),'second article appears on index');
 ok(fs.readFileSync(path.join(temp,'sitemap.xml'),'utf8').includes('/blog/posts/second-guide/'),'second article in sitemap');
 ok(fs.readFileSync(path.join(temp,'blog/feed.xml'),'utf8').includes('/blog/posts/second-guide/'),'second article in RSS');
 write({...meta,slug:'second-guide',title:'A second guide',status:'draft'});run(temp);ok(!fs.existsSync(path.join(temp,'blog/posts/second-guide/index.html')),'unpublished generated page is removed');
 write({...meta,slug:'unsafe'},'## Unsafe URL\n\n[Bad](javascript:alert)');const bad=spawnSync(process.execPath,['scripts/build-blog.mjs'],{cwd:temp,encoding:'utf8',timeout:5000});ok(bad.status!==0,'unsafe link rejected');
 write({...meta,slug:'malformed'},'| malformed table |');const malformed=spawnSync(process.execPath,['scripts/build-blog.mjs'],{cwd:temp,encoding:'utf8',timeout:5000});ok(malformed.status!==0&&!malformed.error,'malformed Markdown fails without hanging');
}finally{const allowed=path.resolve(os.tmpdir())+path.sep;assert.ok(path.resolve(temp).startsWith(allowed)&&path.basename(temp).startsWith('brand-blog-test-'));fs.rmSync(temp,{recursive:true,force:true});}
console.log(`${config.name}: ${checks} checks passed (SEO, links, anchors, images, draft handling, second-post lifecycle, unsafe/malformed input).`);
