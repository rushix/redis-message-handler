'use strict';

var _redis = require('redis');

var _redis2 = _interopRequireDefault(_redis);

var _crypto = require('crypto');

var _bluebird = require('bluebird');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

(0, _bluebird.promisifyAll)(_redis2.default.RedisClient.prototype);

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

var config = {
  channel: 'channel:subscribtion',

  producerKey: 'string:producer:0:id',
  handlerListKey: 'list:handler',
  debuggerListKey: 'list:debugger',

  producerKeyTtl: 15 * 1000,

  producerScenarioIterationDuration: 0.5 * 1000,
  handlerScenarioIterationDuration: 2 * 1000,

  handlerErrorChancePercentage: 0.05
};

var createClientOptions = {};

// entry point
(function () {

  var client = _redis2.default.createClient(createClientOptions);
  logger('Thread started with clientId = ' + clientId);

  client.on('error', function (err) {

    performScenario(client, STATES.QUIT, err);
  });

  performScenario(client);
})();

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

  var debuggerListKey = config.debuggerListKey;


  client.lrangeAsync(debuggerListKey, 0, -1).then(function (debuggerValues) {

    logger('' + debuggerValues);

    client.del(debuggerListKey);
    performScenario(client, STATES.QUIT, 'debugger scenario successfuly performed');
  }).catch(function (err) {

    performScenario(client, STATES.QUIT, err);
  });
}

function producerScenario(client) {
  logger('Performing producer scenario');

  var producerScenarioIterationDuration = config.producerScenarioIterationDuration,
      channel = config.channel,
      producerKey = config.producerKey,
      producerKeyTtl = config.producerKeyTtl,
      handlerListKey = config.handlerListKey;


  client.getAsync(producerKey).then(function (producerValue) {

    logger('' + producerValue);

    if (producerValue !== clientId) {
      clearInterval(intervalHandler);
      performScenario(client, STATES.HANDLE);

      return _bluebird.Promise.resolve('become a handler');
    } else {
      return client.llenAsync(handlerListKey).then(function (count) {
        return new _bluebird.Promise(function (resolve) {

          function ping(times) {
            if (times <= 0) {
              return resolve('push ping for existing messages(' + count + ' times)');
            }
            client.publish(channel, 'ping');

            ping(times - 1);
          }

          ping(count);
        });
      }).then(function (report) {

        logger('' + report);
      }).catch(function (err) {

        performScenario(client, STATES.QUIT, err);
      });
    }
  });

  var intervalHandler = setInterval(function () {
    var message = (0, _crypto.randomBytes)(5).toString('hex');

    logger('producing ' + message);

    client.rpushAsync(handlerListKey, message).then(function () {

      client.set(producerKey, clientId, 'PX', producerKeyTtl, 'XX');
      client.publish(channel, 'ping');
    }).catch(function (err) {

      clearTimeout(intervalHandler);
      performScenario(client, STATES.QUIT, err);
    });
  }, producerScenarioIterationDuration);
}

function handlerScenario(client) {
  logger('Performing handler scenario');

  var handlerScenarioIterationDuration = config.handlerScenarioIterationDuration,
      handlerErrorChancePercentage = config.handlerErrorChancePercentage,
      channel = config.channel,
      producerKey = config.producerKey,
      producerKeyTtl = config.producerKeyTtl,
      handlerListKey = config.handlerListKey,
      debuggerListKey = config.debuggerListKey;


  var pubSubClient = _redis2.default.createClient();

  pubSubClient.subscribe(channel);

  pubSubClient.on('message', function () {
    _bluebird.Promise.resolve().then(function () {

      return client.lpopAsync(handlerListKey);
    }).then(function (message) {

      switch (true) {
        case message === null:
          return _bluebird.Promise.resolve('already handled by another worker');

        case Math.random() < handlerErrorChancePercentage:
          return client.rpushAsync(debuggerListKey, message).then(function () {
            return _bluebird.Promise.resolve('wrong message(' + message + ') pushed to debug list');
          });

        default:
          return new _bluebird.Promise(function (resolve, reject) {
            // handle message your favorite way here

            resolve();
          }).then(function () {
            return _bluebird.Promise.resolve('message(' + message + ') sucessfuly handled');
          });
      }
    }).then(function (report) {

      logger(report);
    }).catch(function (err) {

      clearTimeout(timeoutHandler);
      pubSubClient.unsubscribe(channel);
      pubSubClient.quit();
      performScenario(client, STATES.QUIT, err);
    });
  });

  var timeoutHandler = setTimeout(function () {

    pubSubClient.unsubscribe(channel);
    pubSubClient.quit();

    client.setAsync(producerKey, clientId, 'PX', producerKeyTtl, 'NX').then(function (response) {

      if (response === null) {
        performScenario(client, STATES.HANDLE);
      } else {
        logger('become a producer');

        performScenario(client, STATES.PRODUCE);
      }
    }).catch(function (err) {

      logger(err);
    });
  }, handlerScenarioIterationDuration);
}

function outerScenario(client, message) {
  logger('Performing quit scenario with message: ' + message);

  client.quit();
}

function logger(message) {
  // eslint-disable-next-line no-use-before-define
  console.log('\n' + clientId + ' is:\n' + message + '\n');
}