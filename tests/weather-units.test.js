// Verify independent unit selection and conversions against Timeline WX semantics.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync('src/pkjs/index.js', 'utf8');
const start = source.indexOf('function desiredTempUnit(');
const end = source.indexOf('function weatherIntervalMs(', start);
assert.ok(start !== -1 && end > start, 'unit conversion helpers must exist');
const context = {};
vm.createContext(context);
vm.runInContext(source.slice(start, end), context, {timeout: 1000});
const expected = {F: 68, C: 20, K: 293, R: 528};
for (const unit of ['F', 'C', 'K', 'R']) {
  assert.equal(context.desiredTempUnit({TEMP_UNIT:unit}), unit);
  assert.equal(context.convertCelsius(20, unit), expected[unit]);
  assert.equal(context.temperatureUnitId(unit), ['F','C','K','R'].indexOf(unit));
  for (const distance of ['mi','km']) {
    const settings = {TEMP_UNIT:unit,DISTANCE_UNIT:distance};
    assert.equal(context.desiredTempUnit(settings), unit);
    assert.equal(context.desiredDistanceUnit(settings), distance);
  }
}
assert.equal(context.desiredTempUnit({UNITS:'metric'}), 'C');
assert.equal(context.desiredDistanceUnit({UNITS:'metric'}), 'km');
assert.equal(context.desiredTempUnit({UNITS:'imperial'}), 'F');
assert.equal(context.desiredDistanceUnit({UNITS:'imperial'}), 'mi');
console.log('All independent unit combinations and legacy migrations passed');
