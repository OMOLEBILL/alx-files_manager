import express from 'express';
import AppController from '../controllers/AppController';

const router = express.Router();
router.get('/status', AppController.getstatus);
router.get('/stats', AppController.getstats);

export default router;
