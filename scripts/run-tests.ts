import { spawnSync } from 'node:child_process';
import { readdirSync } from 'node:fs';
import path from 'node:path';
import { messages } from '../src/utils/message';

const TEST_FILE_SUFFIX = '.test.ts';
const testDirectory = path.resolve(__dirname, '..', 'tests');
const testFiles = readdirSync(testDirectory, {
  withFileTypes: true,
})
  .filter((entry) => entry.isFile() && entry.name.endsWith(TEST_FILE_SUFFIX))
  .map((entry) => path.join(testDirectory, entry.name))
  .sort();

if (testFiles.length === 0) {
  console.error(messages.noTestFiles.en);
  process.exitCode = 1;
} else {
  const result = spawnSync(process.execPath, ['--import', 'tsx', '--test', ...testFiles], {
    stdio: 'inherit',
  });
  if (result.error || result.signal) {
    console.error(messages.testRunnerFailed.en, result.error || result.signal);
  }
  process.exitCode = result.status ?? 1;
}
