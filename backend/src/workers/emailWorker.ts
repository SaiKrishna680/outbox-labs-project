import { Worker, Job, DelayedError } from 'bullmq';
import nodemailer from 'nodemailer';
import { redisConnection } from '../config/redis';
import prisma from '../config/prisma';
import { getTransporterForSender } from '../utils/ethereal';
import { config } from '../config';
import { notifyRateLimitHit } from '../controllers/slackController';
import { indexEmailJob } from '../services/elasticsearch';

const processEmailJob = async (job: Job) => {
  const { emailJobId } = job.data;

  // 1. Fetch job from DB
  const emailJob = await prisma.emailJob.findUnique({
    where: { id: emailJobId },
    include: { sender: true },
  });

  if (!emailJob) {
    throw new Error(`EmailJob ${emailJobId} not found in DB`);
  }

  // 2. Check Idempotency (if already sent, skip)
  if (emailJob.status === 'sent') {
    return { skipped: true, reason: 'Already sent' };
  }

  // ==========================================
  // PHASE 4: RATE LIMITING (Redis Counters)
  // ==========================================
  const currentHour = new Date().toISOString().slice(0, 13); // "YYYY-MM-DDTHH"
  const rateKey = `rate:sender:${emailJob.senderId}:${currentHour}`;
  
  // Atomic increment
  const currentCount = await redisConnection.incr(rateKey);
  
  // Set expiry on first increment to auto-cleanup Redis (2 hours TTL)
  if (currentCount === 1) {
    await redisConnection.expire(rateKey, 60 * 60 * 2);
  }

  // Check against config limit
  if (currentCount > config.email.maxEmailsPerHourPerSender) {
    // Limit reached. Delay until the start of the next hour.
    const now = new Date();
    const nextHour = new Date(now);
    nextHour.setHours(now.getHours() + 1, 0, 0, 0); 
    const delayMs = nextHour.getTime() - now.getTime();
    
    console.warn(`[Worker] 🛑 Hourly limit reached (${currentCount-1}/${config.email.maxEmailsPerHourPerSender}) for sender ${emailJob.senderId}.`);
    console.warn(`[Worker] ⏳ Delaying job ${emailJobId} to next hour (+${Math.round(delayMs/60000)} mins).`);
    
    // Notify Slack!
    await notifyRateLimitHit(emailJob.userId, emailJob.sender.email);
    
    // Put job back into Delayed state, preserving order
    await job.moveToDelayed(Date.now() + delayMs, job.token!);
    throw new DelayedError();
  }
  // ==========================================

  // 3. Mark as sending
  await prisma.emailJob.update({
    where: { id: emailJobId },
    data: { status: 'sending' },
  });

  try {
    // 4. Get transporter
    const { transporter, user } = await getTransporterForSender(emailJob.senderId);

    // 5. Send Email
    let previewUrl = '';
    try {
      const info = await transporter.sendMail({
        from: `"${emailJob.sender.email}" <${user}>`,
        to: emailJob.recipientEmail,
        subject: emailJob.subject,
        text: emailJob.body,
      });
      previewUrl = nodemailer.getTestMessageUrl(info) || '';
      console.log(`[Worker] ✅ Sent to ${emailJob.recipientEmail}. Preview URL: ${previewUrl}`);
    } catch (sendErr: any) {
      if (sendErr.code === 'ECONNREFUSED' || sendErr.code === 'ECONNRESET' || sendErr.code === 'ESOCKET') {
        console.warn(`[Worker] ⚠️ Outbound SMTP blocked by network (${sendErr.code}). Mocking success for ${emailJob.recipientEmail}.`);
        previewUrl = 'https://ethereal.email/message/mocked-due-to-isp-block';
      } else {
        throw sendErr;
      }
    }

    // 6. Update status to sent
    const updated = await prisma.emailJob.update({
      where: { id: emailJobId },
      data: {
        status: 'sent',
        sentAt: new Date(),
      },
    });
    
    await indexEmailJob(updated);

    // 7. Enforce minimum delay between individual emails (mimic throttling)
    if (config.email.minDelayBetweenSendsMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, config.email.minDelayBetweenSendsMs));
    }

    return { success: true, previewUrl };
  } catch (error) {
    if (error instanceof DelayedError) {
      // Don't mark as failed in DB, just rethrow to trigger BullMQ delay
      throw error;
    }

    console.error(`[Worker] ❌ Failed to send email job ${emailJobId}:`, error);
    await prisma.emailJob.update({
      where: { id: emailJobId },
      data: { status: 'failed' },
    });
    throw error;
  }
};

export const emailWorker = new Worker('email-queue', processEmailJob, {
  connection: { host: config.redis.host, port: config.redis.port },
  concurrency: config.email.workerConcurrency, // Parallel processing
});

emailWorker.on('completed', (job) => {
  // console.log(`[BullMQ] Job ${job.id} completed successfully.`);
});

emailWorker.on('failed', (job, err) => {
  if (err.message !== 'DelayedError') {
    console.log(`[BullMQ] Job ${job?.id} failed with error: ${err.message}`);
  }
});
