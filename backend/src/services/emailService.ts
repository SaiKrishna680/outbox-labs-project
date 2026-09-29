import { v4 as uuidv4 } from 'uuid';
import prisma from '../config/prisma';
import { emailQueue } from '../queues/emailQueue';

export const scheduleEmail = async (data: {
  userId: string;
  senderId: string;
  recipientEmail: string;
  subject: string;
  body: string;
  scheduledAt: Date;
}) => {
  const idempotencyKey = uuidv4();

  const emailJob = await prisma.emailJob.create({
    data: {
      userId: data.userId,
      senderId: data.senderId,
      recipientEmail: data.recipientEmail,
      subject: data.subject,
      body: data.body,
      scheduledAt: data.scheduledAt,
      idempotencyKey,
      status: 'scheduled',
    },
  });

  const delay = Math.max(0, data.scheduledAt.getTime() - Date.now());
  const bullJob = await emailQueue.add('send-email', { emailJobId: emailJob.id }, { delay });

  return prisma.emailJob.update({
    where: { id: emailJob.id },
    data: { bullJobId: bullJob.id },
  });
};

export const scheduleCampaign = async (data: {
  userId: string;
  senderId: string;
  subject: string;
  body: string;
  recipients: string[];
  delayBetweenEmails: number;
  hourlyLimit: number;
  startTime: Date;
}) => {
  // 1. Create Campaign
  const campaign = await prisma.campaign.create({
    data: {
      userId: data.userId,
      senderId: data.senderId,
      subject: data.subject,
      body: data.body,
      delayBetweenEmails: data.delayBetweenEmails,
      hourlyLimit: data.hourlyLimit,
      startTime: data.startTime,
      totalRecipients: data.recipients.length,
    },
  });

  // 2. Prepare DB Jobs (Bulk create for speed)
  const now = Date.now();
  const emailJobsData = data.recipients.map((recipientEmail, index) => {
    // Stagger based on delay
    const staggeredTime = new Date(data.startTime.getTime() + index * data.delayBetweenEmails * 1000);
    return {
      userId: data.userId,
      senderId: data.senderId,
      campaignId: campaign.id,
      recipientEmail,
      subject: data.subject,
      body: data.body,
      scheduledAt: staggeredTime,
      idempotencyKey: uuidv4(),
      status: 'scheduled',
    };
  });

  await prisma.emailJob.createMany({ data: emailJobsData });

  // 3. Fetch created jobs to get IDs for BullMQ
  const createdJobs = await prisma.emailJob.findMany({
    where: { campaignId: campaign.id },
    select: { id: true, scheduledAt: true },
    orderBy: { scheduledAt: 'asc' }
  });

  // 4. Add to BullMQ in bulk
  const bullMqJobs = createdJobs.map(job => {
    const delay = Math.max(0, job.scheduledAt.getTime() - now);
    return {
      name: 'send-email',
      data: { emailJobId: job.id },
      opts: { delay }
    };
  });

  await emailQueue.addBulk(bullMqJobs);

  return campaign;
};

export const getScheduledEmails = async (userId: string) => {
  return prisma.emailJob.findMany({
    where: { userId, status: 'scheduled' },
    orderBy: { scheduledAt: 'asc' },
  });
};

export const getSentEmails = async (userId: string) => {
  return prisma.emailJob.findMany({
    where: { userId, status: 'sent' },
    orderBy: { sentAt: 'desc' },
  });
};
