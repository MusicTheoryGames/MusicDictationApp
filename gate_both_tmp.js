const puppeteer = require('puppeteer');
async function scenario(url, seq, mode){
  const b = await puppeteer.launch({headless:'new'});
  const p = await b.newPage();
  await p.goto(url,{waitUntil:'networkidle0'});
  await new Promise(r=>setTimeout(r,900));
  const res = await p.evaluate((seq)=>{
    const L=window.__levTest, S=L.S;
    S.ramp=8; S.measures=8;
    let advancedAt=-1;
    for(let i=0;i<seq.length;i++){
      if(seq[i]) S.tapOrient=seq[i];
      const r=L.guidedRecord(true,true,100);
      if(r.res.advanced){ advancedAt=i+1; break; }
    }
    return { advancedAt, needed: (L.GUIDE.neededOrient?L.GUIDE.neededOrient():null) };
  }, seq);
  await b.close();
  return res;
}
(async()=>{
  // Tapping, ALL BL (one hand) x6 -> should NOT advance (both-hands enforced)
  const t1 = await scenario('http://localhost:8000/tapping.html?levtest=1&tbtest=1&mode=tapping', ['BL','BL','BL','BL','BL','BL'], 'tapping');
  console.log('TAPPING all-BL x6: advancedAt='+t1.advancedAt+' (expect -1 = never) | neededOrient(force other)='+t1.needed);
  // Dictation, 4 clean capstones -> should advance at 4 (no hand requirement)
  const d1 = await scenario('http://localhost:8000/rhythm-student.html?levtest=1&mode=solo', [null,null,null,null,null], 'dictation');
  console.log('DICTATION 4+ clean: advancedAt='+d1.advancedAt+' (expect 4)');
})().catch(e=>{console.error(e);process.exit(1);});
