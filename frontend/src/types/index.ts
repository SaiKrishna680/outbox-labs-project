export interface User {
  id: string;
  email: string;
  name: string;
  avatar: string | null;
  slackConnected: boolean;
}

export interface Sender {
  id: string;
  email: string;
}

export interface EmailJob {
  id: string;
  recipientEmail: string;
  subject: string;
  body: string;
  scheduledAt: string;
  sentAt: string | null;
  status: 'scheduled' | 'queued' | 'sending' | 'sent' | 'failed';
  sender: Sender;
  createdAt: string;
  updatedAt: string;
}

export interface Campaign {
  id: string;
  subject: string;
  body: string;
  delayBetweenEmails: number;
  hourlyLimit: number;
  startTime: string;
  totalRecipients: number;
  createdAt: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
