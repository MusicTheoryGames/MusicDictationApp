const puppeteer = require('puppeteer');
const OUT = '/private/tmp/claude-501/-Users-aaronpike-Desktop-Music-Dictation-APP/d5c89652-dc6a-4b83-a34b-c7a84a231d3a/scratchpad/shots';
async function run(){
  const b = await puppeteer.launch({headless:'new'});
  const p = await b.newPage();
  const errs=[]; p.on('pageerror',e=>errs.push(e.message)); p.on('console',m=>{ if(m.type()==='error') errs.push('console: '+m.text()); });
  await p.setViewport({width:900,height:900,deviceScaleFactor:2});
  await p.goto('http://localhost:8000/melodic-lab.html',{waitUntil:'networkidle0'});
  await new Promise(r=>setTimeout(r,1500));
  // check the main staff + options rendered SVGs
  const info = await p.evaluate(()=>{
    const mainSvg = document.querySelectorAll('#mainStaff svg').length;
    const optSvgs = document.querySelectorAll('#opts .opt svg').length;
    const opts = document.querySelectorAll('#opts .opt').length;
    const labels = document.getElementById('labelRow').textContent.trim().slice(0,80);
    return { mainSvg, optSvgs, opts, labels };
  });
  console.log('mainStaff SVGs:', info.mainSvg, '| option SVGs:', info.optSvgs, '| options:', info.opts);
  console.log('labels:', info.labels);
  // click an option to test grading
  await p.evaluate(()=>{ document.querySelector('#opts .opt').click(); });
  await new Promise(r=>setTimeout(r,300));
  const status = await p.evaluate(()=>document.getElementById('status').textContent);
  console.log('grade status after click:', status);
  await p.screenshot({path:`${OUT}/melodic-lab.png`});
  console.log('ERRORS:', JSON.stringify(errs));
  await b.close();
}
run().catch(e=>{console.error(e);process.exit(1);});
