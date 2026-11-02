import 'dotenv/config';
import express from 'express';
import crypto from 'node:crypto';
const app=express();app.disable('x-powered-by');app.use(express.json({limit:'32kb'}));app.use(express.static('public'));
const {IMAGEKIT_PRIVATE_KEY:privateKey,APP_PASSWORD:password}=process.env;
if(!privateKey||!password)throw Error('Configure IMAGEKIT_PRIVATE_KEY e APP_PASSWORD');
const auth='Basic '+Buffer.from(privateKey+':').toString('base64');
const links=new Map(),sessions=new Map();
const id=()=>crypto.randomBytes(24).toString('hex');
const hash=s=>crypto.createHash('sha256').update(s).digest();
const equal=(a,b)=>crypto.timingSafeEqual(hash(a),hash(b));
const admin=req=>{const token=(req.headers.cookie||'').match(/(?:^|; )alc_session=([a-f0-9]+)/)?.[1];return token&&sessions.get(token)>Date.now()};
const guard=(req,res,next)=>admin(req)?next():res.status(401).json({error:'Faça login'});
app.get('/api/me',(req,res)=>res.json({admin:!!admin(req)}));
app.post('/api/login',(req,res)=>{if(!equal(String(req.body.password||''),password))return res.status(401).json({error:'Senha incorreta'});const token=id();sessions.set(token,Date.now()+604800000);res.cookie('alc_session',token,{httpOnly:true,secure:process.env.NODE_ENV==='production',sameSite:'lax',maxAge:604800000});res.json({ok:true})});
app.post('/api/upload-auth',guard,(req,res)=>res.json({mode:'server'}));
app.post('/api/upload',guard,async(req,res)=>{
 const name=String(req.headers['x-file-name']||'video.mp4').slice(0,180);
 const type=String(req.headers['content-type']||'');
 if(!type.startsWith('video/'))return res.status(415).json({error:'Envie um vídeo'});
 const chunks=[];let total=0;
 try{
  for await(const chunk of req){total+=chunk.length;if(total>100*1024*1024)return res.status(413).json({error:'Limite de 100 MB nesta versão'});chunks.push(chunk)}
  if(!total)return res.status(400).json({error:'Arquivo vazio'});
  const form=new FormData();form.append('file',new Blob(chunks,{type}),name);form.append('fileName',name);form.append('folder','/upload-alc');form.append('useUniqueFileName','true');
  const response=await fetch('https://upload.imagekit.io/api/v1/files/upload',{method:'POST',headers:{Authorization:auth},body:form});
  const data=await response.json();if(!response.ok)throw Error(data.message||'Falha no ImageKit');
  const key=id();links.set(key,{fileId:data.fileId,url:data.url,name,size:total,status:'ready'});
  res.json({link:new URL('/v/'+key,req.protocol+'://'+req.get('host')).href});
 }catch(e){res.status(502).json({error:e.message||'Falha no envio'})}
});
app.get('/v/:id',(req,res)=>res.sendFile('index.html',{root:process.cwd()+'/public'}));
app.get('/api/video/:id',(req,res)=>{const f=links.get(req.params.id);if(!f||f.status!=='ready')return res.status(404).json({error:'Link indisponível'});res.json({name:f.name,size:f.size})});
app.get('/api/video/:id/download',(req,res)=>{const f=links.get(req.params.id);if(!f||f.status!=='ready')return res.status(404).send('Link encerrado');const url=new URL(f.url);url.searchParams.set('ik-attachment','true');url.searchParams.set('tr','orig-true');res.redirect(url.href)});
app.post('/api/video/:id/done',guard,async(req,res)=>{const f=links.get(req.params.id);if(!f||f.status!=='ready')return res.status(404).json({error:'Arquivo indisponível'});f.status='deleting';try{const r=await fetch('https://api.imagekit.io/v1/files/'+encodeURIComponent(f.fileId),{method:'DELETE',headers:{Authorization:auth}});if(!r.ok&&r.status!==404)throw Error('ImageKit '+r.status);links.delete(req.params.id);res.json({ok:true})}catch(e){f.status='ready';res.status(502).json({error:'Falha ao excluir. Tente novamente.'})}});
app.listen(process.env.PORT||3000,()=>console.log('Upload ALC ativo'));
