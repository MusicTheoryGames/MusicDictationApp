const puppeteer = require('puppeteer');
const OUT = '/private/tmp/claude-501/-Users-aaronpike-Desktop-Music-Dictation-APP/d5c89652-dc6a-4b83-a34b-c7a84a231d3a/scratchpad/shots';
async function run(){
  const b = await puppeteer.launch({headless:'new'});
  const p = await b.newPage(); await p.setViewport({width:844,height:390,isMobile:true,hasTouch:true,deviceScaleFactor:2});
  await p.setUserAgent('Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 Version/17.5 Mobile/15E148 Safari/604.1');
  await p.goto('http://localhost:8000/tapping.html?tbtest=1&levtest=1&mode=tapping',{waitUntil:'networkidle0'});
  await new Promise(r=>setTimeout(r,900));
  await p.evaluate(()=>window.BeatQuestTheme.apply('kids'));
  await new Promise(r=>setTimeout(r,300));
  // Force a few new rounds to observe both orientations; capture the zone geometry + hints each time
  async function snap(tag){
    return await p.evaluate(()=>{
      var beat=document.getElementById('tbBeat'), rhythm=document.getElementById('tbRhythm');
      var br=beat.getBoundingClientRect(), rr=rhythm.getBoundingClientRect();
      return { orient: window.__tbTest.S.tapOrient,
        beatLeft: Math.round(br.left), rhythmLeft: Math.round(rr.left),
        beatOnLeft: br.left < rr.left,
        beatHint: (document.getElementById('tbBeatHint')||{}).textContent,
        rhythmHint: (document.getElementById('tbRhythmHint')||{}).textContent };
    });
  }
  await p.evaluate(()=>{ window.__tbTest.setMeasures(2); });
  await new Promise(r=>setTimeout(r,300));
  await p.evaluate(()=>{ var x=document.getElementById('teachSkipBtn'); if(x)x.click(); });
  await new Promise(r=>setTimeout(r,200));
  const s1 = await snap('r1'); console.log('round1:', JSON.stringify(s1));
  await p.screenshot({path:`${OUT}/handswap-1.png`});
  // next round
  await p.evaluate(()=>{ window.__tbTest.newRound(); });
  await new Promise(r=>setTimeout(r,400));
  await p.evaluate(()=>{ var x=document.getElementById('teachSkipBtn'); if(x)x.click(); });
  await new Promise(r=>setTimeout(r,200));
  const s2 = await snap('r2'); console.log('round2:', JSON.stringify(s2));
  await p.screenshot({path:`${OUT}/handswap-2.png`});
  console.log('ORIENTATION FLIPPED:', s1.orient !== s2.orient, '| beat side flipped:', s1.beatOnLeft !== s2.beatOnLeft);
  await b.close();
}
run().catch(e=>{console.error(e);process.exit(1);});
