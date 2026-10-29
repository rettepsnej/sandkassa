const form=document.getElementById('breakfast-form'),message=document.getElementById('form-message');
const makeId=()=>globalThis.crypto?.randomUUID?.()||'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g,c=>{const n=Math.floor(Math.random()*16);return(c==='x'?n:(n&3)|8).toString(16);});
let submissionId=makeId();
form.addEventListener('submit',async event=>{
 event.preventDefault();if(!form.reportValidity())return;
 const button=form.querySelector('button[type=submit]');button.disabled=true;button.querySelector('span').textContent='Vi noterer ønskene dine …';message.textContent='';
 const fields=new FormData(form),payload={id:submissionId,name:fields.get('name').trim(),eggs:fields.get('eggs'),notes:fields.get('notes').trim(),website:fields.get('website')};
 try{
  const response=await fetch('/drommedate/api/submit',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
  const data=await response.json();if(!response.ok)throw new Error(data.error||'Vi fikk ikke lagret svaret. Prøv igjen.');
  form.hidden=true;const confirmation=document.getElementById('confirmation');confirmation.hidden=false;document.getElementById('confirmation-copy').textContent=`Takk, ${payload.name}! ${payload.eggs==='Uten egg'?'Vi har notert frokost uten egg.':`Vi har notert ${payload.eggs.toLowerCase()} til deg.`}`;if(data.preview)document.getElementById('confirmation-copy').textContent+=' Dette er en lokal forhåndsvisning. Ingen bestilling er sendt.';confirmation.focus();
 }catch(error){message.textContent=/^(Vi|Fyll|Åpne|Ugyldig|Svaret|Frokost)/.test(error.message)?error.message:'Vi fikk ikke kontakt. Sjekk nettet og prøv igjen.';}
 finally{button.disabled=false;button.querySelector('span').textContent="It's a date!";}
});
document.getElementById('another-guest').addEventListener('click',()=>{form.reset();submissionId=makeId();form.hidden=false;document.getElementById('confirmation').hidden=true;document.getElementById('guest-name').focus();});
