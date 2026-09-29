const { Queue } = require('bullmq');
const q = new Queue('email-queue', { connection: { host: 'localhost', port: 6379 } });
async function run() {
  console.log('Waiting:', await q.getWaitingCount());
  console.log('Delayed:', await q.getDelayedCount());
  console.log('Active:', await q.getActiveCount());
  console.log('Failed:', await q.getFailedCount());
  console.log('Completed:', await q.getCompletedCount());
  process.exit(0);
}
run();
