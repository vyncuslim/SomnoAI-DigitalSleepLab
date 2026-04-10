import serverless from 'serverless-http';
import { app } from './_server.js';

export default serverless(app);
