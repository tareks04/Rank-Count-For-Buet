import test from 'node:test';
import assert from 'node:assert/strict';
import {
  BOARDS,
  CAP,
  DATA_FLOOR,
  FLOOR,
  MAX_MARK,
  SERIES,
  TOTAL_POOL,
  above,
  cutoffs,
  estimate,
  national,
  round10,
  validateMarkInput,
  verdict,
} from './rankEstimator';

test('series spans 470..600 and national(510) preserves exact published board sum', () => {
  const expected510Sum = BOARDS.reduce((acc, b) => acc + b.n, 0) - (BOARDS.length - 1);
  assert.equal(FLOOR, 470);
  assert.equal(DATA_FLOOR, 510);
  assert.equal(SERIES.length, MAX_MARK - FLOOR + 1);
  assert.equal(Math.round(national(510, 'likely')), expected510Sum);
  assert.equal(Math.round(national(510, 'worst')), expected510Sum);
  assert.ok(TOTAL_POOL > expected510Sum);
});

test('Dhaka direct interpolation matches published anchor points', () => {
  const dhaka = BOARDS[0];
  assert.equal(above(dhaka, 589, 'likely'), 0);
  assert.equal(above(dhaka, 557, 'likely'), 999);
  assert.equal(above(dhaka, 546, 'likely'), 1999);
  assert.equal(above(dhaka, 510, 'likely'), 7213);
});

test('extrapolation for 470..509 is monotonic and continuous at 510', () => {
  for (let m = FLOOR; m < DATA_FLOOR; m++) {
    assert.ok(
      national(m, 'likely') > national(m + 1, 'likely'),
      `Expected likely rank at ${m} > ${m + 1}`
    );
    assert.ok(
      national(m, 'worst') > national(m + 1, 'worst'),
      `Expected worst rank at ${m} > ${m + 1}`
    );
  }
});

test('Jessore #1 mark (593) yields national rank 1', () => {
  assert.equal(national(593, 'likely'), 1);
  assert.equal(national(593, 'worst'), 1);
  assert.equal(national(600, 'likely'), 1);
});

test('likely rank is always better or equal to worst-case rank across 470..600', () => {
  for (const pt of SERIES) {
    assert.ok(
      pt.likely <= pt.worst + 1e-6,
      `Expected likely (${pt.likely}) <= worst (${pt.worst}) at mark ${pt.m}`
    );
  }
});

test('cutoffs return valid marks inside [470, 600] where likely <= worst', () => {
  const c = cutoffs();
  assert.ok(c.likely >= FLOOR && c.likely <= MAX_MARK);
  assert.ok(c.worst >= c.likely && c.worst <= MAX_MARK);
  assert.ok(national(c.likely, 'likely') <= CAP);
  assert.ok(national(c.worst, 'worst') <= CAP);
});

test('verdict tiers align with BUET 10,000 cap', () => {
  assert.equal(verdict(estimate(568)).tier, 'safe');
  assert.equal(verdict(estimate(470)).tier, 'outside');

  const c = cutoffs();
  if (c.likely < c.worst) {
    assert.equal(verdict(estimate(c.likely)).tier, 'borderline');
  }
});

test('round10 rounds to nearest 10 with minimum of 1', () => {
  assert.equal(round10(1), 1);
  assert.equal(round10(4), 1);
  assert.equal(round10(5), 10);
  assert.equal(round10(3124), 3120);
  assert.equal(round10(3126), 3130);
});

test('validateMarkInput handles empty, invalid, below floor (<470), and 470..600 valid marks', () => {
  assert.deepEqual(validateMarkInput(''), { status: 'empty' });
  assert.equal(validateMarkInput('-5').status, 'invalid');
  assert.equal(validateMarkInput('601').status, 'invalid');
  assert.equal(validateMarkInput('469').status, 'below_floor');
  assert.deepEqual(validateMarkInput('470'), { status: 'valid', mark: 470 });
  assert.deepEqual(validateMarkInput('500'), { status: 'valid', mark: 500 });
  assert.deepEqual(validateMarkInput('536.4'), { status: 'valid', mark: 536 });
});
