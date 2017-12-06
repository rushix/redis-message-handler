import redis from 'redis';
import { createHash } from 'crypto';
import { Promise, promisifyAll } from bluebird;

promisifyAll(redis.RedisClient.prototype);
promisifyAll(redis.Multi.prototype);

const args = process.argv.slice(-2);

const randomKey = parseInt(Math.random() * Number.MAX_SAFE_INTEGER, 10);
const clientId = createHash('sha1').update(`${ process.pid }-{ randomKey }`)
                                   .digest('hex');

const main = () => {

}

main();
