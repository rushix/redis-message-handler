'use strict';

var _child_process = require('child_process');

var _child_process2 = _interopRequireDefault(_child_process);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var scriptPath = './dist/app.js';

var workersNumberMax = 15;
var workersNumber = parseInt(Math.random() * workersNumberMax, 10);
var workersBlank = Array.from({ length: workersNumber }, function (k, v) {
  return v;
});

var killWorkerTimeout = 10 * 1000;

var workers = workersBlank.map(function () {
  return _child_process2.default.execFile('node', [scriptPath], function (err) {
    var stdout = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : '';
    var stderr = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : '';

    if (err) {
      console.error('' + err);
    }

    console.log(stdout, stderr);
  });
});

// entry point
(function kill() {
  var w = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : workers;

  console.log('\nCurrent number of running workers: ' + w.length + '\n');

  if (w.length <= 0) {
    return _child_process2.default.execFile('node', [scriptPath, 'getErrors'], function (err) {
      var stdout = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : '';
      var stderr = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : '';

      if (err) {
        console.error('' + err);
      }

      console.log(stdout, stderr);
    });
  }

  setTimeout(function () {

    var worker = w.pop();

    // hope that is far enough fits "electricity shutdown" case
    worker.kill('SIGINT');

    kill(w);
  }, killWorkerTimeout);
})();