import { calculateOverallStatus, StatusTriad } from './statusEngine';

/**
 * 3-Status Engine Unit Tests
 * Tests all 8 truth table combinations for driveUploaded, sheetUpdated, and submitted flags.
 */
function runStatusEngineTests() {
  const testCases: Array<{ input: StatusTriad; expected: string }> = [
    { input: { driveUploaded: true, sheetUpdated: true, submitted: true }, expected: 'COMPLETED' },
    { input: { driveUploaded: false, sheetUpdated: false, submitted: false }, expected: 'NOT STARTED' },
    { input: { driveUploaded: true, sheetUpdated: false, submitted: false }, expected: 'PENDING' },
    { input: { driveUploaded: false, sheetUpdated: true, submitted: false }, expected: 'PENDING' },
    { input: { driveUploaded: false, sheetUpdated: false, submitted: true }, expected: 'PENDING' },
    { input: { driveUploaded: true, sheetUpdated: true, submitted: false }, expected: 'UNSUBMITTED_MATCH' },
    { input: { driveUploaded: true, sheetUpdated: false, submitted: true }, expected: 'PENDING' },
    { input: { driveUploaded: false, sheetUpdated: true, submitted: true }, expected: 'PENDING' },
  ];

  let passed = 0;
  testCases.forEach(({ input, expected }, idx) => {
    const result = calculateOverallStatus(input);
    if (result !== expected) {
      throw new Error(
        `Test case ${idx + 1} failed! Expected ${expected} for ${JSON.stringify(input)}, got ${result}`
      );
    }
    passed++;
  });

  return passed;
}

// Execute self-contained test suite
try {
  const totalPassed = runStatusEngineTests();
  console.log(`✅ All ${totalPassed} status engine unit tests passed!`);
} catch (err) {
  console.error('❌ Status engine unit test failure:', err);
  if (typeof process !== 'undefined' && process.exit) {
    process.exit(1);
  }
}
