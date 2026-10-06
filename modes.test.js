import test from 'node:test';
import assert from 'node:assert/strict';
import { calculate } from './calculator.js';
import { withSimpleDefaults } from './modes.js';
const adult = { situation:'none', age:'adult', weight:70, weightUnit:'kg', startingHb:7, amount:1, amountUnit:'units' };
test('simple adult uses independent 55 g / 49 dL example', () => {
  const r=calculate(withSimpleDefaults(adult)); assert.equal(r.status,'ok'); assert.ok(Math.abs(r.rise-55/49)<1e-10);
});
for (const [age,weight,volume] of [['child',10,700],['term',3,240],['preterm',1,100]]) {
  test(`simple ${age} uses age-appropriate defaults`, () => {
    const r=calculate(withSimpleDefaults({...adult,age,weight,amount:10,amountUnit:'mlkg'}));
    assert.equal(r.status,'ok'); assert.equal(r.bloodVolumeMl,volume); assert.ok(Math.abs(r.rise-(10*weight*55/287)/(volume/100))<1e-10);
  });
}
test('simple mode overrides stale advanced assumptions without mutation', () => {
  const entered={...adult,bagVolume:258,bagHb:49,method:'independent',bloodVolume:5500,ebvPerKg:250};
  const input=withSimpleDefaults(entered);
  assert.equal(input.method,'weight'); assert.equal(input.bagVolume,287); assert.equal(input.bagHb,55); assert.equal(input.ebvPerKg,70);
  assert.equal(input.weight,70); assert.equal(input.startingHb,7); assert.equal(input.amount,1); assert.equal(entered.bagVolume,258);
});
for (const situation of ['', 'bleeding','hemolysis','fluid','pregnancy','exchange','other']) {
  test(`simple mode preserves applicability restriction: ${situation || 'unconfirmed'}`, () => {
    const r=calculate(withSimpleDefaults({...adult,situation})); assert.notEqual(r.status,'ok'); assert.equal(r.rise,undefined);
  });
}
test('simple mode preserves invalid inputs and zero amount', () => {
  assert.notEqual(calculate(withSimpleDefaults({...adult,weight:''})).status,'ok');
  assert.notEqual(calculate(withSimpleDefaults({...adult,age:'unknown'})).status,'ok');
  const r=calculate(withSimpleDefaults({...adult,amount:0})); assert.equal(r.rise,0); assert.equal(r.finalHb,7);
});
