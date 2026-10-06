import { calculate, DEFAULT_EBV, NADLER } from './calculator.js';
import { withSimpleDefaults } from './modes.js';

const form = document.getElementById('calculator-form');
const get = id => document.getElementById(id);
const status = get('result-status');
const numericOutputs = ['rise', 'finalHb', 'weight-used', 'volume-used', 'mass-used', 'blood-used', 'method-note', 'rch-result'];
const format = (value, digits = 2) => value.toLocaleString('en-US', { minimumFractionDigits: digits, maximumFractionDigits: digits });
let mode = 'simple';

function setMode(next) {
  mode = next;
  const simple = mode === 'simple';
  get('advanced-settings').hidden = simple;
  get('simple-mode').setAttribute('aria-pressed', String(simple));
  get('advanced-mode').setAttribute('aria-pressed', String(!simple));
  if (simple) {
    const defaults = withSimpleDefaults({ age: get('age').value });
    for (const id of ['bagVolume', 'bagHb', 'method', 'ebvPerKg', 'lemmensIndex', 'referenceBmi']) get(id).value = defaults[id];
    get('product').value = 'cbs';
    get('ebv-help').textContent = ageHelp[get('age').value];
  }
  get('simple-defaults').hidden = !simple;
  get('simple-defaults').textContent = `Defaults: Canadian product example (287 mL / 55 g Hb); blood volume ${DEFAULT_EBV[get('age').value]} mL/kg. Advanced lets you change these assumptions.`;
  clearResults(simple ? 'Simple mode uses default assumptions. Enter values and confirm applicability.' : 'Advanced mode: review the product and blood-volume assumptions, then calculate.');
  syncFields();
}

function clearResults(message = 'Inputs changed. Calculate again to update the estimate.') {
  get('result-values').hidden = true;
  get('rch-panel').hidden = true;
  numericOutputs.forEach(id => { get(id).textContent = ''; });
  status.textContent = message;
  status.classList.remove('error');
}
function revealResult() {
  if (window.matchMedia('(max-width: 850px)').matches) {
    status.tabIndex = -1;
    status.focus({ preventScroll: true });
    get('result-title').scrollIntoView({ block: 'start', behavior: 'instant' });
  }
}
function syncFields() {
  const adult = get('age').value === 'adult';
  for (const option of get('amountUnit').options) option.disabled = option.hidden = !adult && !['ml', 'mlkg'].includes(option.value);
  if (!adult && !['ml', 'mlkg'].includes(get('amountUnit').value)) get('amountUnit').value = 'ml';
  for (const option of get('method').options) option.disabled = option.hidden = !adult && ['nadler', 'lemmens'].includes(option.value);
  if (!adult && ['nadler', 'lemmens'].includes(get('method').value)) get('method').value = 'weight';
  const method = get('method').value;
  get('weight-fields').hidden = method !== 'weight';
  get('height-fields').hidden = !['nadler', 'lemmens'].includes(method);
  get('nadler-fields').hidden = method !== 'nadler';
  get('lemmens-fields').hidden = method !== 'lemmens';
  get('independent-fields').hidden = method !== 'independent';
  // Disabled inactive inputs avoid extraneous validation and keyboard focus.
  for (const id of ['weight-fields', 'height-fields', 'nadler-fields', 'lemmens-fields', 'independent-fields']) {
    for (const field of get(id).querySelectorAll('input, select')) field.disabled = get(id).hidden;
  }
  const [a, b, c] = NADLER[get('nadlerSet').value];
  get('nadler-equation').textContent = `BV (mL) = 1,000 × [${a} × height(m)³ + ${b} × weight(kg) + ${c}].`;
}
const ageHelp = {
  adult: 'Adult default: 70 mL/kg. Fixed mL/kg may misestimate blood volume, particularly with obesity or atypical body composition.',
  child: 'Older infant/child default: 70 mL/kg (NBA Appendix G). Adjust for age and the intended assumption; this is not an individually measured volume.',
  term: 'Term newborn default: 80 mL/kg. NBA Appendix G describes 80–85 mL/kg; the default matches its neonatal table.',
  preterm: 'Very preterm newborn default: 100 mL/kg, matching the NBA table. Appendix G describes 100–120 mL/kg for extremely preterm infants. Adjust the assumption as appropriate.'
};
form.addEventListener('input', event => {
  clearResults();
  if (['bagVolume', 'bagHb'].includes(event.target.id)) get('product').value = 'custom';
});
form.addEventListener('change', event => {
  clearResults();
  if (event.target.id === 'age') {
    get('ebvPerKg').value = DEFAULT_EBV[get('age').value];
    get('ebv-help').textContent = ageHelp[get('age').value];
    // Amount units change meaning; require deliberate re-entry on age-group changes.
    get('amount').value = '';
  }
  if (event.target.id === 'product' && event.target.value !== 'custom') {
    const pair = event.target.value === 'cbs' ? [287, 55] : [258, 49];
    get('bagVolume').value = pair[0]; get('bagHb').value = pair[1];
  }
  syncFields();
  get('simple-defaults').textContent = `Defaults: Canadian product example (287 mL / 55 g Hb); blood volume ${DEFAULT_EBV[get('age').value]} mL/kg. Advanced lets you change these assumptions.`;
  if (get('situation').value && get('situation').value !== 'none') {
    status.textContent = calculate({ situation: get('situation').value }).message;
    status.classList.add('error');
  }
});
form.addEventListener('submit', event => {
  event.preventDefault();
  clearResults();
  const entered = Object.fromEntries(new FormData(form));
  const input = mode === 'simple' ? withSimpleDefaults(entered) : entered;
  const result = calculate(input);
  if (result.status !== 'ok') {
    status.textContent = result.message;
    status.classList.add('error');
    revealResult();
    return;
  }
  get('rise').textContent = format(result.rise);
  get('finalHb').textContent = format(result.finalHb);
  get('weight-used').textContent = `${format(result.weightKg, 3)} kg`;
  get('volume-used').textContent = `${format(result.transfusedMl)} mL`;
  get('mass-used').textContent = `${format(result.deliveredHbG)} g`;
  get('blood-used').textContent = `${format(result.bloodVolumeMl)} mL`;
  get('method-note').textContent = result.method === 'lemmens' && (Number(input.lemmensIndex) !== 70 || Number(input.referenceBmi) !== 22) ? 'User-modified Lemmens coefficients; this is not the published equation.' : '';
  if (result.rch.status !== 'not-applicable') {
    get('rch-panel').hidden = false;
    get('rch-result').textContent = result.rch.status === 'available' ? `Approximate rise: ${format(result.rch.rise)} g/dL. Approximate final Hb: ${format(result.rch.finalHb)} g/dL.` : result.rch.message;
  }
  get('result-values').hidden = false;
  status.textContent = `Calculation complete. Estimated Hb rise ${format(result.rise)} g/dL; estimated final Hb ${format(result.finalHb)} g/dL. Educational estimator, not clinically validated.`;
  revealResult();
});
form.addEventListener('reset', () => {
  clearResults('Enter values and confirm the model applies, then calculate.');
  // Native reset runs after this event.
  setTimeout(() => { syncFields(); get('amountUnit').value = 'units'; setMode('simple'); }, 0);
});
get('simple-mode').addEventListener('click', () => setMode('simple'));
get('advanced-mode').addEventListener('click', () => setMode('advanced'));
setMode('simple');
