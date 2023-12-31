import { ObjectID } from 'mongodb';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import mime from 'mime-types';
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

  static async getShow(request, response) {
    const token = request.get('X-Token');
    const key = `auth_${token}`;
    const userId = await redisClient.get(key);
    const { db } = dbClient;
    const users = db.collection('users');
    const query = { _id: new ObjectID(userId) };
    const user = await users.findOne(query);
    const files = db.collection('files');
    if (user !== null) {
      const fileId = request.params.id;
      const fileQuery = { _id: new ObjectID(fileId), userId: new ObjectID(userId) };
      const file = await files.findOne(fileQuery);
      if (file != null) {
        const returnFile = {
          id: file._id,
          userId: file.userId,
          name: file.name,
          type: file.type,
          isPublic: file.isPublic,
          parentId: file.parentId,
        };
        response.json(returnFile);
      } else {
        response.status(404).json({ error: 'Not found' });
      }
    } else {
      response.status(401).json({ error: 'Unauthorized' });
    }
  }

  static async getIndex(request, response) {
    const token = request.get('X-Token');
    const key = `auth_${token}`;
    const userId = await redisClient.get(key);
    const { db } = dbClient;
    const users = db.collection('users');
    const query = { _id: new ObjectID(userId) };
    const user = await users.findOne(query);
    const files = db.collection('files');
    const docArray = [];
    if (user !== null) {
      const queryParams = request.query;
      const { parentId = 0, page = 0 } = queryParams;
      const maxItems = 20;
      let lowerlimit = 0;
      if (typeof (page) === 'string' || page === 0) {
        lowerlimit = Number(page) * maxItems;
      }
      if (typeof (parentId) === 'string') {
        const folderQuery = { _id: new ObjectID(parentId), userId: new ObjectID(user._id) };
        const folder = await files.findOne(folderQuery);
        if (folder != null) {
          const query = { parentId: new ObjectID(parentId), userId: new ObjectID(user._id) };
          const pipeLine = [
            { $match: query },
            { $skip: lowerlimit },
            { $limit: maxItems },
          ];
          const agg = files.aggregate(pipeLine);
          await agg.forEach((doc) => {
            const finaldocument = {
              id: doc._id,
              userId: doc.userId,
              name: doc.name,
              type: doc.type,
              isPublic: doc.isPublic,
              parentId: doc.parentId,
            };
            docArray.push(finaldocument);
          });

          response.json(docArray);
        } else {
          response.json(docArray);
        }
      } else if (parentId === 0) {
        const query = { userId: new ObjectID(user._id) };
        const pipeLine = [
          { $match: query },
          { $skip: lowerlimit },
          { $limit: maxItems },
        ];
        const agg = files.aggregate(pipeLine);
        await agg.forEach((doc) => {
          const finalDocument = {
            id: doc._id,
            userId: doc.userId,
            name: doc.name,
            type: doc.type,
            isPublic: doc.isPublic,
            parentId: doc.parentId,
          };
          console.log(finalDocument);
          docArray.push(finalDocument);
        });
        response.json(docArray);
      }
    } else {
      response.status(401).json({ error: 'Unauthorized' });
    }
  }

  static async putPublish(request, response) {
    const token = request.get('X-Token');
    const key = `auth_${token}`;
    const userId = await redisClient.get(key);
    const { db } = dbClient;
    const users = db.collection('users');
    const query = { _id: new ObjectID(userId) };
    const user = await users.findOne(query);
    const files = db.collection('files');
    if (user !== null) {
      const fileId = request.params.id;
      const fileQuery = { _id: new ObjectID(fileId), userId: new ObjectID(user._id) };
      const file = await files.findOne(fileQuery);
      if (file !== null) {
        const update = {
          $set: {
            isPublic: true,
          },
        };
        const options = { returnDocument: 'after' };
        const result = await files.findOneAndUpdate(fileQuery, update, options);
        const updatedDoc = result.value;
        if (updatedDoc !== null) {
          const finalDocument = {
            id: updatedDoc._id,
            userId: updatedDoc.userId,
            name: updatedDoc.name,
            type: updatedDoc.type,
            isPublic: updatedDoc.isPublic,
            parentId: updatedDoc.parentId,
          };
          response.status(200).json(finalDocument);
        }
      } else {
        response.status(404).json({ error: 'Not found' });
      }
    } else {
      response.status(401).json({ error: 'Unauthorized' });
    }
  }

  static async putUnpublish(request, response) {
    const token = request.get('X-Token');
    const key = `auth_${token}`;
    const userId = await redisClient.get(key);
    const { db } = dbClient;
    const users = db.collection('users');
    const query = { _id: new ObjectID(userId) };
    const user = await users.findOne(query);
    const files = db.collection('files');
    if (user !== null) {
      const fileId = request.params.id;
      const fileQuery = { _id: new ObjectID(fileId), userId: new ObjectID(user._id) };
      const file = await files.findOne(fileQuery);
      if (file !== null) {
        const update = {
          $set: {
            isPublic: false,
          },
        };
        const options = { returnDocument: 'after' };
        const result = await files.findOneAndUpdate(fileQuery, update, options);
        const updatedDoc = result.value;
        if (updatedDoc !== null) {
          const finalDocument = {
            id: updatedDoc._id,
            userId: updatedDoc.userId,
            name: updatedDoc.name,
            type: updatedDoc.type,
            isPublic: updatedDoc.isPublic,
            parentId: updatedDoc.parentId,
          };
          response.status(200).json(finalDocument);
        }
      } else {
        response.status(404).json({ error: 'Not found' });
      }
    } else {
      response.status(401).json({ error: 'Unauthorized' });
    }
  }

  static async getFile(request, response) {
    const token = request.get('X-Token');
    const key = `auth_${token}`;
    const userId = await redisClient.get(key);
    const { db } = dbClient;
    const users = db.collection('users');
    const userQuery = { _id: new ObjectID(userId) };
    const user = await users.findOne(userQuery);
    const files = db.collection('files');
    const fileId = request.params.id;
    const fileQuery = { _id: new ObjectID(fileId) };
    const file = await files.findOne(fileQuery);
    console.log('GET /files/:id/data with an unpublished file linked to :id and user authenticated and owner');
    console.log(`file is ${file} and user is ${user}`);
    console.log(file);
    console.log(user);
    if (file !== null) {
      if (file.isPublic) {
        console.log(`file is open source ${file.isPublic}`);
        if (file.type === 'folder') {
          response.status(400).json({ error: 'A folder doesn\'t have content' });
          return;
        }
        fs.readFile(file.localPath, (err, data) => {
          if (err) {
            response.status(404).json({ error: 'Not found' });
            return;
          }
          const fileType = mime.lookup(file.name);
          if (fileType) {
            response.setHeader('Content-Type', fileType);
            response.writeHead(200);
            response.write(data);
            response.end();
          } else {
            response.writeHead(200);
            response.write(data);
            response.end();
          }
        });
      } else {
        // deal with case when user is authenticated or not owner of file
        if (!user || user._id.toString() !== file.userId.toString()) {
          response.status(404).json({ error: 'Not found' });
          return;
        }
        if (file.type === 'folder') {
          response.status(400).json({ error: 'A folder doesn\'t have content' });
          return;
        }
        fs.readFile(file.localPath, (err, data) => {
          if (err) {
            response.status(404).json({ error: 'Not found' });
            return;
          }
          console.log(`we have the file data as ${data}`);
          const fileType = mime.lookup(file.name);
          console.log(`filetype is ${fileType}`);
          if (fileType) {
            response.setHeader('Content-Type', fileType);
            response.writeHead(200);
            response.write(data);
            response.end();
          } else {
            response.writeHead(200);
            response.write(data);
            response.end();
          }
        });
      }
    } else {
      response.status(404).json({ error: 'Not found' });
    }
  }
}
