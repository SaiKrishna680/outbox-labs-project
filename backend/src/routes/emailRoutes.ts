import { Router } from 'express';
import * as emailController from '../controllers/emailController';

const router = Router();

router.post('/schedule', emailController.schedule);
router.post('/campaigns', emailController.createCampaign);
router.get('/scheduled', emailController.listScheduled);
router.get('/sent', emailController.listSent);

export default router;
