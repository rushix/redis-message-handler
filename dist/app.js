'use strict';

var _redis = require('redis');

var _redis2 = _interopRequireDefault(_redis);

var _crypto = require('crypto');

var _bluebird = require('bluebird');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

(0, _bluebird.promisifyAll)(_redis2.default.RedisClient.prototype);
(0, _bluebird.promisifyAll)(_redis2.default.Multi.prototype);

var args = process.argv.slice(-2);

var randomKey = parseInt(Math.random() * Number.MAX_SAFE_INTEGER, 10);
var clientId = (0, _crypto.createHash)('sha1').update(process.pid + '-{ randomKey }').digest('hex');

var STATES = {
  CHECK: 'CHECK',
  DEBUG: 'DEBUG',
  HANDLE: 'HANDLE',
  PRODUCE: 'PRODUCE',
  QUIT: 'QUIT'
};

var main = function main() {
  var createClientOptions = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};


  var client = _redis2.default.createClient(createClientOptions);
  logger('Thread started with clientId = ' + clientId);

  performScenario(client);
};

function performScenario(client) {
  var state = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : STATES.CHECK;
  var message = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : '';

  switch (state) {
    case STATES.CHECK:
      checkerScenario(client);
      break;
    case STATES.DEBUG:
      debuggerScenario(client);
      break;
    case STATES.PRODUCE:
      producerScenario(client);
      break;
    case STATES.HANDLE:
      handlerScenario(client);
      break;
    default:
      outerScenario(client, message);
  }
}

function checkerScenario(client) {
  logger('Performing checker scenario');

  if (args.indexOf('getErrors') + 1) {
    performScenario(client, STATES.DEBUG);
  } else {
    performScenario(client, STATES.HANDLE);
  }
}

function debuggerScenario(client) {
  logger('Performing debugging scenario');

  performScenario(client, STATES.QUIT, 'debugger scenario successfuly performed');
}

function producerScenario(client) {
  logger('Performing producer scenario');
}

function handlerScenario(client) {
  logger('Performing handler scenario');
}

function outerScenario(client, message) {
  logger('Performing quit scenario with message: ' + message);

  client.quit();
}

function logger(message) {
  // eslint-disable-next-line no-use-before-define
  console.log('\n' + clientId + ' is:\n' + message + '\n');
}

main();