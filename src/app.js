import redis from 'redis';
import { createHash } from 'crypto';
import { Promise, promisifyAll } from 'bluebird';

promisifyAll(redis.RedisClient.prototype);
promisifyAll(redis.Multi.prototype);

const args = process.argv.slice(-2);

const randomKey = parseInt(Math.random() * Number.MAX_SAFE_INTEGER, 10);
const clientId = createHash('sha1').update(`${ process.pid }-{ randomKey }`)
                                   .digest('hex');

const STATES = {
  CHECK:    'CHECK',
  DEBUG:    'DEBUG',
  HANDLE:   'HANDLE',
  PRODUCE:  'PRODUCE',
  QUIT:     'QUIT'
};

const config = {
  channel: 'channel:subscribtion',

  producerKey:    'string:producer:0:id',
  handlerListKey: 'list:handler',

  producerKeyTtl: 15 * 1000,

  producerScenarioIterationDuration: 0.5 * 1000,
  handlerScenarioIterationDuration:  20 * 1000,

  handlerErrorChancePercentage: 0.05
};

const main = (createClientOptions = {}) => {

  const client = redis.createClient(createClientOptions);
  logger(`Thread started with clientId = ${ clientId }`);



  performScenario(client);

}

function performScenario(client, state = STATES.CHECK, message = '') {
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

  const {
    producerScenarioIterationDuration,
    channel,
    producerKey,
    producerKeyTtl,
    handlerListKey
  } = config;

  client.getAsync(producerKey)
    .then(producerValue => {

      if (producerValue !== clientId) {
        client.discard();
        clearInterval(intervalHandler);
        performScenario(client);

        return Promise.resolve('become a handler');
      } else {
        return client.llenAsync(handlerListKey)
          .then(count => new Promise(resolve => {
            function ping(times) {
              if (times <= 0) {
                resolve(`push ping for existing messages(${ count } times)`);
              }
              client(channel, 'ping');

              ping(times - 1);
            }

            ping(count);
          }));


      }

    });

  const intervalHandler = setInterval(() => {
    const randomKey = parseInt(Math.random() * Number.MAX_SAFE_INTEGER, 10);
    const message = createHash('sha1').update(`${ process.pid }-{ randomKey }`)
                                      .digest('sha1')
                                      .slice(8);

    client.rpushAsync(handlerListKey, message)
      .then(() => {
        return client.publish(channel, 'ping');
      })
      .catch(err => {

        clearTimeout(intervalHandler);
        performScenario(client, STATES.QUIT, err);

      });
  }, producerScenarioIterationDuration);

}

function handlerScenario(client) {
  logger('Performing handler scenario');

  const {
    handlerScenarioIterationDuration,
    handlerErrorChancePercentage,
    channel,
    producerKey,
    producerKeyTtl,
    handlerListKey,
    debuggerListKey
  } = config;

  const pubSubClient = redis.createClient();

  pubSubClient.subscribe(channel);

  pubSubClient.on('message', () => {
    Promise.resolve()
    .then(() => {

      return client.lpopAsync(handlerListKey);

    })
    .then(message => {

      switch (true) {
        case message === null:
          return Promise.resolve('already handled by another worker');

        case Math.random() < handlerErrorChancePercentage:
          return client.rpushAsync(debuggerListKey, message)
                   .then(() => Promise.resolve(`wrong message(${ message }) pushed to debug list`));

        default:
          return (new Promise((resolve, reject) => {
              // handle message your favorite way here

              resolve();
            }))
            .then(() => Promise.resolve(`message(${ message }) sucessfuly handled`));
      }

    })
    .then(report => {

      logger(report);

    })
    .catch(err => {

      clearTimeout(timeoutHandler);
      pubSubClient.unsubscribe(channel);
      pubSubClient.quit();
      performScenario(client, STATES.QUIT, err);

    });
  });

  const timeoutHandler = setTimeout(() => {

    pubSubClient.unsubscribe(channel);
    pubSubClient.quit();

    client.setAsync(producerKey, clientId, 'PX', producerKeyTtl, 'NX')
      .then(response => {

        if (response === void 0) {
          performScenario(client, STATES.HANDLE);
        } else {
          logger('become a producer');

          performScenario(client, STATES.PRODUCE);
        }

      })
      .catch(err => {

        logger(err);

      });

  }, handlerScenarioIterationDuration);

}

function outerScenario(client, message) {
  logger(`Performing quit scenario with message: ${ message }`);

  client.quit();
}

function logger(message) {
  // eslint-disable-next-line no-use-before-define
  console.log(`\n${ clientId } is:\n${ message }\n`);
}

main();
