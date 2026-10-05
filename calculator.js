// Browser and Node share this exact calculation module. No DOM, storage, or network access.
export const CONVERSIONS = Object.freeze({ lbToKg: 0.45359237, usPintToMl: 473.176473, imperialPintToMl: 568.26125, inchToCm: 2.54 });
export const DEFAULT_EBV = Object.freeze({ adult: 70, child: 70, term: 80, preterm: 100 });
export const NADLER = Object.freeze({ male: Object.freeze([0.3669, 0.03219, 0.6041]), female: Object.freeze([0.3561, 0.03308, 0.1833]) });
export const EXCLUSIONS = Object.freeze(['bleeding', 'hemolysis', 'fluid', 'pregnancy', 'exchange', 'other']);

// Broad arithmetic guardrails, selected for software integrity, not clinical thresholds.
export const LIMITS = Object.freeze({ weightKg: [0.1, 500], startingHb: [0, 30], amount: [0, 100000], bagVolume: [1, 2000], bagHb: [0.01, 400], ebvPerKg: [1, 300], heightCm: [50, 250], bloodVolume: [1, 100000], lemmensIndex: [1, 300], referenceBmi: [1, 100] });

function numeric(value, name, range) {
  if ((typeof value !== 'number' && typeof value !== 'string') || String(value).trim() === '') throw new Error(`${name} is required.`);
  const n = Number(value);
  if (!Number.isFinite(n) || n < range[0] || n > range[1]) throw new Error(`${name} must be a finite number from ${range[0]} to ${range[1]}. These are software input limits, not clinical thresholds.`);
  return n;
}
function choice(value, choices, name) {
  if (!choices.includes(value)) throw new Error(`Select a valid ${name}.`);
  return value;
}

export function calculate(input) {
  try {
    // Exclusion precedes all arithmetic: no numerical results leave this module.
    if (EXCLUSIONS.includes(input?.situation)) return { status: 'excluded', message: 'Results withheld: this situation is outside the model. Use clinical assessment and appropriate local guidance.' };
    if (input?.situation !== 'none') return { status: 'unconfirmed', message: 'Confirm the model applies by selecting the clinical situation.' };
    const age = choice(input.age, Object.keys(DEFAULT_EBV), 'age group');
    const weightUnit = choice(input.weightUnit, ['kg', 'lb'], 'weight unit');
    const rawWeight = numeric(input.weight, 'Weight', [0, 2000]);
    const weightKg = numeric(rawWeight * (weightUnit === 'lb' ? CONVERSIONS.lbToKg : 1), 'Weight (kg)', LIMITS.weightKg);
    const startingHb = numeric(input.startingHb, 'Starting Hb (g/dL)', LIMITS.startingHb);
    const bagVolume = numeric(input.bagVolume, 'Reference-bag volume (mL)', LIMITS.bagVolume);
    const bagHb = numeric(input.bagHb, 'Reference-bag total Hb (g)', LIMITS.bagHb);
    const amount = numeric(input.amount, 'PRBC amount', LIMITS.amount);
    const amountUnit = choice(input.amountUnit, age === 'adult' ? ['units', 'ml', 'mlkg', 'usPint', 'imperialPint'] : ['ml', 'mlkg'], 'PRBC amount unit');
    const factors = { units: bagVolume, ml: 1, mlkg: weightKg, usPint: CONVERSIONS.usPintToMl, imperialPint: CONVERSIONS.imperialPintToMl };
    const transfusedMl = amount * factors[amountUnit];
    numeric(transfusedMl, 'Converted transfused volume (mL)', [0, 100000]);
    const method = choice(input.method, age === 'adult' ? ['weight', 'nadler', 'lemmens', 'independent'] : ['weight', 'independent'], 'blood-volume method');
    let bloodVolumeMl, bmi = null;
    if (method === 'independent') bloodVolumeMl = numeric(input.bloodVolume, 'Independently entered circulating blood volume (mL)', LIMITS.bloodVolume);
    else if (method === 'weight') bloodVolumeMl = weightKg * numeric(input.ebvPerKg, 'Estimated blood volume per kg (mL/kg)', LIMITS.ebvPerKg);
    else {
      const heightUnit = choice(input.heightUnit, ['cm', 'in'], 'height unit');
      const heightCm = numeric(numeric(input.height, 'Height', [0, 1000]) * (heightUnit === 'in' ? CONVERSIONS.inchToCm : 1), 'Height (cm)', LIMITS.heightCm);
      const heightM = heightCm / 100;
      if (method === 'nadler') {
        const coefficientSet = choice(input.nadlerSet, ['male', 'female'], 'historical Nadler coefficient set');
        const [a, b, c] = NADLER[coefficientSet];
        bloodVolumeMl = 1000 * (a * heightM ** 3 + b * weightKg + c);
      } else {
        bmi = weightKg / heightM ** 2;
        const index = numeric(input.lemmensIndex, 'Lemmens indexed-volume coefficient (mL/kg)', LIMITS.lemmensIndex);
        const referenceBmi = numeric(input.referenceBmi, 'Lemmens reference BMI (kg/m²)', LIMITS.referenceBmi);
        bloodVolumeMl = weightKg * index / Math.sqrt(bmi / referenceBmi);
      }
    }
    numeric(bloodVolumeMl, 'Calculated blood volume (mL)', LIMITS.bloodVolume);
    const deliveredHbG = transfusedMl * bagHb / bagVolume;
    const rise = deliveredHbG / (bloodVolumeMl / 100);
    const finalHb = startingHb + rise;
    if (![rise, finalHb, deliveredHbG].every(Number.isFinite)) throw new Error('The calculation exceeds software arithmetic limits.');
    // Algebraic inversion of the RCH volume formula: rise (g/dL) = mL / (5 × kg).
    // The RCH page confines its <20 kg volume guidance to an increment up to 20 g/L.
    const rchRise = transfusedMl / (5 * weightKg);
    const rch = age === 'child' && weightKg < 20 ? (rchRise <= 2 ? { status: 'available', rise: rchRise, finalHb: startingHb + rchRise } : { status: 'outside', message: 'RCH approximation withheld: the entered amount implies an increment beyond the 20 g/L scope of its published guidance.' }) : { status: 'not-applicable' };
    return { status: 'ok', weightKg, transfusedMl, bloodVolumeMl, deliveredHbG, rise, finalHb, bmi, method, rch };
  } catch (error) {
    return { status: 'invalid', message: error.message };
  }
}
