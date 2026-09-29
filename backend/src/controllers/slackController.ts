import { Request, Response } from 'express';
import prisma from '../config/prisma';
import { config } from '../config';
import { getOrCreateDummyAuth } from './emailController';

export const connectSlack = async (req: Request, res: Response) => {
  const userId = (req as any).user.id;
  const url = `https://slack.com/oauth/v2/authorize?client_id=${config.slack.clientId}&scope=incoming-webhook&redirect_uri=${config.slack.redirectUri}&state=${userId}`;
  res.json({ success: true, url });
};

export const slackCallback = async (req: Request, res: Response): Promise<void> => {
  const { code, state } = req.query;
  
  if (!code || !state) {
    res.status(400).send('No code or state provided');
    return;
  }
  
  const userId = state as string;

  try {
    const formData = new URLSearchParams();
    formData.append('client_id', config.slack.clientId);
    formData.append('client_secret', config.slack.clientSecret);
    formData.append('code', code as string);
    formData.append('redirect_uri', config.slack.redirectUri);

    const response = await fetch('https://slack.com/api/oauth.v2.access', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: formData.toString()
    });
    
    const data = await response.json();

    if (data.ok && data.incoming_webhook) {
      await prisma.user.update({
        where: { id: userId },
        data: { slackWebhookUrl: data.incoming_webhook.url },
      });
      res.send('✅ Slack connected successfully! You can close this window and return to the dashboard.');
    } else {
      res.status(400).send('❌ Failed to connect Slack: ' + data.error);
    }
  } catch (error) {
    res.status(500).send('Error connecting to Slack');
  }
};

// Notify function to be used in emailWorker.ts
export const notifyRateLimitHit = async (userId: string, senderEmail: string) => {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  
  if (user?.slackWebhookUrl) {
    try {
      await fetch(user.slackWebhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: `⚠️ *Rate Limit Reached*\nSender \`${senderEmail}\` hit the hourly limit. Remaining jobs have been safely delayed to the next hour.`
        })
      });
      console.log(`[Slack] Notified user ${userId} about rate limit hit.`);
    } catch (error) {
      console.error('[Slack] Failed to send webhook notification', error);
    }
  }
};
