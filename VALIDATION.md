# Software validation record

Review and checks: October 5, 2026. **Educational estimator—not clinically validated.**

## Calculator-first simple/advanced update (1.1.0)

All **113 tests passed** (100 calculation checks plus 13 tests of the exact production simple-defaults module). Simple defaults preserve exclusion and validation checks, override stale advanced assumptions, and use age-specific blood volumes. The mass-balance calculation module is unchanged.

Browser checks at desktop 1280 × 900 and phone 390 × 844 verified: Simple starts with advanced settings hidden; methodology and sources start collapsed; inputs use 18 px text; adult Simple returns 1.12 / 8.12; Advanced Lifeblood returns 1.00 rise; returning to Simple resets product assumptions, preserves patient inputs, and clears results; advanced Nadler returns 4,997.16 mL; child Simple returns 2.74 rise with separate RCH 2.00 rise; term Simple returns 2.40 rise with no RCH result; all six exclusions withhold numbers; blank inputs immediately clear outputs; Reset restores Simple and adult unit defaults. On phone, submission brings the result or error into view. Disclosure sections can be expanded by the user.

These are browser viewport checks, not physical iPhone/Safari or formal screen-reader tests. No clinical validation is implied.

## CancerTime-inspired visual update (1.0.2)

Adapted CancerTime’s warm canvas, Avenir typography, rounded surface cards, pill buttons, and navigation using burgundy and rose accents. Calculation code, source content, input limits, and exclusions were unchanged. All 100 production-code tests passed again. Browser preview checks at desktop and 390 × 844 confirmed the new layout, adult example (1.12 / 8.12), immediate clearing after blanking weight, and withheld results for active bleeding. No physical iPhone/Safari or formal assistive-technology audit was performed.

## Automated production-code checks

`npm test`: **100 tests passed, 0 failed** on Node.js 26.10.0 locally. The GitHub workflow also runs the suite on Node.js 22.

The tests import `calculator.js`, the same module imported by `app.js` in production. Expected numbers use independently worked arithmetic and published examples rather than copies of the production functions.

| Coverage | Independent expected result |
| --- | --- |
| 70 kg, 70 mL/kg, 1 Canadian example unit, starting Hb 7 | 55 g / 49 dL = 1.1224489796 g/dL rise; final 8.1224489796 |
| Same adult, 1 Lifeblood example unit | 49 g / 49 dL = 1 g/dL rise |
| 143.5 mL Canadian example aliquot | 27.5 g delivered; rise 0.5612244898 |
| Adult 4 mL/kg, 250 mL/50 g reference | 280 mL, 56 g delivered; rise 1.1428571429 |
| 100 lb | 45.359237 kg |
| US / Imperial liquid pint | 473.176473 / 568.26125 mL |
| RCH 10 kg child, 100 mL, starting Hb 6 | Separate approximation rise 2; final 8 g/dL |
| NBA very preterm / term newborn tables | All 18 table values at starts 7/8/9 and amounts 10/15/20 mL/kg, using historical product concentration 0.21 g/mL and published rounding |
| Nadler historical male, 1.8 m, 70 kg | 4,997.1608 mL |
| Nadler historical female, 1.6 m, 60 kg | 3,626.6856 mL |
| Lemmens, 88 kg, 2 m, BMI 22 | 6,160 mL |
| Lemmens, 198 kg, 1.5 m, BMI 88 | 6,930 mL |
| Independent blood volume 5,500 mL, 55 g delivered | Rise 1 g/dL |
| Zero amount | Zero rise, unchanged starting Hb |

Additional cases: fractional/multiple units, alternate weight and height units, custom blood-volume coefficients, adjusted neonatal blood volume, inactive inputs, RCH scope boundaries, blank/malformed/negative/nonfinite/out-of-range inputs, denominator zero, converted-volume limits, unsupported pediatric units/methods, unknown selections, every exclusion, and unconfirmed applicability. Errors/exclusions return no numerical fields.

