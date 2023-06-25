import { createClient } from 'redis';

class RedisClient {
  constructor() {
    this.client = createClient();
    this.client.on('error', (error) => {
      console.log(error);
    });
  }
  isAlive() {
    return this.client.connected;
  }
}

