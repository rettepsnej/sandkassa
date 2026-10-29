import { put, list, get, del } from '@vercel/blob';
import { Readable } from 'node:stream';
import { createHmac, createHash, timingSafeEqual } from 'node:crypto';
const choices=['Bløtkokt','Hardkokt','Speilegg','Eggerøre','Uten egg'];
const prefix='breakfast/';
const digest=value=>createHash('sha256').update(String(value)).digest();
const equal=(a,b)=>timingSafeEqual(digest(a),digest(b));
const sign=value=>createHmac('sha256',process.env.ADMIN_PASSWORD).update(value).digest('hex');
function authenticated(req){
 if(!process.env.ADMIN_PASSWORD)return false;
 const cookie=(req.headers.cookie||'').split(';').map(v=>v.trim()).find(v=>v.startsWith('breakfast_session='));
 if(!cookie)return false;
 const [expires,signature]=(cookie.slice('breakfast_session='.length)).split('.');
 return /^\d+$/.test(expires)&&Number(expires)>Date.now()&&equal(signature,sign(expires));
}
function sameOrigin(req){
 const origin=req.headers.origin;if(!origin)return false;
 try{return ['sandkassa.club','localhost','127.0.0.1',process.env.VERCEL_URL,process.env.VERCEL_PROJECT_PRODUCTION_URL].filter(Boolean).includes(new URL(origin).hostname);}catch{return false;}
}
async function readRows(){
 let cursor;const blobs=[];
 do{const page=await list({prefix,limit:1000,cursor});blobs.push(...page.blobs);cursor=page.hasMore?page.cursor:undefined;}while(cursor);
 const rows=[];
 for(let i=0;i<blobs.length;i+=10){rows.push(...await Promise.all(blobs.slice(i,i+10).map(async blob=>{const item=await get(blob.url,{access:'private',useCache:false});if(!item||item.statusCode!==200)throw new Error('Missing response');return JSON.parse(await new Response(item.stream).text());})));}
 return rows.sort((a,b)=>b.createdAt.localeCompare(a.createdAt));
}
export default async function handler(req,res){
 res.setHeader('Cache-Control','private, no-store');res.setHeader('X-Content-Type-Options','nosniff');
 const action=new URL(req.url,'https://local.invalid').searchParams.get('action')||req.query?.action;
 try{
  if(action==='media'&&(req.method==='GET'||req.method==='HEAD')){
   const asset=new URL(req.url,'https://local.invalid').searchParams.get('asset')||req.query?.asset;
   const path=asset==='audio'?'assets/eggs-in-the-morning.mp3':asset==='radio'?'assets/radio.png':null;
   if(!path)return res.status(404).end();
   const range=req.headers.range;
   if(range&&!/^bytes=\d*-\d*$/.test(range))return res.status(416).end();
   const result=await get(path,{access:'private',...(range?{headers:{Range:range}}:{})});
   if(!result||!result.stream)return res.status(404).end();
   res.setHeader('Cache-Control','private, no-store');
   res.setHeader('Content-Type',asset==='audio'?'audio/mpeg':'image/png');
   for(const key of ['content-length','content-range','accept-ranges','etag']){const value=result.headers.get(key);if(value)res.setHeader(key,value);}
   res.status(result.headers.has('content-range')?206:200);
   if(req.method==='HEAD'){await result.stream.cancel();return res.end();}
   return Readable.fromWeb(result.stream).pipe(res);
  }
  if(action==='upload'&&req.method==='POST'){
   if(!process.env.ADMIN_PASSWORD||!equal(req.headers.authorization||'','Bearer '+process.env.ADMIN_PASSWORD))return res.status(401).json({error:'Logg inn først.'});
   const asset=new URL(req.url,'https://local.invalid').searchParams.get('asset')||req.query?.asset;
   const path=asset==='audio'?'assets/eggs-in-the-morning.mp3':asset==='radio'?'assets/radio.png':null;
   if(!path)return res.status(400).json({error:'Ugyldig fil.'});
   if(Number(req.headers['content-length']||0)>4400000)return res.status(413).json({error:'Filen er for stor.'});
   let bytes=req.body;
   if(!Buffer.isBuffer(bytes)){const chunks=[];let size=0;for await(const chunk of req){size+=chunk.length;if(size>4400000)return res.status(413).end();chunks.push(chunk);}bytes=Buffer.concat(chunks);}
   if(!bytes.length)return res.status(400).json({error:'Filen er tom.'});
   await put(path,bytes,{access:'private',addRandomSuffix:false,allowOverwrite:true,contentType:asset==='audio'?'audio/mpeg':'image/png'});
   return res.status(200).json({ok:true});
  }
  if(req.method==='POST'&&!sameOrigin(req))return res.status(403).json({error:'Åpne skjemaet fra invitasjonslenken og prøv igjen.'});
  if(Number(req.headers['content-length']||0)>6000)return res.status(413).json({error:'Svaret er for langt.'});
  let body=req.body||{};if(typeof body==='string'){try{body=JSON.parse(body);}catch{return res.status(400).json({error:'Ugyldig svar.'});}}
  if(action==='submit'&&req.method==='POST'){
   if(!process.env.BLOB_READ_WRITE_TOKEN)return res.status(503).json({error:'Frokostskjemaet er ikke klart ennå. Prøv igjen litt senere.'});
   if(body.website)return res.status(400).json({error:'Ugyldig innsending.'});
   const name=typeof body.name==='string'?body.name.trim():'';const notes=typeof body.notes==='string'?body.notes.trim():'';
   if(!name||name.length>100||notes.length>1000||!choices.includes(body.eggs)||!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(body.id||''))return res.status(400).json({error:'Fyll inn navn og velg hvordan du vil ha eggene dine.'});
   const pathname=prefix+body.id+'.json';
   const existing=await get(pathname,{access:'private',useCache:false}).catch(error=>{if(error.constructor.name==='BlobNotFoundError')return null;throw error;});
   if(!existing){const row={id:body.id,name,eggs:body.eggs,notes,createdAt:new Date().toISOString()};try{await put(pathname,JSON.stringify(row),{access:'private',addRandomSuffix:false,allowOverwrite:false,contentType:'application/json'});}catch(error){if(!/already exists/i.test(error.message))throw error;}}
   return res.status(200).json({ok:true});
  }
  if(action==='login'&&req.method==='POST'){
   if(!process.env.ADMIN_PASSWORD)return res.status(503).json({error:'Svaroversikten er ikke klar ennå.'});
   if(typeof body.password!=='string'||!equal(body.password,process.env.ADMIN_PASSWORD))return res.status(401).json({error:'Feil passord. Prøv igjen.'});
   const expires=String(Date.now()+8*60*60*1000);res.setHeader('Set-Cookie',`breakfast_session=${expires}.${sign(expires)}; HttpOnly; Secure; SameSite=Strict; Path=/drommedate; Max-Age=28800`);return res.status(200).json({ok:true});
  }
  if(!authenticated(req))return res.status(401).json({error:'Logg inn for å se frokostønskene.'});
  if(action==='logout'&&req.method==='POST'){res.setHeader('Set-Cookie','breakfast_session=; HttpOnly; Secure; SameSite=Strict; Path=/drommedate; Max-Age=0');return res.status(200).json({ok:true});}
  if(action==='responses'&&req.method==='GET')return res.status(200).json({rows:await readRows()});
  if(action==='delete'&&req.method==='POST'){
   if(!/^[0-9a-f-]{36}$/i.test(body.id||''))return res.status(400).json({error:'Ugyldig svar.'});
   await del(prefix+body.id+'.json');return res.status(200).json({ok:true});
  }
  return res.status(405).json({error:'Denne handlingen støttes ikke.'});
 }catch(error){console.error('Breakfast operation failed:',action,error.constructor.name);return res.status(500).json({error:'Vi fikk ikke kontakt med svaroversikten. Prøv igjen om litt.'});}
}
