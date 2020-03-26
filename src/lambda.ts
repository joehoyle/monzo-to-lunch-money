import app from './http';
import serverless from 'serverless-http';

module.exports.handler = serverless(app);
