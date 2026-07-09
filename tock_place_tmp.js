const puppeteer = require('puppeteer');
const OUT = '/private/tmp/claude-501/-Users-aaronpike-Desktop-Music-Dictation-APP/d5c89652-dc6a-4b83-a34b-c7a84a231d3a/scratchpad/shots';
async function prep(p){
  await p.evaluate(()=>window.BeatQuestTheme.apply('kids'));
  await new Promise(r=>setTimeout(r,300));
  await p.evaluate(()=>{ window.__tbTest.setMeasures(2); });
  await new Promise(r=>setTimeout(r,300));
  await p.evaluate(()=>{ var b=document.getElementById('teachSkipBtn'); if(b)b.click(); });
  await new Promise(r=>setTimeout(r,250));
}
async function run(){
  const b = await puppeteer.launch({headless:'new'});
  // Desktop ready
  let p = await b.newPage(); await p.setViewport({width:1300,height:820});
  await p.goto('http://localhost:8000/tapping.html?tbtest=1&levtest=1&mode=tapping',{waitUntil:'networkidle0'});
  await new Promise(r=>setTimeout(r,900)); await prep(p);
  await p.screenshot({path:`${OUT}/tock-desktop-ready.png`}); await p.close();
  // Landscape phone ready + performing
  p = await b.newPage(); await p.setViewport({width:844,height:390,isMobile:true,hasTouch:true,deviceScaleFactor:2});
  await p.setUserAgent('Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 Version/17.5 Mobile/15E148 Safari/604.1');
  await p.goto('http://localhost:8000/tapping.html?tbtest=1&levtest=1&mode=tapping',{waitUntil:'networkidle0'});
  await new Promise(r=>setTimeout(r,900)); await prep(p);
  await p.screenshot({path:`${OUT}/tock-phone-ready.png`});
  // performing (metro started -> tap zones active, compacted layout)
  await p.evaluate(()=>{ window.__tbTest.onStartMetro(); });
  await new Promise(r=>setTimeout(r,500));
  await p.screenshot({path:`${OUT}/tock-phone-performing.png`});
  await b.close();
}
run().catch(e=>{console.error(e);process.exit(1);});
