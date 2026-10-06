// Published response references, not a platelet mass-balance or dose-prescribing model.
export const PLATELET_EXCLUSIONS = ['bleeding','consumption','immune','sequestration','fluid','pregnancy','exchange','other'];
const fail = (status, message) => ({ status, message });
const numeric = value => typeof value === 'number' ? value : typeof value === 'string' && value.trim() !== '' ? Number(value) : NaN;
export function calculatePlatelets(input) {
  if (PLATELET_EXCLUSIONS.includes(input.situation)) return fail('excluded','Results withheld: platelet consumption, destruction, sequestration, or another excluded situation can invalidate these references.');
  if (input.situation !== 'none') return fail('excluded','Confirm that none of the listed exclusions applies before calculating.');
  if (!['adult','child','term','preterm'].includes(input.age)) return fail('invalid','Select a supported age category.');
  if (['term','preterm'].includes(input.age)) return fail('unsupported','No newborn prediction is implemented: the reviewed neonatal guidance describes transfusion volumes, not a validated count-increment equation.');
  const weightKg = numeric(input.weight);
  const starting = numeric(input.starting);
  const amount = numeric(input.amount);
  if (input.age === 'child' && (!Number.isFinite(weightKg) || weightKg < 0.1 || weightKg > 500)) return fail('invalid','Enter child weight between 0.1 and 500 kg (software limits, not clinical thresholds).');
  if (!Number.isFinite(starting) || starting < 0 || starting > 2000) return fail('invalid','Enter a starting platelet count from 0 to 2,000 ×10⁹/L (software limits, not clinical thresholds).');
  if (!Number.isFinite(amount) || amount < 0 || amount > 100000) return fail('invalid','Enter a finite, nonnegative platelet amount no greater than 100,000 (software limit).');
  if (input.age === 'adult' && input.unit !== 'adultDose') return fail('invalid','Adult reference amounts must be adult therapeutic doses, not individual whole-blood donor units or mL.');
  if (input.age === 'child' && !['ml','mlkg'].includes(input.unit)) return fail('invalid','Child amounts must be actual mL or mL/kg.');
  if (amount === 0) return {status:'ok',kind:'zero',references:[{source:'zero',low:0,high:0,finalLow:starting,finalHigh:starting}],message:'Zero entered platelet amount: zero added count by arithmetic only, not a prediction of the subsequent measured count.'};
  let references;
  if (input.age === 'adult') {
    if (amount !== 1) return fail('unsupported','The published adult reference describes one adult therapeutic dose. No aliquot scaling or multiple-dose prediction is implemented.');
    references = [{source:'cbs',low:15,high:25},{source:'lifeblood',low:20,high:40}];
  } else {
    // Conservative interface scope: RCH uses adult-unit dosing above 15 kg.
    if (weightKg >= 15) return fail('unsupported','This child reference is conservatively limited to children below 15 kg beyond the newborn period. No adult-unit extrapolation for larger children is implemented.');
    const mlkg = input.unit === 'ml' ? amount / weightKg : amount;
    const totalMl = mlkg * weightKg;
    if (totalMl > 100000) return fail('invalid','Converted volume exceeds the 100,000 mL software limit.');
    if (mlkg < 5 || mlkg > 10) return fail('unsupported','Lifeblood describes approximately +50 ×10⁹/L in a stable child for an entered amount of 5–10 mL/kg. Values outside that reference are not extrapolated.');
    references = [{source:'child',low:50,high:50,approximate:true}];
  }
  return {status:'ok',kind:input.age,references:references.map(r=>({...r,finalLow:starting+r.low,finalHigh:starting+r.high})),message:input.age === 'adult' ? 'Published 70 kg adult reference—not adjusted to an individual’s weight and not a patient-specific forecast or confidence interval.' : 'Published reference only—not a patient-specific forecast, confidence interval, transfusion recommendation, or clinical validation.'};
}