An initial hand-written Nadler male test expectation contained a 0.6 mL arithmetic transcription error. Independently recomputing the polynomial established 4,997.1608 mL; the expected fixture was corrected. The production formula was unchanged.

## Browser interface checks

Checked using the available in-app browser at a desktop viewport of 1280 × 900 and a phone viewport of 390 × 844. These are viewport checks, not a physical iPhone/Safari test.

- Adult default example displayed rise 1.12 and final 8.12 g/dL.
- Blanking a valid weight immediately hid the prior results and emptied the old numerical output; calculation displayed a required-input error.
- All six exclusion choices suppressed output.
- RCH child example displayed a separate rise 2.00 and final 8.00, while the Lifeblood mass-balance result was 2.71; no correction was applied.
- Nadler, Lemmens, and independent-volume controls calculated expected values; inactive fields were removed from focus and form submission.
- Zero amount displayed 0.00 rise and unchanged starting Hb.
- Reset cleared results and restored defaults.
- Phone layout stacked fields and result panels; visible input controls had 16 px text and 48 px height. Desktop layout used two columns.
- A software-limit stress case produced a long number that initially widened the phone page. Result wrapping was corrected; at 320 px, the page remained within the viewport even with the stress value. This is a layout test, not a clinically plausible example.

## GitHub and live deployment checks

- Public repository: https://github.com/ramyarmabd/prbc-hemoglobin-calculator
- GitHub Pages: https://ramyarmabd.github.io/prbc-hemoglobin-calculator/
- GitHub calculation CI passed on Node.js 22: https://github.com/ramyarmabd/prbc-hemoglobin-calculator/actions/runs/37385439433
- Initial Pages build/deployment completed successfully: https://github.com/ramyarmabd/prbc-hemoglobin-calculator/actions/runs/37385479192
- Live browser check: adult 70 kg / starting Hb 7 / 1 Canadian example unit returned rise 1.12 and final 8.12 g/dL.
- Live browser check: term newborn 3 kg / starting Hb 7 / 10 mL/kg / historical 100 mL–21 g reference / 80 mL/kg blood volume returned rise 2.63 and final 9.63 g/dL, with no RCH approximation displayed.
- Live invalid edits immediately emptied the old numeric output. Selecting pregnancy withheld results.
- The committed remote file tree was fetched and compared to the tested local implementation; hashes matched before the final layout/documentation update. Remote commits were published through the authenticated GitHub browser: terminal Git credentials were unavailable and the connector lacked write access to this newly created repository. No additional account permissions were granted.

No clinical validation, physical iPhone test, Safari compatibility test, or formal screen-reader audit has been performed. Original full text for the adult blood-volume formula papers was unavailable; the formula transcription was cross-checked against an accessible primary study table as documented in REFERENCES.md.

## Reproduce interface checks

1. Serve the repository and open the site in a browser.
2. Confirm no exclusions; enter adult 70 kg, starting Hb 7, 1 unit, Canadian reference, 70 mL/kg. Expect 1.12 / 8.12.
3. Blank weight. Expect old numbers to disappear immediately; calculate and confirm a required-input message.
4. Restore inputs; select each exclusion, calculate, and confirm that no results are visible.
5. Select child; confirm unit/method restrictions and amount clearing. Enter 10 kg, starting Hb 6, 100 mL, Lifeblood reference. Expect main rise 2.71 and separate RCH rise 2.00.
6. Test term newborn with 3 kg, starting Hb 7, 10 mL/kg, custom reference 100 mL / 21 g, 80 mL/kg. Expect rise 2.63 and final 9.63 (published table rounds final to 9.6).
7. Try adult Nadler, Lemmens, independent blood volume, zero amount, and reset.
8. Repeat at phone and desktop sizes; check keyboard focus, source links, visibility of notices, and absence of horizontal scrolling.
