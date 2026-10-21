import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const config=JSON.parse(fs.readFileSync(path.join(root,'content/blog.json'),'utf8'));
const check=process.argv.includes('--check');
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const safeUrl=s=>{if(!/^(https:\/\/|\/(?!\/)|#)/.test(s))throw Error(`Unsafe URL: ${s}`);return esc(s)};
const slug=s=>s.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
function inline(s){
 const tokens=[];const token=h=>`\u0000${tokens.push(h)-1}\u0000`;
 s=s.replace(/`([^`]+)`/g,(_,t)=>token(`<code>${esc(t)}</code>`));
 s=s.replace(/\[([^\]]+)\]\(([^\s)]+)\)/g,(_,t,u)=>token(`<a href="${safeUrl(u)}">${esc(t)}</a>`));
 return esc(s).replace(/\*\*([^*]+)\*\*/g,'<strong>$1</strong>').replace(/\*([^*]+)\*/g,'<em>$1</em>').replace(/\u0000(\d+)\u0000/g,(_,i)=>tokens[+i]);
}
function markdown(text){
 const lines=text.trim().split(/\r?\n/),out=[],headings=[],used=new Set();
 for(let i=0;i<lines.length;){
  const l=lines[i];if(!l.trim()){i++;continue;}
  if(/^\s*</.test(l)||/^# /.test(l))throw Error('Use Markdown, with ##/### headings; the page title supplies H1.');
  const h=l.match(/^(#{2,3}) (.+)$/);
  if(h){const id=slug(h[2]);if(used.has(id))throw Error(`Duplicate heading: ${id}`);used.add(id);headings.push({id,text:h[2],level:h[1].length});out.push(`<h${h[1].length} id="${id}">${inline(h[2])}</h${h[1].length}>`);i++;continue;}
  if(l.startsWith('|')&&/^\|[\s:|\-]+\|$/.test(lines[i+1]||'')){
   const cells=x=>x.trim().replace(/^\||\|$/g,'').split('|').map(x=>x.trim());
   const header=cells(l);i+=2;const rows=[];while(i<lines.length&&lines[i].startsWith('|')){const row=cells(lines[i++]);if(row.length!==header.length)throw Error('Table column mismatch');rows.push(row);}
   out.push(`<div class="table-scroll" role="region" aria-label="Comparison table" tabindex="0"><table><thead><tr>${header.map(x=>`<th scope="col">${inline(x)}</th>`).join('')}</tr></thead><tbody>${rows.map(r=>`<tr>${r.map(x=>`<td>${inline(x)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`);continue;
  }
  const list=l.match(/^(?:- |\d+\. )(.+)$/);
  if(list){const ordered=/^\d/.test(l),tag=ordered?'ol':'ul',items=[];while(i<lines.length&&(ordered?/^\d+\. /:/^- /).test(lines[i]))items.push(lines[i++].replace(/^(?:- |\d+\. )/,''));out.push(`<${tag}>${items.map(x=>`<li>${inline(x)}</li>`).join('')}</${tag}>`);continue;}
  if(l.startsWith('> ')){const q=[];while(lines[i]?.startsWith('> '))q.push(lines[i++].slice(2));out.push(`<aside class="note"><p>${inline(q.join(' '))}</p></aside>`);continue;}
  const p=[];while(i<lines.length&&lines[i].trim()&&!/^(#{2,3} |\||- |\d+\. |> )/.test(lines[i]))p.push(lines[i++]);if(!p.length)throw Error(`Unsupported Markdown block: ${l}`);out.push(`<p>${inline(p.join(' '))}</p>`);
 }
 return {html:out.join('\n'),headings};
}
function readPost(file){
 const source=fs.readFileSync(path.join(root,'content/posts',file),'utf8');
 const match=source.match(/^---\r?\n([\s\S]+?)\r?\n---\r?\n([\s\S]*)$/);if(!match)throw Error(`Missing JSON metadata block: ${file}`);
 const meta=JSON.parse(match[1]);if(meta.status==='draft')return null;if(meta.status!=='ready')throw Error('Status must be draft or ready. Ready means included in the build, not deployed.');
 for(const k of ['title','seoTitle','description','slug','date','category','author','summary','image','imageAlt','ctaLabel','ctaUrl'])if(typeof meta[k]!=='string'||!meta[k].trim())throw Error(`Missing ${k}: ${file}`);
 if(!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(meta.slug))throw Error(`Invalid slug: ${file}`);
 if(!/^\d{4}-\d{2}-\d{2}$/.test(meta.date)||!Number.isFinite(Date.parse(meta.date)))throw Error(`Invalid date: ${file}`);
 if(meta.updated&&(!/^\d{4}-\d{2}-\d{2}$/.test(meta.updated)||meta.updated<meta.date))throw Error(`Invalid updated date: ${file}`);
 if(!Array.isArray(meta.sources)||!meta.sources.length)throw Error(`Provide research sources: ${file}`);
 if(!meta.keywords?.length)throw Error(`Provide keyword candidates: ${file}`);
 safeUrl(meta.ctaUrl);meta.sources.forEach(x=>safeUrl(x.url));
 const body=markdown(match[2]);const words=match[2].split(/\s+/).length;
 return {...meta,...body,words,reading:Math.max(1,Math.ceil(words/210)),url:`${config.origin}/blog/posts/${meta.slug}/`};
}
const posts=fs.readdirSync(path.join(root,'content/posts')).filter(f=>f.endsWith('.md')).map(readPost).filter(Boolean).sort((a,b)=>b.date.localeCompare(a.date)||a.slug.localeCompare(b.slug));
if(!posts.length)throw Error('At least one ready post is required.');
if(new Set(posts.map(p=>p.slug)).size!==posts.length)throw Error('Duplicate post slugs.');
const date=d=>new Intl.DateTimeFormat('en-GB',{day:'numeric',month:'long',year:'numeric',timeZone:'UTC'}).format(new Date(`${d}T12:00:00Z`));
const json=x=>JSON.stringify(x).replace(/</g,'\\u003c');
const proper=config.theme==='proper';
function brand(){return proper?'<img src="/assets/brand/mark-light.svg" width="38" height="38" alt=""><span class="wordmark"><span>PROPER</span><span>EMAILS</span></span>':`<img src="/assets/blog/oryn-mark.svg" width="48" height="34" alt=""><span class="oryn-wordmark">ORYN-B</span>`;}
const header=()=>`<a class="skip" href="#main">Skip to content</a><header class="masthead"><div class="shell masthead-inner"><a class="brand" aria-label="${esc(config.name)} homepage" href="/">${brand()}</a><nav aria-label="Main navigation"><a href="${config.homeLink}">${esc(config.homeLabel)}</a><a href="/blog/" aria-current="${'location'}">${esc(config.blogLabel)}</a><a class="nav-cta" href="${safeUrl(config.navCtaUrl)}">${esc(config.navCtaLabel)} <span aria-hidden="true">↗</span></a></nav></div></header>`;
const footer=()=>`<footer class="site-footer"><div class="shell footer-inner"><a class="brand" href="/" aria-label="${esc(config.name)} homepage">${brand()}</a><p>${esc(config.footer)}</p><nav aria-label="Footer navigation"><a href="/blog/">${esc(config.blogLabel)}</a><a href="/blog/feed.xml">RSS feed</a>${proper?'<a href="/privacy/">Privacy</a><a href="/terms/">Terms</a>':'<a href="/#ingredients">Ingredients</a>'}</nav><small>© ${new Date().getUTCFullYear()} ${esc(config.name)}</small></div></footer>`;
function document({title,description,url,image,alt,body,schema}){return `<!doctype html>\n<html lang="en" data-theme="${config.theme}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="theme-color" content="${proper?'#111417':'#2C483A'}"><title>${esc(title)}</title><meta name="description" content="${esc(description)}"><meta name="robots" content="index,follow"><link rel="canonical" href="${esc(url)}"><link rel="icon" href="${config.favicon}"><link rel="alternate" type="application/rss+xml" title="${esc(config.name)} ${esc(config.blogLabel)}" href="/blog/feed.xml"><meta property="og:type" content="${schema['@type']==='BlogPosting'?'article':'website'}"><meta property="og:site_name" content="${esc(config.name)}"><meta property="og:title" content="${esc(title)}"><meta property="og:description" content="${esc(description)}"><meta property="og:url" content="${esc(url)}"><meta property="og:image" content="${esc(config.origin+image)}"><meta property="og:image:alt" content="${esc(alt)}"><meta name="twitter:card" content="summary_large_image"><link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link href="https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&family=Manrope:wght@400;500;600;700;800&display=swap" rel="stylesheet"><link rel="stylesheet" href="/assets/blog.css"><script type="application/ld+json">${json(schema)}</script></head><body>${header()}${body}${footer()}</body></html>\n`;}
function visual(p){if(!["journey","loading"].includes(p.hero))return `<figure class="article-image"><img src="${safeUrl(p.image)}" width="1200" height="630" alt="${esc(p.imageAlt)}"><figcaption>${esc(p.imageAlt)}</figcaption></figure>`;return p.hero==="journey"?`<figure class="journey-figure"><div class="diagram-label">THE CUSTOMER JOURNEY <span aria-hidden="true">↗</span></div><ol class="journey"><li><span>01 / INTEREST</span><strong>Added to cart</strong><p>Still considering the product.</p></li><li><span>02 / INTENT</span><strong>Started checkout</strong><p>Working through the purchase.</p></li><li><span>03 / CUSTOMER</span><strong>Placed order</strong><p>Recovery messages should stop.</p></li></ol><figcaption>Illustrative lifecycle map. Confirm the actual events your store sends.</figcaption></figure>`:`<figure class="loading-figure"><div><span class="eyebrow">RESEARCH / ROUTINE</span><p class="figure-title">Faster loading.<br>Or a slower build.</p><p>Two approaches to muscle creatine stores.<br>One reason to read the whole label.</p><span class="figure-note">Educational illustration · not a product dosing guide</span></div><img src="/assets/blog/output-original.webp" width="380" height="480" alt="Original ORYN-B OUTPUT product artwork, shown for brand context, not as evidence for a loading protocol"></figure>`;}
function article(p){
 const schema={'@context':'https://schema.org','@type':'BlogPosting',headline:p.title,description:p.description,datePublished:p.date,...(p.updated?{dateModified:p.updated}:{}),author:{'@type':'Organization',name:p.author,url:config.origin+'/'},publisher:{'@type':'Organization',name:config.name,url:config.origin+'/'},image:[config.origin+p.image],mainEntityOfPage:p.url,inLanguage:'en',articleSection:p.category};
 const toc=p.headings.filter(x=>x.level===2).map(h=>`<li><a href="#${h.id}">${esc(h.text)}</a></li>`).join('');
 const body=`<main id="main"><div class="shell"><nav class="breadcrumbs" aria-label="Breadcrumb"><a href="/">Home</a><span aria-hidden="true">/</span><a href="/blog/">${esc(config.blogLabel)}</a><span aria-hidden="true">/</span><span>${esc(p.category)}</span></nav><header class="article-header"><div class="eyebrow">${esc(p.category)} <span>${proper?"PRACTICAL GUIDE":"RESEARCH NOTES"}</span></div><h1>${esc(p.title)}</h1><p class="deck">${esc(p.summary)}</p><div class="byline"><span>By ${esc(p.author)}</span><time datetime="${p.date}">${date(p.date)}</time><span>${p.reading} min read</span>${p.updated&&p.updated!==p.date?`<span>Updated ${date(p.updated)}</span>`:''}</div></header>${visual(p)}<div class="reading-layout"><aside class="toc"><nav aria-label="On this page"><p class="eyebrow">IN THIS GUIDE</p><ol>${toc}</ol><a class="toc-back" href="/blog/">← All ${esc(config.blogLabel.toLowerCase())}</a></nav></aside><article class="prose">${p.html}<section class="sources" aria-labelledby="sources"><h2 id="sources">Sources &amp; editorial notes</h2><p>${esc(p.editorialNote||'Prepared by the brand team using the sources below. Examples are illustrative, not client performance claims.')}</p><ol>${p.sources.map((s,i)=>`<li id="source-${i+1}"><a href="${safeUrl(s.url)}">${esc(s.label)}</a></li>`).join('')}</ol><p class="source-date">Sources checked ${date(p.date)}. Recheck changing guidance before implementation.</p></section><section class="article-cta"><span class="eyebrow">${esc(config.ctaEyebrow)}</span><h2>${esc(config.ctaTitle)}</h2><p>${esc(config.ctaText)}</p><a class="button" href="${safeUrl(p.ctaUrl)}">${esc(p.ctaLabel)} <span aria-hidden="true">↗</span></a></section></article></div><div class="article-end"><span class="eyebrow">KEEP EXPLORING</span><a href="/blog/">← Back to ${esc(config.blogLabel.toLowerCase())}</a></div></div></main>`;
 return document({title:p.seoTitle,description:p.description,url:p.url,image:p.image,alt:p.imageAlt,body,schema});
}
function index(){const first=posts[0];const cards=posts.map((p,i)=>`<article class="post-card ${i===0?'featured':''}"><a class="post-image" href="/blog/posts/${p.slug}/" tabindex="-1" aria-hidden="true"><img src="${p.image}" width="1200" height="630" alt="" ${i?'loading="lazy"':'fetchpriority="high"'}></a><div class="post-info"><div class="eyebrow">${esc(p.category)} <span>${p.reading} MIN READ</span></div><h2><a href="/blog/posts/${p.slug}/">${esc(p.title)}</a></h2><p>${esc(p.summary)}</p><div class="card-bottom"><time datetime="${p.date}">${date(p.date)}</time><a class="text-link" href="/blog/posts/${p.slug}/" aria-label="Read ${esc(p.title)}">Read the guide <span aria-hidden="true">↗</span></a></div></div></article>`).join('');
 const body=`<main id="main"><div class="shell"><header class="index-header"><div class="eyebrow">${esc(config.name)} / ${esc(config.blogLabel)}</div><h1>${config.indexTitle}</h1><p class="deck">${esc(config.indexIntro)}</p><div class="index-meta"><span>RESEARCH. CLARITY. PRACTICAL NEXT STEPS.</span><span>${posts.length.toString().padStart(2,'0')} ${posts.length===1?'GUIDE':'GUIDES'}</span></div></header><section aria-labelledby="latest"><div class="section-label"><h2 id="latest">The latest</h2><a href="/blog/feed.xml">Subscribe via RSS ↗</a></div>${cards}</section><section class="editorial-strip"><span class="eyebrow">OUR EDITORIAL STANDARD</span><h2>${esc(config.standardTitle)}</h2><p>${esc(config.standardText)}</p></section></div></main>`;
 return document({title:config.indexSeoTitle,description:config.indexIntro,url:config.origin+'/blog/',image:first.image,alt:first.imageAlt,body,schema:{'@context':'https://schema.org','@type':'Blog',name:config.name+' '+config.blogLabel,url:config.origin+'/blog/',publisher:{'@type':'Organization',name:config.name},blogPost:posts.map(p=>({'@type':'BlogPosting',headline:p.title,url:p.url,datePublished:p.date}))}});
}
const outputs=new Map([['blog/index.html',index()]]);
for(const p of posts)outputs.set(`blog/posts/${p.slug}/index.html`,article(p));
const rss=`<?xml version="1.0" encoding="UTF-8"?>\n<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom"><channel><title>${esc(config.name+' '+config.blogLabel)}</title><link>${config.origin}/blog/</link><description>${esc(config.indexIntro)}</description><language>en</language><atom:link href="${config.origin}/blog/feed.xml" rel="self" type="application/rss+xml"/>${posts.map(p=>`<item><title>${esc(p.title)}</title><link>${p.url}</link><guid isPermaLink="true">${p.url}</guid><pubDate>${new Date(p.date+'T12:00:00Z').toUTCString()}</pubDate><description>${esc(p.description)}</description></item>`).join('')}</channel></rss>\n`;
outputs.set('blog/feed.xml',rss);
const baseMap=fs.readFileSync(path.join(root,'content/base-sitemap.xml'),'utf8');
const sitemap=baseMap.replace(/\s*<\/urlset>/,`\n<url><loc>${config.origin}/blog/</loc></url>\n${posts.map(p=>`<url><loc>${p.url}</loc></url>`).join('\n')}\n</urlset>`);
outputs.set('sitemap.xml',sitemap);
const expected=[...outputs.keys()];
if(check){for(const [name,value]of outputs)if(!fs.existsSync(path.join(root,name))||fs.readFileSync(path.join(root,name),'utf8')!==value)throw Error(`Generated file is stale: ${name}. Run node scripts/build-blog.mjs`);}
else{
 const manifest=path.join(root,'content/generated-blog.json');
 const old=fs.existsSync(manifest)?JSON.parse(fs.readFileSync(manifest,'utf8')):[];
 for(const name of old)if(!expected.includes(name)&&/^blog\/(?:posts\/[a-z0-9-]+\/index\.html|index\.html|feed\.xml)$/.test(name))fs.rmSync(path.join(root,name),{force:true});
 for(const [name,value]of outputs){fs.mkdirSync(path.dirname(path.join(root,name)),{recursive:true});fs.writeFileSync(path.join(root,name),value);}
 fs.writeFileSync(manifest,JSON.stringify(expected,null,2)+'\n');
}
console.log(`${config.name}: ${posts.length} article(s), ${expected.length} generated files ${check?'verified':'built'}.`);
