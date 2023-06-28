import express from 'express';
import router from './routes/index';

const port = process.env.PORT == null ? 5000 : process.env.PORT;

const app = express();
app.use(express.json());
app.use('/', router);

app.listen(port);
