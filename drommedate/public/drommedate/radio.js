(()=>{
 const audio=document.getElementById('breakfast-audio'),play=document.getElementById('radio-play'),pause=document.getElementById('radio-pause'),status=document.getElementById('radio-status'),player=document.querySelector('.radio-player');
 audio.volume=.45;
 function sync(){const playing=!audio.paused;play.disabled=playing;pause.disabled=!playing;player.classList.toggle('is-playing',playing);status.textContent=playing?'How D’ya Like Your Eggs…':'Trykk play for litt god morgen.';}
 async function start(){try{await audio.play();sync();}catch{sync();}}
 play.addEventListener('click',start);pause.addEventListener('click',()=>{audio.pause();sync();});
 audio.addEventListener('play',sync);audio.addEventListener('pause',sync);
 audio.addEventListener('error',()=>{status.textContent='Musikken lastes ikke. Prøv igjen.';play.disabled=false;pause.disabled=true;});
 start();
})();
