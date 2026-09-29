import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Search, Filter, RefreshCw } from 'lucide-react';
import { format } from 'date-fns';
import api from '../services/api';
import type { EmailJob } from '../types';

export default function Dashboard() {
  const { tab } = useParams<{ tab: string }>();
  const currentTab = tab || 'scheduled';
  
  const [searchQuery, setSearchQuery] = useState('');
  const [emails, setEmails] = useState<EmailJob[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchEmails = async () => {
    setLoading(true);
    try {
      const endpoint = currentTab === 'scheduled' ? '/emails/scheduled' : '/emails/sent';
      const res = await api.get(endpoint);
      setEmails(res.data.data || []);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmails();
  }, [currentTab]);

  const filteredEmails = emails.filter(
    (e) =>
      e.recipientEmail.toLowerCase().includes(searchQuery.toLowerCase()) ||
      e.subject.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="h-full flex flex-col bg-gray-50/50">
      {/* Top Bar */}
      <div className="flex items-center gap-4 px-6 py-4 border-b border-gray-200 bg-white">
        <h2 className="text-xl font-semibold capitalize mr-4">{currentTab} Emails</h2>
        <div className="flex-1 relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input
            type="text"
            placeholder="Search emails..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
          />
        </div>
        <button className="text-gray-400 hover:text-gray-600 ml-auto">
          <Filter size={18} />
        </button>
        <button onClick={fetchEmails} className="text-gray-400 hover:text-gray-600">
          <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        {loading ? (
          <div className="flex justify-center mt-20">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500" />
          </div>
        ) : filteredEmails.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center text-gray-400">
              <p className="text-lg">No {currentTab} emails</p>
              <p className="text-sm mt-1">Your {currentTab} emails will appear here</p>
            </div>
          </div>
        ) : (
          <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 text-gray-500 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 font-medium">Recipient</th>
                  <th className="px-6 py-3 font-medium">Subject</th>
                  <th className="px-6 py-3 font-medium">Status</th>
                  <th className="px-6 py-3 font-medium">
                    {currentTab === 'scheduled' ? 'Scheduled For' : 'Sent At'}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredEmails.map((email) => (
                  <tr key={email.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-gray-900 font-medium">{email.recipientEmail}</td>
                    <td className="px-6 py-4 text-gray-600 max-w-xs truncate">{email.subject}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${
                        email.status === 'sent' ? 'bg-blue-50 text-blue-700' :
                        email.status === 'scheduled' ? 'bg-green-50 text-green-700' :
                        email.status === 'failed' ? 'bg-red-50 text-red-700' :
                        'bg-gray-100 text-gray-700'
                      }`}>
                        {email.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-gray-500">
                      {format(new Date(currentTab === 'scheduled' ? email.scheduledAt : (email.sentAt || email.updatedAt)), 'MMM d, yyyy • h:mm a')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
