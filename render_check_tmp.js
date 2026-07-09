const puppeteer = require('puppeteer');
const OUT = '/private/tmp/claude-501/-Users-aaronpike-Desktop-Music-Dictation-APP/d5c89652-dc6a-4b83-a34b-c7a84a231d3a/scratchpad/shots';
async function run(){
  const b = await puppeteer.launch({headless:'new'});
  const p = await b.newPage();
  const errs=[]; p.on('pageerror',e=>errs.push(e.message)); p.on('console',m=>{if(m.type()==='error')errs.push('c:'+m.text());});
  await p.setViewport({width:1000,height:900,deviceScaleFactor:2});
  await p.goto('http://localhost:8000/melodic-lab.html',{waitUntil:'networkidle0'});
  await new Promise(r=>setTimeout(r,1200));
  // report each level's key/mode so we know what we're seeing
  const levels = await p.evaluate(()=>{
    const out={};
    ['m4','m5','m6','m8','m11'].forEach(id=>{ const L=window.__mlDbg? null:null; });
    return out;
  });
  // step through a few levels and screenshot the main staff area
  for (const id of ['m5','m8','m6']){
    await p.select('#levelSel', id).catch(()=>{});
    await new Promise(r=>setTimeout(r,500));
    const info = await p.evaluate(()=>{
      const meta=document.getElementById('meta').textContent;
      const svg = document.querySelector('#mainStaff svg');
      return { meta, w: svg? svg.getAttribute('width'):null };
    });
    console.log(id, '->', info.meta, '| svgW:', info.w);
    const host = await p.$('#mainStaff');
    await host.screenshot({path:`${OUT}/render-${id}.png`});
  }
  console.log('ERRORS:', JSON.stringify(errs.slice(0,5)));
  await b.close();
}
run().catch(e=>{console.error(e);process.exit(1);});
