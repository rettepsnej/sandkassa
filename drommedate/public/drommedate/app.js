const form=document.getElementById('breakfast-form'),message=document.getElementById('form-message');
let submissionId=crypto.randomUUID();
form.addEventListener('submit',async event=>{
 event.preventDefault();if(!form.reportValidity())return;
 const button=form.querySelector('button[type=submit]');button.disabled=true;button.querySelector('span').textContent='Vi noterer ønskene dine …';message.textContent='';
 const fields=new FormData(form),payload={id:submissionId,name:fields.get('name').trim(),eggs:fields.get('eggs'),notes:fields.get('notes').trim(),website:fields.get('website')};
 try{
  const response=await fetch('/drommedate/api/submit',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
  const data=await response.json();if(!response.ok)throw new Error(data.error||'Vi fikk ikke lagret svaret. Prøv igjen.');
  form.hidden=true;const confirmation=document.getElementById('confirmation');confirmation.hidden=false;document.getElementById('confirmation-copy').textContent=`Takk, ${payload.name}! ${payload.eggs==='Uten egg'?'Vi har notert frokost uten egg.':`Vi har notert ${payload.eggs.toLowerCase()} til deg.`}`;confirmation.focus();
 }catch(error){message.textContent=error.message||'Vi fikk ikke kontakt. Sjekk nettet og prøv igjen.';}
 finally{button.disabled=false;button.querySelector('span').textContent='Det er en date!';}
});
document.getElementById('another-guest').addEventListener('click',()=>{form.reset();submissionId=crypto.randomUUID();form.hidden=false;document.getElementById('confirmation').hidden=true;document.getElementById('guest-name').focus();});
