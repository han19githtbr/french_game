const test = require('node:test');
const assert = require('node:assert/strict');
require('ts-node/register/transpile-only');

const { buildResponseOptions } = require('../lib/ai-content');

test('buildResponseOptions expands to the requested size using fallback pool', () => {
  const options = buildResponseOptions('Bonjour', ['Bonjour'], 4, ['Salut', 'Au revoir', 'Merci']);

  assert.equal(options.length, 4);
  assert.ok(options.includes('Bonjour'));
  assert.ok(options.filter(option => option === 'Bonjour').length === 1);
  assert.ok(new Set(options).size === options.length);
});

test('buildResponseOptions avoids duplicates and preserves the correct answer', () => {
  const options = buildResponseOptions('La maison', ['La maison', 'Le chat'], 3, ['Le chien', 'Le jardin']);

  assert.equal(options.length, 3);
  assert.ok(options.includes('La maison'));
  assert.equal(options.filter(option => option === 'La maison').length, 1);
});
