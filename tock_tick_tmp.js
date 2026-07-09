const puppeteer = require('puppeteer');
async function run(){
  const b = await puppeteer.launch({headless:'new'});
  const p = await b.newPage(); await p.setViewport({width:844,height:390,isMobile:true,hasTouch:true,deviceScaleFactor:2});
  await p.setUserAgent('Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 Version/17.5 Mobile/15E148 Safari/604.1');
  await p.goto('http://localhost:8000/tapping.html?tbtest=1&levtest=1&mode=tapping',{waitUntil:'networkidle0'});
  await new Promise(r=>setTimeout(r,900));
  await p.evaluate(()=>window.BeatQuestTheme.apply('kids'));
  await new Promise(r=>setTimeout(r,300));
  await p.evaluate(()=>{ window.__tbTest.setMeasures(2); });
  await new Promise(r=>setTimeout(r,300));
  await p.evaluate(()=>{ var x=document.getElementById('teachSkipBtn'); if(x)x.click(); });
  await new Promise(r=>setTimeout(r,200));
  await p.evaluate(()=>{ window.__tbTest.onStartMetro(); });
  // sample the pendulum class over ~1.5s to confirm it toggles with beats
  const samples=[];
  for(let i=0;i<8;i++){
    await new Promise(r=>setTimeout(r,180));
    samples.push(await p.evaluate(()=>{ var e=document.getElementById('kidsTock'); return e? (e.classList.contains('tock-tick-l')?'L':e.classList.contains('tock-tick-r')?'R':(e.classList.contains('tock-beat')?'beat':'idle')):'none'; }));
  }
  console.log('pendulum samples:', samples.join(' '));
  console.log('beat-mode entered:', samples.some(s=>s==='L'||s==='R'));
  console.log('toggled sides:', samples.includes('L') && samples.includes('R'));
  await b.close();
}
run().catch(e=>{console.error(e);process.exit(1);});
