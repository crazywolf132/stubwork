import express from 'express';
import helmet from 'helmet';
import morgan from 'morgan';

import { hooks } from './middlware';

/** LOADING THE CONFIG */
require('./config/init');

/** SETTING UP THE SERVER */

const app: express.Application = express();
import routes from './routes';

app.use(morgan('dev'));
app.use(helmet());
app.use(hooks());
app.use('/', routes);
// We are going to load the config reader.

export default app;