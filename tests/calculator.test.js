import test from 'node:test';
import assert from 'node:assert/strict';
import { calculate, CONVERSIONS, EXCLUSIONS } from '../calculator.js';

const base = { situation: 'none', age: 'adult', weight: 70, weightUnit: 'kg', startingHb: 7, amount: 1, amountUnit: 'units', bagVolume: 287, bagHb: 55, method: 'weight', ebvPerKg: 70, height: 180, heightUnit: 'cm', nadlerSet: 'male', lemmensIndex: 70, referenceBmi: 22, bloodVolume: 5000 };
const run = changes => calculate({ ...base, ...changes });
const close = (actual, expected, tolerance = 1e-10) => assert.ok(Math.abs(actual - expected) <= tolerance, `${actual} != ${expected}`);
const ok = r => { assert.equal(r.status, 'ok'); return r; };

test('independent adult hand calculation: 55 g into 49 dL gives 1.1224489796 g/dL', () => {
  const r = ok(run({})); close(r.rise, 1.1224489795918366); close(r.finalHb, 8.122448979591837); close(r.bloodVolumeMl, 4900); close(r.transfusedMl, 287); close(r.deliveredHbG, 55);
});
test('Lifeblood example: 49 g into 49 dL gives 1 g/dL', () => { const r = ok(run({bagVolume:258,bagHb:49})); close(r.rise,1); close(r.finalHb,8); });
test('multiple-unit arithmetic is linear without importing adult research effects', () => { const r = ok(run({amount:2.5})); close(r.deliveredHbG,137.5); close(r.rise,2.806122448979592); });
test('starting Hb affects final sum only', () => { const r = ok(run({startingHb:10})); close(r.rise,1.1224489795918366); close(r.finalHb,11.122448979591837); });
test('actual volume aliquot: half the Canadian example bag contains 27.5 g', () => { const r = ok(run({amount:143.5,amountUnit:'ml'})); close(r.deliveredHbG,27.5); close(r.rise,0.5612244897959183); });
test('mL/kg adult conversion and arbitrary product concentration', () => { const r = ok(run({amount:4,amountUnit:'mlkg',bagVolume:250,bagHb:50})); close(r.transfusedMl,280); close(r.deliveredHbG,56); close(r.rise,1.1428571428571428); });
test('lb conversion uses exact international pound', () => { const r = ok(run({weight:100,weightUnit:'lb'})); close(r.weightKg,45.359237); close(r.bloodVolumeMl,3175.14659); });
test('pound and kilogram inputs agree', () => { close(ok(run({weight:154.32358352941433,weightUnit:'lb'})).rise,ok(run({})).rise); });
test('US and Imperial pint conversions remain distinct from bag units', () => {
  const us = ok(run({amountUnit:'usPint',amount:1,bagVolume:1000,bagHb:200,bloodVolume:10000,method:'independent'}));
  const imperial = ok(run({amountUnit:'imperialPint',amount:1,bagVolume:1000,bagHb:200,bloodVolume:10000,method:'independent'}));
  close(us.transfusedMl,473.176473); close(us.rise,0.946352946); close(imperial.transfusedMl,568.26125); close(imperial.rise,1.1365225);
  assert.notEqual(us.transfusedMl,287); assert.equal(CONVERSIONS.inchToCm,2.54);
});
test('zero amount returns zero rise and unchanged starting Hb', () => { const r = ok(run({amount:0})); close(r.rise,0); close(r.finalHb,7); });
test('RCH published 10 kg / 100 mL / starting 60 g/L example => approximate 80 g/L', () => {
  const r = ok(run({age:'child',weight:10,startingHb:6,amount:100,amountUnit:'ml',bagVolume:258,bagHb:49}));
  close(r.rch.rise,2); close(r.rch.finalHb,8); close(r.rise,2.7131782945736433); assert.notEqual(r.rch.rise,r.rise);
});
test('RCH mL/kg inverse equivalent and aliquots', () => {
  const a = ok(run({age:'child',weight:10,amount:10,amountUnit:'mlkg'})); close(a.rch.rise,2);
  const b = ok(run({age:'child',weight:10,amount:50,amountUnit:'ml'})); close(b.rch.rise,1); close(b.deliveredHbG,9.581881533101045);
});
test('RCH only below 20 kg and beyond neonatal period, within published increment scope', () => {
  for (const age of ['adult','term','preterm']) assert.equal(ok(run({age,amountUnit:'ml',amount:10})).rch.status,'not-applicable');
  assert.equal(ok(run({age:'child',weight:20,amountUnit:'ml',amount:100})).rch.status,'not-applicable');
  assert.equal(ok(run({age:'child',weight:19.999,amountUnit:'ml',amount:50})).rch.status,'available');
  const r = ok(run({age:'child',weight:10,amountUnit:'ml',amount:101})); assert.equal(r.rch.status,'outside'); assert.equal(r.rch.rise,undefined);
});

