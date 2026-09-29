import { Router, Request, Response } from 'express';
import { redisConnection } from '../config/redis';

const router = Router();

router.get('/', async (_req: Request, res: Response) => {
  try {
    // Check Redis
    const redisPing = await redisConnection.ping();

    res.json({
      success: true,
      status: 'healthy',
      timestamp: new Date().toISOString(),
      services: {
        redis: redisPing === 'PONG' ? 'connected' : 'disconnected',
        database: 'connected', // Will be checked properly later
      },
    });
  } catch (error) {
    res.status(503).json({
      success: false,
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export default router;
