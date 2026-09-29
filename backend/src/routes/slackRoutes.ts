import { Router } from 'express';
import * as slackController from '../controllers/slackController';
import { requireAuth } from '../middleware/auth';

const router = Router();

router.get('/connect', requireAuth, slackController.connectSlack);
router.get('/callback', slackController.slackCallback);

export default router;
