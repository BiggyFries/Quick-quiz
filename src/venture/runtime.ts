let paused=false;
let sound=true;
let context:AudioContext|undefined;
export function setGamePaused(value:boolean){paused=value;}
export function isGamePaused(){return paused||document.hidden;}
export function setGameSound(value:boolean){sound=value;}
export function gameFeedback(success=false){
  if(!sound||navigator.webdriver)return;
  try{ context??=new AudioContext(); if(context.state==='suspended')void context.resume(); const gain=context.createGain(); gain.connect(context.destination); const now=context.currentTime; gain.gain.setValueAtTime(.035,now); gain.gain.exponentialRampToValueAtTime(.001,now+.14); const tone=context.createOscillator(); tone.type='sine';tone.frequency.setValueAtTime(success?660:350,now);tone.frequency.exponentialRampToValueAtTime(success?990:480,now+.1);tone.connect(gain);tone.start();tone.stop(now+.15); }catch{/* Audio is optional. */}
}
