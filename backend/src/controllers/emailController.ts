import { Request, Response, NextFunction } from 'express';
import * as emailService from '../services/emailService';
import prisma from '../config/prisma';

// Helper to auto-create a user/sender for testing since we don't have auth yet
export const getOrCreateDummyAuth = async () => {
  let user = await prisma.user.findFirst();
  if (!user) {
    user = await prisma.user.create({
      data: { email: 'tester@reachinbox.com', name: 'ReachInbox Tester' },
    });
  }
  let sender = await prisma.sender.findFirst({ where: { userId: user.id } });
  if (!sender) {
    sender = await prisma.sender.create({
      data: { userId: user.id, email: 'campaigns@reachinbox.com' },
    });
  }
  return { userId: user.id, senderId: sender.id };
};

export const schedule = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { recipientEmail, subject, body, scheduledAt } = req.body;
    
    const sendTime = scheduledAt ? new Date(scheduledAt) : new Date();
    const userId = (req as any).user.id;
    const sender = await prisma.sender.findFirst({ where: { userId } });

    const job = await emailService.scheduleEmail({
      userId,
      senderId: sender!.id,
      recipientEmail,
      subject,
      body,
      scheduledAt: sendTime,
    });

    res.status(201).json({ success: true, data: job });
  } catch (error) {
    next(error);
  }
};

export const createCampaign = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { subject, body, recipients, delayBetweenEmails = 2, hourlyLimit = 200, startTime } = req.body;
    
    if (!recipients || !Array.isArray(recipients) || recipients.length === 0) {
      res.status(400).json({ success: false, message: 'recipients must be a non-empty array' });
      return;
    }

    const sendTime = startTime ? new Date(startTime) : new Date();
    const userId = (req as any).user.id;
    const sender = await prisma.sender.findFirst({ where: { userId } });

    const campaign = await emailService.scheduleCampaign({
      userId,
      senderId: sender!.id,
      subject,
      body,
      recipients,
      delayBetweenEmails: Number(delayBetweenEmails),
      hourlyLimit: Number(hourlyLimit),
      startTime: sendTime
    });

    res.status(201).json({ success: true, data: campaign });
  } catch (error) {
    next(error);
  }
};

export const listScheduled = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = (req as any).user.id;
    const jobs = await emailService.getScheduledEmails(userId);
    res.json({ success: true, data: jobs });
  } catch (error) {
    next(error);
  }
};

export const listSent = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = (req as any).user.id;
    const jobs = await emailService.getSentEmails(userId);
    res.json({ success: true, data: jobs });
  } catch (error) {
    next(error);
  }
};
