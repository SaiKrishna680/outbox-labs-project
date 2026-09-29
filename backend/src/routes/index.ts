import { Router } from 'express';
import { createBullBoard } from '@bull-board/api';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { ExpressAdapter } from '@bull-board/express';
import healthRouter from './health';
import emailRouter from './emailRoutes';
import slackRouter from './slackRoutes';
import { emailQueue } from '../queues/emailQueue';
import { searchEmails } from '../services/elasticsearch';

import authRouter from './authRoutes';
import { requireAuth } from '../middleware/auth';

const router = Router();

// BullMQ Dashboard (public for demo)
const serverAdapter = new ExpressAdapter();
serverAdapter.setBasePath('/api/admin/queues');
createBullBoard({
  queues: [new BullMQAdapter(emailQueue)],
  serverAdapter: serverAdapter,
});
router.use('/admin/queues', serverAdapter.getRouter());

// Public routes
router.use('/health', healthRouter);
router.use('/auth', authRouter);
router.use('/slack', slackRouter); // Moved to public, auth handled inside

// Protected routes
router.use('/emails', requireAuth, emailRouter);

// ES Search (protected)
router.get('/emails/search', requireAuth, async (req, res) => {
  const q = req.query.q as string;
  if (!q) { res.json({ success: true, data: [] }); return; }
  const data = await searchEmails(q);
  res.json({ success: true, data });
});

export default router;
