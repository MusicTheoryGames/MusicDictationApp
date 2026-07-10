const puppeteer = require('puppeteer');
async function run(){
  const b = await puppeteer.launch({headless:'new'});
  const p = await b.newPage(); await p.setViewport({width:900,height:600});
  await p.goto('http://localhost:8000/tapping.html?levtest=1&tbtest=1&mode=tapping',{waitUntil:'networkidle0'});
  await new Promise(r=>setTimeout(r,1000));
  const out = await p.evaluate(()=>{
    const L=window.__levTest, S=L.S, log=[];
    S.ramp=8; S.measures=8;
    const seq=['BL','BR','BL','BL','BL'];
    for(let i=0;i<seq.length;i++){
      S.tapOrient=seq[i];
      const r=L.guidedRecord(true,true,100);
      const d=L.GUIDE.data();
      const lvlId = L.masteryView().levelId;
      const it=d.items[lvlId]||{};
      const tc=(d.teach[lvlId]||{}).cleanStreak;
      log.push('r'+(i+1)+'('+seq[i]+'): rawScore='+it.score+' level='+it.level+' cleanStreak='+tc+' orients='+JSON.stringify(d.capstoneOrients[lvlId])+' | S.ramp='+S.ramp+' S.measures='+S.measures+' advanced='+r.res.advanced+' capPassed='+r.res.capstonePassed);
      if(r.res.advanced){ log.push('  --> ADVANCED at r'+(i+1)); break; }
    }
    return log;
  });
  out.forEach(l=>console.log(l));
  await b.close();
}
run().catch(e=>{console.error(e);process.exit(1);});
