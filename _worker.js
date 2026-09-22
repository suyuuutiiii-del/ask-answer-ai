const json=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{"content-type":"application/json; charset=utf-8","cache-control":"no-store"}});
const cors={"access-control-allow-origin":"*","access-control-allow-headers":"content-type,authorization","access-control-allow-methods":"GET,POST,OPTIONS"};
const out=(data,status=200)=>{const r=json(data,status);Object.entries(cors).forEach(([k,v])=>r.headers.set(k,v));return r};
const PREMIUM_PRICE_KOBO=150000;
const PREMIUM_DAYS=30;
function systemPrompt(){
 return `You are Ask & Get Answer R6, an educational assistant. Use British English and clear age-appropriate explanations. Be concise unless detail is requested. Never invent a Qur'anic verse, hadith, Arabic spelling, source, calculation result or examination fact. When exact sacred text or a high-stakes detail is uncertain, say it needs verification rather than guessing. For Islamic content, do not depict Allah, prophets or angels. For school materials, provide useful structure, headings and teacher-review notes where appropriate.`;
}
async function askAI(request,env){
 if(!env.GEMINI_API_KEY)return out({error:"AI service is not configured."},503);
 let body;try{body=await request.json()}catch{return out({error:"Invalid request."},400)}
 const question=String(body.question||body.prompt||"").trim();
 if(!question)return out({error:"Please enter a question."},400);
 if(question.length>12000)return out({error:"Question is too long."},413);
 const model=env.GEMINI_MODEL||"gemini-2.5-flash";
 const url="https://generativelanguage.googleapis.com/v1beta/models/"+encodeURIComponent(model)+":generateContent?key="+encodeURIComponent(env.GEMINI_API_KEY);
 const payload={systemInstruction:{parts:[{text:systemPrompt()}]},contents:[{role:"user",parts:[{text:question}]}],generationConfig:{temperature:.25,maxOutputTokens:1400}};
 let res;try{res=await fetch(url,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(payload)})}catch{return out({error:"AI connection failed."},502)}
 let data;try{data=await res.json()}catch{return out({error:"Invalid AI response."},502)}
 if(!res.ok)return out({error:"AI service error.",detail:data?.error?.message||""},502);
 const answer=(data.candidates?.[0]?.content?.parts||[]).map(p=>p.text||"").join("").trim();
 if(!answer)return out({error:"No answer was returned."},502);
 return out({answer});
}
async function verifyPaystack(request,env){
 if(!env.PAYSTACK_SECRET_KEY)return out({error:"Payment verification is not configured."},503);
 let body;try{body=await request.json()}catch{return out({error:"Invalid request."},400)}
 const reference=String(body.reference||"").trim();
 if(!reference)return out({error:"Payment reference is required."},400);
 const res=await fetch("https://api.paystack.co/transaction/verify/"+encodeURIComponent(reference),{headers:{authorization:"Bearer "+env.PAYSTACK_SECRET_KEY}});
 const data=await res.json().catch(()=>null);
 if(!res.ok||!data?.status)return out({error:"Payment could not be verified."},400);
 const tx=data.data||{};
 const required=Number(env.PREMIUM_PRICE_KOBO||PREMIUM_PRICE_KOBO);
 if(tx.status!=="success"||Number(tx.amount)!==required)return out({error:"Payment is not a successful ₦1,500 Premium payment."},400);
 const paidAt=tx.paid_at?new Date(tx.paid_at):new Date();
 const expires=new Date(paidAt.getTime()+PREMIUM_DAYS*86400000);
 return out({verified:true,plan:"premium",dailyLimit:30,paidAmountKobo:Number(tx.amount),expiresAt:expires.toISOString(),reference:tx.reference});
}
async function config(env){
 return out({release:"R6",freeDailyLimit:5,premiumDailyLimit:30,premiumPriceKobo:Number(env.PREMIUM_PRICE_KOBO||PREMIUM_PRICE_KOBO),premiumDays:30,autoRenew:false});
}
export default{async fetch(request,env){
 if(request.method==="OPTIONS")return new Response(null,{status:204,headers:cors});
 const u=new URL(request.url);
 if(u.pathname==="/api/ask"&&request.method==="POST")return askAI(request,env);
 if(u.pathname==="/api/paystack/verify"&&request.method==="POST")return verifyPaystack(request,env);
 if(u.pathname==="/api/config"&&request.method==="GET")return config(env);
 return env.ASSETS.fetch(request);
}};