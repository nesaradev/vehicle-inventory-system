const { spawn } = require('child_process');
const electronPath = require('electron');

const env = { ...process.env };
delete env.ELECTRON_RUN_AS_NODE;

const electron = spawn(electronPath, ['.'], {
  env,
  stdio: 'inherit'
});

electron.on('error', (error) => {
  console.error('Failed to start Electron:', error);
  process.exitCode = 1;
});

electron.on('exit', (code) => {
  process.exitCode = code ?? 1;
});

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => {
    electron.kill(signal);
  });
}
