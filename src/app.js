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

}

function handlerScenario(client) {
  logger('Performing handler scenario');

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
