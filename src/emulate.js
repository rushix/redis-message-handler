import child_process from 'child_process';

const scriptPath = './dist/app.js';

const workersNumberMax = 15;
const workersNumber = parseInt(Math.random() * workersNumberMax, 10);
const workersBlank = Array.from({ length: workersNumber }, (k, v) => v);

const killWorkerTimeout = 10 * 1000;

const workers = workersBlank.map(() => {
  return child_process.execFile('node', [scriptPath], (err, stdout = '', stderr = '') => {
    if (err) {
      console.error(`${ err }`);
    }

    console.log(stdout, stderr);
  });
});

// entry point
(function kill(w = workers) {
  console.log(`\nCurrent number of running workers: ${ w.length }\n`);

  if (w.length <= 0) {
    return child_process.execFile('node', [scriptPath, 'getErrors'], (err, stdout = '', stderr = '') => {
      if (err) {
        console.error(`${ err }`);
      }

      console.log(stdout, stderr);
    });
  }

  setTimeout(() => {

    const worker = w.pop();

    // hope that is far enough fits "electricity shutdown" case
    worker.kill('SIGINT');

    kill(w);

  }, killWorkerTimeout);
})();
