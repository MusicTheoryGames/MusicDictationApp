const puppeteer = require('puppeteer');
async function run(){
  const b = await puppeteer.launch({headless:'new'});
  const p = await b.newPage(); await p.setViewport({width:900,height:600});
  const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  await p.goto('http://localhost:8000/tapping.html?levtest=1&tbtest=1&mode=tapping',{waitUntil:'networkidle0'});
  await new Promise(r=>setTimeout(r,1000));
  const out = await p.evaluate(()=>{
    const L=window.__levTest, S=L.S, log=[];
    // force capstone bars
    S.ramp=8; S.measures=8;
    function band(){ return Math.round(L.masteryView().score); }
    function idx(){ return L.masteryView().idx; }
    const startIdx=idx();
    // Round 1: BL clean capstone
    S.tapOrient='BL'; let r1=L.guidedRecord(true,true,100);
    log.push('after r1(BL): score='+band()+' advanced='+r1.res.advanced+' needOther='+r1.res.needOtherHand+' orients='+JSON.stringify(L.GUIDE.data().capstoneOrients));
    const neededAfter1 = L.GUIDE.neededOrient();
    log.push('neededOrient after 1 (expect BR): '+neededAfter1);
    // Round 2: BR clean
    S.tapOrient='BR'; let r2=L.guidedRecord(true,true,100);
    log.push('after r2(BR): score='+band()+' advanced='+r2.res.advanced+' (both hands now, but band<80)');
    // Round 3: BL clean
    S.tapOrient='BL'; let r3=L.guidedRecord(true,true,100);
    log.push('after r3: score='+band()+' advanced='+r3.res.advanced);
    // Round 4: BL clean -> score should hit 80 -> ADVANCE
    S.tapOrient='BL'; let r4=L.guidedRecord(true,true,100);
    log.push('after r4: score='+band()+' advanced='+r4.res.advanced+' leveledUp='+r4.res.leveledUp);
    log.push('idx moved: '+(idx()!==startIdx)+' ('+startIdx+' -> '+idx()+')');
    return log;
  });
  out.forEach(l=>console.log(l));
  console.log('ERRORS:', JSON.stringify(errs));
  await b.close();
}
run().catch(e=>{console.error(e);process.exit(1);});
