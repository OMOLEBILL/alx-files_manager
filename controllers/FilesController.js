import { ObjectID } from 'mongodb';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import redisClient from '../utils/redis';
import dbClient from '../utils/db';

export default class FilesController {
  static async postUpload(request, response) {
    const token = request.get('X-Token');
    const key = `auth_${token}`;
    const userId = await redisClient.get(key);
    const { db } = dbClient;
    const users = db.collection('users');
    const files = db.collection('files');
    const query = { _id: new ObjectID(userId) };
    const user = await users.findOne(query);
    if (user) {
      const fileData = request.body;
      const {
        name, type, parentId = 0, isPublic = false, data = null,
      } = fileData;
      if (!name) {
        response.status(400).json({ error: 'Missing name' });
        return;
      }
      if (!type) {
        response.status(400).json({ error: 'Missing type' });
        return;
      }
      if (!data && type !== 'folder') {
        response.status(400).json({ error: 'Missing data' });
        return;
      }
      if (parentId !== 0) {
        const file = await files.findOne({ _id: new ObjectID(parentId) });
        if (!file) {
          response.status(400).json({ error: 'Parent not found' });
          return;
        }
        if (file && file.type !== 'folder') {
          response.status(400).json({ error: 'Parent is not a folder' });
          return;
        }
      }
      if (type === 'folder') {
        const file = {
          userId: user._id,
          name,
          type,
          isPublic,
          parentId,
        };
        const result = await files.insertOne(file);
        const returnFile = {
          id: result.insertedId,
          userId: user._id,
          name,
          type,
          isPublic,
          parentId,
        };
        response.status(201).json(returnFile);
      } else {
        const folderPath = process.env.FOLDER_PATH == null ? '/tmp/files_manager' : process.env.FOLDER_PATH;
        fs.mkdir(folderPath, { recursive: true }, (err) => {
          console.error(err);
        });
        const filePath = `${folderPath}/${uuidv4()}`;
        fs.appendFile(filePath, Buffer.from(data, 'base64').toString('binary'), (err) => {
          console.error(err);
        });
        const file = {
          userId: user._id,
          name,
          type,
          isPublic,
          parentId,
          localPath: filePath,
        };
        const result = await files.insertOne(file);
        const returnFile = {
          id: result.insertedId,
          userId: user._id,
          name,
          type,
          isPublic,
          parentId,
        };
        response.status(201).json(returnFile);
      }
    } else {
      response.status(401).json({ error: 'Unauthorized' });
    }
  }
}
