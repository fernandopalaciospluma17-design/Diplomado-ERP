import { spawnSync } from 'node:child_process';

const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const environment = {
  ...process.env,
  LOG_LEVEL: 'fatal',
  RUN_MONGO_INTEGRATION: '1',
  MONGODB_URI: process.env.MONGODB_URI ?? 'mongodb://127.0.0.1:27018/erp?replicaSet=rs0&directConnection=true'
};

const commands = [
  ['run', 'typecheck'],
  ['test'],
  ['--prefix', 'backend', 'run', 'test:integration'],
  ['run', 'build']
];

for (const args of commands) {
  console.log(`\n> ${npm} ${args.join(' ')}`);
  const command = process.platform === 'win32' ? (process.env.ComSpec ?? 'cmd.exe') : npm;
  const commandArgs = process.platform === 'win32' ? ['/d', '/s', '/c', `${npm} ${args.join(' ')}`] : args;
  const result = spawnSync(command, commandArgs, { stdio: 'inherit', env: environment });
  if (result.error) {
    console.error(result.error.message);
    process.exit(1);
  }
  if (result.status !== 0) process.exit(result.status ?? 1);
}

console.log('\nClosure audit passed: typecheck, tests, Mongo integration, and build.');