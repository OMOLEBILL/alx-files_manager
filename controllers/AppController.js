import dbClient from '../utils/db';
import redisClient from '../utils/redis';

export default class AppController {
  static getstatus(request, response) {
    const data = { redis: redisClient.isAlive(), db: dbClient.isAlive() };
    response.status(200).send(data);
  }

  static async getstats(request, response) {
    const data = { users: await dbClient.nbUsers(), files: await dbClient.nbFiles() };
    response.status(200).send(data);
  }
}
