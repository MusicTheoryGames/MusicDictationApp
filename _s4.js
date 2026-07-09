const puppeteer = require('puppeteer');
const OUT = '/private/tmp/claude-501/-Users-aaronpike-Desktop-Music-Dictation-APP/d5c89652-dc6a-4b83-a34b-c7a84a231d3a/scratchpad/shots';
const BASE = 'http://localhost:8100/melodic.html';
const UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1';
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{
  const b=await puppeteer.launch({headless:'new',args:['--no-sandbox']});
  for (const th of ['mpc','brutalist','arcade']) {
    const p=await b.newPage(); await p.setUserAgent(UA);
    await p.setViewport({width:390,height:844,deviceScaleFactor:2,isMobile:true,hasTouch:true});
    await p.goto(BASE,{waitUntil:'networkidle2'});
    await p.evaluate(t=>{localStorage.setItem('beatquest-theme',t);localStorage.removeItem('melodic-dictation-game');},th);
    await p.reload({waitUntil:'networkidle2'}); await sleep(1300);
    await p.screenshot({path:`${OUT}/melodic-mobile-${th}.png`});
    await p.close();
  }
  await b.close(); console.log('DONE4');
})().catch(e=>{console.error(e);process.exit(1);});
