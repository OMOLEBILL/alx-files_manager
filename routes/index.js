import express from 'express';
import AppController from '../controllers/AppController';
import UsersController from '../controllers/UsersController';

const router = express.Router();
router.get('/status', AppController.getstatus);
router.get('/stats', AppController.getstats);
router.post('/users', UsersController.postNew);

export default router;
