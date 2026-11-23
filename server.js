import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
dotenv.config();
const app=express();
const __dirname=path.dirname(fileURLToPath(import.meta.url));
app.use(cors({origin:process.env.ALLOWED_ORIGIN||true}));
app.use(express.json({limit:'1mb'}));
app.use(express.static(path.join(__dirname,'public')));

const providers={
  openai:{key:'OPENAI_API_KEY',base:'https://api.openai.com/v1',model:process.env.OPENAI_MODEL||'gpt-6.2-astra'},
  gemini:{key:'GEMINI_API_KEY',model:process.env.GEMINI_MODEL||'gemini-2.5-flash'},
  anthropic:{key:'ANTHROPIC_API_KEY',model:process.env.ANTHROPIC_MODEL||'claude-sonnet-4-5'},
  grok:{key:'XAI_API_KEY',base:'https://api.x.ai/v1',model:process.env.XAI_MODEL||'grok-4.1'},
  perplexity:{key:'PERPLEXITY_API_KEY',base:'https://api.perplexity.ai',model:process.env.PERPLEXITY_MODEL||'sonar'}
};
const getKey=p=>process.env[providers[p]?.key];
function extractText(provider,data){
  if(provider==='gemini') return data?.candidates?.[0]?.content?.parts?.map(p=>p.text||'').join('')||'';
  if(provider==='anthropic') return data?.content?.filter(c=>c.type==='text').map(c=>c.text).join('')||'';
  return data?.choices?.[0]?.message?.content||'';
}
async function callProvider(provider,system,prompt,{temperature=0.7,maxTokens=12000}={}){
  const p=providers[provider]; if(!p) throw new Error('Unsupported AI provider.');
  const key=getKey(provider); if(!key) throw new Error(`${p.key} is not configured on the server.`);
  let url,headers,body;
  if(provider==='gemini'){
    url=`https://generativelanguage.googleapis.com/v1beta/models/${p.model}:generateContent`;
    headers={'Content-Type':'application/json','x-goog-api-key':key};
    body={systemInstruction:{parts:[{text:system}]},contents:[{role:'user',parts:[{text:prompt}]}],generationConfig:{temperature,maxOutputTokens:maxTokens}};
  } else if(provider==='anthropic'){
    url='https://api.anthropic.com/v1/messages'; headers={'Content-Type':'application/json','x-api-key':key,'anthropic-version':'2023-06-01'};
    body={model:p.model,max_tokens:maxTokens,system,messages:[{role:'user',content:prompt}]};
  } else {
    url=`${p.base}/chat/completions`; headers={'Content-Type':'application/json',Authorization:`Bearer ${key}`};
    body={model:p.model,messages:[{role:'system',content:system},{role:'user',content:prompt}],temperature,max_tokens:maxTokens};
  }
  const r=await fetch(url,{method:'POST',headers,body:JSON.stringify(body)});
  const data=await r.json().catch(()=>({}));
  if(!r.ok) throw new Error(data?.error?.message||data?.message||`Provider returned HTTP ${r.status}`);
  return extractText(provider,data);
}
const systemBuild=`You are VELTRIX, a professional web designer and front-end developer. Return ONLY a complete standalone HTML document. Include CSS and any necessary JavaScript inline. Use semantic HTML, responsive design, high quality visual styling, accessible contrast and working navigation. Do not include markdown fences. Avoid external dependencies and remote assets unless the brief explicitly asks. Use a cohesive design and fill in sensible content where details are missing. No fake functionality: forms should be clearly marked demo-only unless wired to a real endpoint.`;
const htmlOnly=t=>{const m=t.match(/<!doctype html[\s\S]*|<html[\s\S]*/i);return m? t.slice(m.index).trim():t.trim()};
app.post('/api/build',async(req,res)=>{try{const {provider='gemini',brief='',websiteType='landing',researchText=''}=req.body;if(!brief.trim())return res.status(400).json({error:'Please provide a website brief.'});const prompt=`Website type: ${websiteType}\nProject brief: ${brief}\n${researchText?`Research notes to consider:\n${researchText}\n`:''}Create a complete, polished, responsive website as standalone HTML. Output only HTML.`;const html=htmlOnly(await callProvider(provider,systemBuild,prompt));if(!html.toLowerCase().includes('<html')&&!html.toLowerCase().includes('<!doctype'))return res.status(502).json({error:'The model did not return HTML. Try again or choose another model.'});res.json({html,provider});}catch(e){res.status(502).json({error:e.message||'AI build failed.'})}});
app.post('/api/chat',async(req,res)=>{try{const {provider='gemini',html='',message='',history=[]}=req.body;if(!html||!message.trim())return res.status(400).json({error:'Missing current website or change request.'});const system=`You are VELTRIX web editor. Return ONLY the full revised standalone HTML document, no markdown. Preserve existing content unless the user asks to change it. Make the requested edits precisely. Keep it responsive and accessible.`;const prompt=`Current website HTML:\n${html}\n\nUser change request: ${message}\n\nConversation context (recent): ${JSON.stringify(history.slice(-8))}\nReturn the full updated HTML.`;const result=htmlOnly(await callProvider(provider,system,prompt,{maxTokens:14000}));if(!result.toLowerCase().includes('<html'))return res.status(502).json({error:'Model response was not a complete HTML document.'});res.json({html:result});}catch(e){res.status(502).json({error:e.message||'AI edit failed.'})}});
app.post('/api/research',async(req,res)=>{try{const {topic=''}=req.body;if(!topic.trim())return res.status(400).json({error:'Please enter a research topic.'});const answer=await callProvider('perplexity','Research assistant for web design projects. Summarize useful findings, trends and sources. Be concise and factual.',topic,{maxTokens:4000});res.json({research:answer});}catch(e){res.status(502).json({error:e.message||'Research failed.'})}});
app.get('/api/status',(req,res)=>res.json({providers:Object.fromEntries(Object.keys(providers).map(k=>[k,Boolean(getKey(k))]))}));
app.listen(process.env.PORT||3000,()=>console.log(`VELTRIX API running at http://localhost:${process.env.PORT||3000}`));
