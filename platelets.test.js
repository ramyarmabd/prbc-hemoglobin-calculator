import test from 'node:test';
import assert from 'node:assert/strict';
import { calculatePlatelets, PLATELET_EXCLUSIONS } from './platelet-calculator.js';
const adult={age:'adult',situation:'none',starting:10,amount:1,unit:'adultDose'};
const run=changes=>calculatePlatelets({...adult,...changes});
test('adult published references remain distinct and add baseline independently',()=>{
  const r=run({}); assert.equal(r.status,'ok');
  assert.deepEqual(r.references,[{source:'cbs',low:15,high:25,finalLow:25,finalHigh:35},{source:'lifeblood',low:20,high:40,finalLow:30,finalHigh:50}]);
});
for (const weight of [50,69.9,70.1,100]) test(`extra adult weight never scales the published reference: ${weight}`,()=>{assert.deepEqual(run({weight}).references,run({}).references);});
for (const amount of [0.5,2,3]) test(`no adult aliquot/multiple-dose extrapolation: ${amount}`,()=>{assert.equal(run({amount}).status,'unsupported');});
test('starting count changes sums only',()=>{const r=run({starting:0});assert.equal(r.references[0].low,15);assert.equal(r.references[0].finalHigh,25);});
for (const mlkg of [5,7.5,10]) test(`stable child at ${mlkg} mL/kg uses the same approximate reference`,()=>{
  const r=run({age:'child',weight:10,starting:20,amount:mlkg,unit:'mlkg'});
  assert.equal(r.status,'ok');assert.deepEqual(r.references,[{source:'child',low:50,high:50,approximate:true,finalLow:70,finalHigh:70}]);
});
test('actual child mL converts independently: 50 mL / 10 kg = 5 mL/kg',()=>{const r=run({age:'child',weight:10,starting:5,amount:50,unit:'ml'});assert.equal(r.status,'ok');assert.equal(r.references[0].finalLow,55);});
for (const amount of [4.99,10.01]) test(`no child dose extrapolation: ${amount}`,()=>{assert.equal(run({age:'child',weight:10,amount,unit:'mlkg'}).status,'unsupported');});
for (const age of ['term','preterm']) test(`no unsupported neonatal increment: ${age}`,()=>{assert.equal(run({age}).status,'unsupported');});
test('conservative child weight scope distinguishes below 15 kg from 15 kg',()=>{
  assert.equal(run({age:'child',weight:14.99,amount:5,unit:'mlkg'}).status,'ok');
  assert.equal(run({age:'child',weight:15,amount:5,unit:'mlkg'}).status,'unsupported');
});
for (const situation of ['', 'unknown',...PLATELET_EXCLUSIONS]) test(`applicability withholds all numeric fields: ${situation || 'unconfirmed'}`,()=>{
  const r=run({situation});assert.notEqual(r.status,'ok');assert.equal(r.references,undefined);
});
for (const [field,values] of [['weight',['',-1,NaN,Infinity,0,501]],['starting',['',-1,NaN,Infinity,2001]],['amount',['',-1,NaN,Infinity,100001]]]) {
  for (const value of values) test(`invalid ${field}: ${String(value)}`,()=>{assert.equal(run(field==='weight'?{age:'child',unit:'ml',amount:50,[field]:value}:{[field]:value}).status,'invalid');});
}
test('zero amount adds zero, without forecasting a stable measured count',()=>{const r=run({amount:0,weight:80});assert.equal(r.status,'ok');assert.deepEqual(r.references,[{source:'zero',low:0,high:0,finalLow:10,finalHigh:10}]);});
test('wrong units and unknown age cannot produce results',()=>{
  for (const unit of ['ml','mlkg','units','']) assert.equal(run({unit}).status,'invalid');
  assert.equal(run({age:'child',unit:'adultDose'}).status,'invalid');assert.equal(run({age:'unknown'}).status,'invalid');
});
test('converted child volume limit is a software safeguard',()=>{assert.equal(run({age:'child',weight:14,amount:100000,unit:'mlkg'}).status,'invalid');});
test('adult reference does not require weight; child reference does',()=>{
  assert.equal(run({}).status,'ok');assert.equal(run({age:'child',amount:50,unit:'ml'}).status,'invalid');
});
