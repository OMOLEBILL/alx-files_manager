import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import { ObjectID } from 'mongodb';
import dbClient from '../utils/db';
import redisClient from '../utils/redis';

export default class AuthController {
  static async getConnect(request, response) {
    const keyDuration = 24 * 3600;
    const authHeader = request.get('Authorization');
    if (authHeader) {
      const base64str = authHeader.split(' ')[1];
      const decodedstr = Buffer.from(base64str, 'base64').toString('binary');
      const creds = decodedstr.split(':');
      const passwordHash = crypto.createHash('sha1').update(creds[1]).digest('hex');
      const { db } = dbClient;
      const users = db.collection('users');
      const query = { email: creds[0] };
      const user = await users.findOne(query);
      if ((user) && (user.password === passwordHash)) {
        const authToken = uuidv4();
        const key = `auth_${authToken}`;
        await redisClient.set(key, user._id, keyDuration);
        response.status(200).json({ token: authToken });
      } else {
        response.status(401).json({ error: 'Unauthorized' });
      }
    }
  }

  static async getDisconnect(request, response) {
    const token = request.get('X-Token');
    const key = `auth_${token}`;
    const userId = await redisClient.get(key);
    const { db } = dbClient;
    const users = db.collection('users');
    const query = { _id: new ObjectID(userId) };
    const user = await users.findOne(query);
    if (user) {
      await redisClient.del(key);
      response.status(204);
      response.end();
    } else {
      response.status(401).json({ error: 'Unauthorized' });
    }
  }
}
