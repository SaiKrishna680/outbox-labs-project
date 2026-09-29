import { Client } from '@elastic/elasticsearch';
import { config } from '../config';

export const esClient = new Client({
  node: config.elasticsearch.url,
  // If your local ES uses https and self-signed cert, we bypass ssl check for dev
  tls: { rejectUnauthorized: false }
});

export const indexEmailJob = async (job: any) => {
  try {
    await esClient.index({
      index: 'email_jobs',
      id: job.id,
      document: {
        subject: job.subject,
        body: job.body,
        recipientEmail: job.recipientEmail,
        status: job.status,
        scheduledAt: job.scheduledAt,
        sentAt: job.sentAt,
      },
    });
  } catch (error: any) {
    console.error('[ES] Index error:', error.message);
  }
};

export const searchEmails = async (query: string) => {
  try {
    const result = await esClient.search({
      index: 'email_jobs',
      query: {
        multi_match: {
          query,
          fields: ['subject', 'body', 'recipientEmail'],
        },
      },
    });
    // @ts-ignore
    return result.hits.hits.map((h: any) => ({ id: h._id, ...h._source }));
  } catch (error: any) {
    console.error('[ES] Search error:', error.message);
    return [];
  }
};
