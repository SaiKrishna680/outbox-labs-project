import Redis from 'ioredis';
import { config } from './index';

export const redisConnection = config.redis.url 
  ? new Redis(config.redis.url, { maxRetriesPerRequest: null })
  : new Redis({
      host: config.redis.host,
      port: config.redis.port,
      maxRetriesPerRequest: null, // Required by BullMQ
    });

redisConnection.on('connect', () => {
  console.log('✅ Redis connected');
});

redisConnection.on('error', (err) => {
  console.error('❌ Redis connection error:', err.message);
});