// NBA Table G.2 uses neonatal product Hct 0.63. Its approximation Hb = Hct*1000/3
// gives 210 g/L (= 0.21 g/mL). Use 21 g per 100 mL, not today's supplier presets.
// Table entries are rounded to nearest g/L. Matching them verifies arithmetic only.
for (const [age,ebv,table] of [
  ['preterm',100,[[9.1,10.2,11.2],[10.1,11.2,12.2],[11.1,12.2,13.2]]],
  ['term',80,[[9.6,10.9,12.3],[10.6,11.9,13.3],[11.6,12.9,14.3]]]
]) {
  for (const [row,start] of [7,8,9].entries()) for (const [col,amount] of [10,15,20].entries()) {
    test(`NBA Table G.2 ${age}, start ${start} g/dL, ${amount} mL/kg`, () => {
      const r = ok(run({age,weight:age==='term'?3:1,startingHb:start,amount,amountUnit:'mlkg',ebvPerKg:ebv,bagVolume:100,bagHb:21}));
      assert.equal(Math.round(r.finalHb*10)/10,table[row][col]); assert.equal(r.rch.status,'not-applicable');
    });
  }
}
test('adjusted neonatal EBV: 15 mL/kg × 0.21 g/mL into 1.2 dL/kg gives 2.625', () => { close(ok(run({age:'preterm',weight:1,amount:15,amountUnit:'mlkg',ebvPerKg:120,bagVolume:100,bagHb:21})).rise,2.625); });
test('independent volume overrides the weight-based denominator', () => { const r = ok(run({method:'independent',bloodVolume:5500,ebvPerKg:''})); close(r.rise,1); });
test('Nadler male hand calculation: 1.8 m, 70 kg => 4997.1608 mL', () => { const r = ok(run({method:'nadler',ebvPerKg:''})); close(r.bloodVolumeMl,4997.1608); close(r.rise,1.1006249788880118); });
test('Nadler female hand calculation: 1.6 m, 60 kg => 3626.6856 mL', () => { const r = ok(run({method:'nadler',height:160,weight:60,nadlerSet:'female'})); close(r.bloodVolumeMl,3626.6856); });
test('Nadler inches agrees with centimetres', () => { close(ok(run({method:'nadler',height:70,heightUnit:'in'})).bloodVolumeMl,ok(run({method:'nadler',height:177.8})).bloodVolumeMl); });
test('Lemmens reference BMI 22 yields coefficient × weight', () => { const r = ok(run({method:'lemmens',weight:88,height:200})); close(r.bmi,22); close(r.bloodVolumeMl,6160); });
test('Lemmens BMI 88 yields half the coefficient (70/2)', () => { const r = ok(run({method:'lemmens',weight:198,height:150})); close(r.bmi,88); close(r.bloodVolumeMl,6930); });
test('Lemmens custom coefficient and reference BMI explicitly affect arithmetic', () => { close(ok(run({method:'lemmens',weight:88,height:200,lemmensIndex:65,referenceBmi:22})).bloodVolumeMl,5720); close(ok(run({method:'lemmens',weight:88,height:200,referenceBmi:88})).bloodVolumeMl,12320); });
test('inactive inputs are ignored', () => { assert.equal(run({height:'',bloodVolume:'',nadlerSet:'',lemmensIndex:''}).status,'ok'); });
for (const key of ['weight','startingHb','amount','bagVolume','bagHb','ebvPerKg']) {
  for (const value of ['', ' ', 'abc', NaN, Infinity, null, {}, -1]) test(`invalid ${key}: ${String(value)}`, () => {
    const r = run({[key]:value}); assert.equal(r.status,'invalid'); assert.equal(r.rise,undefined); assert.equal(r.finalHb,undefined); assert.equal(r.rch,undefined);
  });
}
test('zero in denominators and positive-only quantities is invalid', () => { for (const key of ['weight','bagVolume','bagHb','ebvPerKg']) assert.equal(run({[key]:0}).status,'invalid'); });
test('software upper bounds and converted volume enforced', () => {
  for (const [key,value] of Object.entries({weight:501,startingHb:31,amount:100001,bagVolume:2001,bagHb:401,ebvPerKg:301})) assert.equal(run({[key]:value}).status,'invalid');
  assert.equal(run({amount:100000,amountUnit:'units'}).status,'invalid');
});
test('method-specific invalid values rejected', () => {
  for (const changes of [{method:'independent',bloodVolume:0},{method:'independent',bloodVolume:''},{method:'nadler',height:0},{method:'nadler',heightUnit:'feet'},{method:'nadler',nadlerSet:'custom'},{method:'lemmens',lemmensIndex:0},{method:'lemmens',referenceBmi:''},{method:'lemmens',height:251}]) assert.equal(run(changes).status,'invalid');
});
test('unknown enumerations rejected', () => { for (const key of ['age','weightUnit','amountUnit','method']) assert.equal(run({[key]:'unknown'}).status,'invalid'); });
test('adult-only amount units and methods rejected for every pediatric category', () => {
  for (const age of ['child','term','preterm']) {
    for (const amountUnit of ['units','usPint','imperialPint']) assert.equal(run({age,amountUnit}).status,'invalid');
    for (const method of ['nadler','lemmens']) assert.equal(run({age,amountUnit:'ml',method}).status,'invalid');
  }
});
for (const situation of EXCLUSIONS) test(`exclusion ${situation} returns no numeric results, even with malformed inputs`, () => {
  for (const input of [{...base,situation},{situation}]) assert.deepEqual(Object.keys(calculate(input)).sort(),['message','status']);
  assert.equal(run({situation}).status,'excluded');
});
test('unconfirmed or unknown scope withholds all numerical results', () => { for (const situation of ['',undefined,'unknown']) { const r=run({situation}); assert.equal(r.status,'unconfirmed'); assert.deepEqual(Object.keys(r).sort(),['message','status']); } });
