import { NextRequest, NextResponse } from 'next/server';
import { chatStream, limited, safeText } from '@/lib/server';
import { MAIN_PROMPT, HUMANIZER_PROMPT } from '@/prompts/templates';
export const runtime='nodejs';
function relayCompletion(response:Response,fast:boolean){
 const encoder=new TextEncoder();
 let activeReader:ReadableStreamDefaultReader<Uint8Array>|undefined;
 return new Response(new ReadableStream({async start(controller){
  const reader=response.body?.getReader();
  if(!reader){controller.enqueue(encoder.encode(`data: ${JSON.stringify({error:'NVIDIA returned no response stream.'})}\n\n`));controller.close();return;}
  activeReader=reader;
  controller.enqueue(encoder.encode(`data: ${JSON.stringify({fast})}\n\n`));
  const decoder=new TextDecoder();let buffer='';
  const emitLine=(line:string)=>{
   if(!line.startsWith('data:'))return false;
   const payload=line.slice(5).trim();if(!payload)return false;
   if(payload==='[DONE]'){controller.enqueue(encoder.encode('data: [DONE]\n\n'));return true;}
   try{const item=JSON.parse(payload);if(item.error){controller.enqueue(encoder.encode(`data: ${JSON.stringify({error:item.error.message||'The model returned an error.'})}\n\n`));return true;}const content=item.choices?.[0]?.delta?.content;if(typeof content==='string'&&content)controller.enqueue(encoder.encode(`data: ${JSON.stringify({token:content})}\n\n`));}
   catch{ /* Ignore non-JSON provider events. */ }
   return false;
  };
  try{
   for(;;){const {value,done}=await reader.read();if(done)break;buffer+=decoder.decode(value,{stream:true});const lines=buffer.split(/\r?\n/);buffer=lines.pop()||'';for(const line of lines)if(emitLine(line)){controller.close();return;}}
   buffer+=decoder.decode();if(buffer)emitLine(buffer);controller.enqueue(encoder.encode('data: [DONE]\n\n'));controller.close();
  }catch(error){try{controller.enqueue(encoder.encode(`data: ${JSON.stringify({error:error instanceof Error?error.message:'Stream interrupted.'})}\n\n`));controller.close();}catch{/* Client disconnected. */}}
 },cancel(){void activeReader?.cancel().catch(()=>{});}}),{headers:{'Content-Type':'text/event-stream; charset=utf-8','Cache-Control':'no-cache, no-transform','Connection':'keep-alive','X-Accel-Buffering':'no'}});
}
export async function POST(req:NextRequest){
 const lim=limited(req);if(lim)return lim;
 try{
  const b=await req.json();const mode=b.mode==='mock'?'mock':b.mode==='humanize'?'humanize':'coach';
  const resume=safeText(b.resume,16000),jd=safeText(b.jd,10000),style=safeText(b.style,2000),question=safeText(b.question,5000),answer=safeText(b.answer,5000),length=safeText(b.length,40)||'Medium';
  if(mode==='humanize'){
   const draft=safeText(b.draft,12000);if(!draft)return NextResponse.json({error:'Paste a draft to rewrite.'},{status:400});
   const tone=safeText(b.tone,40)||'professional',strength=safeText(b.strength,20)||'medium';
   const factRule=b.keepFacts===true?'Keep every factual statement, name, and figure exactly as written wherever possible.':'Keep all facts and claims accurate; rephrase them only when it improves clarity.';
   const system=HUMANIZER_PROMPT.replace('{tone}',tone).replace('{strength}',strength).replace('{style_profile}',style||'No personal style profile provided. Follow the selected tone without inventing a voice.').replace('{fact_rule}',factRule);
   const result=await chatStream([{role:'system',content:system},{role:'user',content:draft}],4096);
   return relayCompletion(result.response,result.fast);
  }
  if(!question)return NextResponse.json({error:'Add a question first.'},{status:400});
  const system=MAIN_PROMPT.replace('{resume}',resume||'No resume supplied').replace('{jd}',jd||'No job description supplied').replace('{mode}',mode).replace('{length}',length).replace('{style_profile}',style||'Conversational, clear and specific.');
  const prompt=mode==='mock'?(answer?`Evaluate the candidate's answer to this question. Give score /10, what worked, what to improve, a stronger spoken version, then ONE next interview question. Clearly label each section. Do not answer as candidate.\nQuestion: ${question}\nCandidate answer: ${answer}`:`Ask exactly ONE first interview question based on the job and resume. Return only the question.`):`Write a spoken answer to this interview question: ${question}`;
  const responseTokens=length.toLowerCase()==='short'?400:length.toLowerCase()==='detailed'?1400:700;
  const result=await chatStream([{role:'system',content:system},{role:'user',content:prompt}],responseTokens);
  return relayCompletion(result.response,result.fast);
 }catch(e){return NextResponse.json({error:e instanceof Error?e.message:'Could not generate an answer.'},{status:500});}
}
