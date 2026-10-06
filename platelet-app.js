import { calculatePlatelets } from './platelet-calculator.js';
const get = id => document.getElementById(id);
const form = get('platelet-form');
const status = get('platelet-status');
const results = get('platelet-results');
const format = n => n.toLocaleString('en-US', { maximumFractionDigits: 2 });
const range = (a,b) => a === b ? format(a) : `${format(a)}–${format(b)}`;
function clear(message='Inputs changed. Calculate again.') {
  results.hidden = true; results.replaceChildren(); status.textContent = message; status.classList.remove('error');
}
function sync() {
  const adult = get('platelet-age').value === 'adult';
  for (const option of get('platelet-unit').options) option.hidden = option.disabled = adult ? option.value !== 'adultDose' : option.value === 'adultDose';
  if (adult) get('platelet-unit').value = 'adultDose';
  else if (get('platelet-unit').value === 'adultDose' || !get('platelet-unit').value) get('platelet-unit').value = 'ml';
  get('platelet-scope').textContent = adult ? 'Adult reference: 70 kg and one adult therapeutic dose only. No weight or multiple-dose scaling.' : get('platelet-age').value === 'child' ? 'Stable child below 15 kg, beyond the newborn period: reference available only for an entered amount of 5–10 mL/kg. Not a dosing recommendation.' : 'No newborn increment prediction is available in this tool.';
}
form.addEventListener('input',()=>clear());
form.addEventListener('change',event=>{
  clear();
  if (event.target.id === 'platelet-age') get('platelet-amount').value = '';
  sync();
  const situation = get('platelet-situation').value;
  if (situation && situation !== 'none') { status.textContent = calculatePlatelets({situation}).message; status.classList.add('error'); }
});
form.addEventListener('submit',event=>{
  event.preventDefault(); clear();
  const r=calculatePlatelets(Object.fromEntries(new FormData(form)));
  status.textContent = r.message;
  if (r.status !== 'ok') status.classList.add('error');
  else {
    for (const ref of r.references) {
      const card=document.createElement('div'); card.className='platelet-reference';
      const title=document.createElement('h3'); title.textContent={cbs:'Canadian Blood Services · one-hour reference',lifeblood:'Lifeblood · adult reference',child:'Lifeblood · stable-child approximation',zero:'Zero-amount arithmetic'}[ref.source];
      const rise=document.createElement('p'); rise.textContent=`${ref.approximate ? 'Approximate' : 'Reference'} rise: +${range(ref.low,ref.high)} ×10⁹/L`;
      const final=document.createElement('p'); final.textContent=`Starting count + reference rise: ${ref.approximate ? 'approximately ' : ''}${range(ref.finalLow,ref.finalHigh)} ×10⁹/L`;
      card.append(title,rise,final); results.append(card);
    }
    results.hidden=false;
  }
  if (window.matchMedia('(max-width: 850px)').matches) { status.tabIndex=-1; status.focus({preventScroll:true}); get('platelet-result-title').scrollIntoView({block:'start',behavior:'instant'}); }
});
form.addEventListener('reset',()=>{clear('Enter values and confirm applicability.');setTimeout(sync,0);});
sync();
