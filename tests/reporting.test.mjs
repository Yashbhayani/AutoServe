import test from 'node:test';
import assert from 'node:assert/strict';
import {csvDocument,dailySeries} from '../src/lib/reporting.ts';
test('CSV quotes delimiters and protects formulas in user input',()=>{const csv=csvDocument([['=HYPERLINK("x")',' +SUM(A1)','Name, with comma','say "yes"',12.5,-3]]);assert.match(csv,/"'=HYPERLINK\(""x""\)"/);assert.match(csv,/"' \+SUM\(A1\)"/);assert.match(csv,/"Name, with comma"/);assert.match(csv,/"say ""yes"""/);assert.match(csv,/"-3"/);});
test('daily series fills absent days and includes both endpoints',()=>{assert.deepEqual(dailySeries('2026-10-01','2026-10-03',[{day:'2026-10-02',value:'40'}]),[{month:'2026-10-01',value:0},{month:'2026-10-02',value:40},{month:'2026-10-03',value:0}]);});
