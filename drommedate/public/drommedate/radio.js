(()=>{
 const audio=document.getElementById('breakfast-audio'),toggle=document.getElementById('radio-toggle'),play=document.getElementById('radio-play'),pause=document.getElementById('radio-pause');
 audio.volume=.45;
 function sync(){const playing=!audio.paused;play.disabled=playing;pause.disabled=!playing;toggle.setAttribute('aria-pressed',String(playing));toggle.setAttribute('aria-label',playing?'Sett musikken på pause':'Spill musikk fra radioen');toggle.title=playing?'Pause':'Spill musikk';}
 async function start(){try{await audio.play();}catch{}sync();}
 toggle.addEventListener('click',()=>{if(audio.paused)start();else{audio.pause();sync();}});
 play.addEventListener('click',start);pause.addEventListener('click',()=>{audio.pause();sync();});
 audio.addEventListener('play',sync);audio.addEventListener('pause',sync);audio.addEventListener('error',sync);start();
})();
