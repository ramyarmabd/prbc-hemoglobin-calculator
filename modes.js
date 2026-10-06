import { DEFAULT_EBV } from './calculator.js';

// Simple mode always uses explicit defaults, never hidden advanced values.
export function withSimpleDefaults(input) {
  return { ...input, bagVolume: 287, bagHb: 55, method: 'weight', ebvPerKg: DEFAULT_EBV[input.age], lemmensIndex: 70, referenceBmi: 22 };
}
