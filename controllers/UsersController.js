import crypto from 'crypto';
import dbClient from '../utils/db';

export default class UsersController {
  static async postNew(request, response) {
    const data = request.body;
    let userEmail = null;
    let userPassword = null;
    if (data != null) {
      userEmail = data.email;
      userPassword = data.password;
    }
    if (!userEmail) {
      response.status(400).json({error :'Missing email'});
      response.end();
    }
    if (!userPassword) {
      response.status(400).json({error: 'Missing password'});
      response.end();
    }
    const db = dbClient.db;
    const users = db.collection('users');
    const query = {'email': userEmail};
    if ( userEmail && userPassword) {
      try {
        const user = await users.findOne(query); 
        if (!user) {
          const passwordHash = crypto.createHash('sha1').update(userPassword).digest('hex');
          const user = {email: userEmail, password: passwordHash};
          const result = await users.insertOne(user);
          response.status(201).json({'id': result.insertedId, email: userEmail});
        } else {
          response.status(400).json({error: 'Already exist'});
        }
      } catch (error) {
        console.error(error);
      }
    }
  }
}
