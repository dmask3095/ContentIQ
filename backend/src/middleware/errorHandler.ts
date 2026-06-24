import { NextFunction, Request, Response } from 'express';
import { logger } from '../utils/logger';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorHandler(err: Error, req: Request, res: Response, _next: NextFunction): void {
  logger.error({ err, path: req.path }, 'unhandled error');
  res.status(500).json({ error: 'Internal server error' });
}
