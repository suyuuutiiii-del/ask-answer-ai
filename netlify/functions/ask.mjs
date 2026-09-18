export default async (req) => {
 if(req.method!=="POST") return Response.json({error:"Method not allowed"},{status:405});
 try{
  const {question}=await req.json();
  if(!question||typeof question!=="string") return Response.json({error:"Please enter a question."},{status:400});
  const key=process.env.OPENAI_API_KEY;
  if(!key) return Response.json({error:"OPENAI_API_KEY is not available to the function."},{status:500});
  const r=await fetch("https://api.openai.com/v1/responses",{method:"POST",headers:{"Authorization":`Bearer ${key}`,"Content-Type":"application/json"},body:JSON.stringify({model:"gpt-5.6-luna",input:question,reasoning:{effort:"low"},max_output_tokens:700})});
  const d=await r.json();
  if(!r.ok) return Response.json({error:d?.error?.message||"OpenAI request failed."},{status:r.status});
  let answer=d.output_text;
  if(!answer&&Array.isArray(d.output)) answer=d.output.flatMap(x=>x.content||[]).filter(x=>x.type==="output_text").map(x=>x.text).join("\n");
  return Response.json({answer:answer||"No text answer was returned."});
 }catch(e){return Response.json({error:e.message||"Server error."},{status:500})}
};