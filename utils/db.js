import { MongoClient } from 'mongodb';

class DBClient {
  constructor() {
    const host = process.env.DB_HOST == null ? 'localhost' : process.env.DB_HOST;
    const port = process.env.DB_PORT == null ? 27017 : process.env.DB_PORT;
    const database = process.env.DB_DATABASE == null ? 'files_manager' : process.env.DB_DATABASE;
    const url = `mongodb://${host}:${port}`;
    this.client = new MongoClient(url, { useUnifiedTopology: true });
    this.client.connect().then(() => {
      this.db = this.client.db(database);
    }).catch((err) => {
      console.log(err);
    });
  }

  isAlive() {
    const status = this.client.topology.s.state;
    if (status === 'connected') {
      return true;
    }
    return false;
  }

  async nbUsers() {
    const collection = this.db.collection('users');
    const count = await collection.countDocuments();
    return count;
  }

  async nbFiles() {
    const collection = this.db.collection('files');
    const count = await collection.countDocuments();
    return count;
  }
}
const dbClient = new DBClient();
module.exports = dbClient;
