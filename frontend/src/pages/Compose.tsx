import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Clock, Users } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../services/api';

export default function Compose() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<'single' | 'bulk'>('single');
  
  const [formData, setFormData] = useState({
    recipientEmail: '',
    recipients: '',
    subject: '',
    body: '',
    scheduledAt: '',
    delayBetweenEmails: 2,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (mode === 'single') {
        await api.post('/emails/schedule', {
          recipientEmail: formData.recipientEmail,
          subject: formData.subject,
          body: formData.body,
          scheduledAt: formData.scheduledAt ? new Date(formData.scheduledAt).toISOString() : undefined,
        });
        toast.success('Email scheduled successfully!');
      } else {
        const emailList = formData.recipients
          .split(/[,\n]/)
          .map(e => e.trim())
          .filter(e => e.length > 0);
          
        if (emailList.length === 0) throw new Error('No valid emails provided');

        await api.post('/emails/campaigns', {
          recipients: emailList,
          subject: formData.subject,
          body: formData.body,
          delayBetweenEmails: formData.delayBetweenEmails,
          startTime: formData.scheduledAt ? new Date(formData.scheduledAt).toISOString() : undefined,
        });
        toast.success(`Campaign scheduled for ${emailList.length} recipients!`);
      }
      
      navigate('/dashboard/scheduled');
    } catch (error: any) {
      toast.error(error.response?.data?.message || error.message || 'Failed to schedule');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto py-8 px-6">
      <button 
        onClick={() => navigate(-1)} 
        className="flex items-center gap-2 text-gray-500 hover:text-gray-900 mb-6"
      >
        <ArrowLeft size={18} />
        Back
      </button>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="flex border-b border-gray-200">
          <button
            onClick={() => setMode('single')}
            className={`flex-1 py-4 text-center font-medium ${mode === 'single' ? 'bg-green-50 text-green-700 border-b-2 border-green-500' : 'text-gray-500 hover:bg-gray-50'}`}
          >
            Single Email
          </button>
          <button
            onClick={() => setMode('bulk')}
            className={`flex-1 py-4 text-center font-medium ${mode === 'bulk' ? 'bg-green-50 text-green-700 border-b-2 border-green-500' : 'text-gray-500 hover:bg-gray-50'}`}
          >
            Bulk Campaign
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          {mode === 'single' ? (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">To</label>
              <input
                type="email"
                required
                value={formData.recipientEmail}
                onChange={(e) => setFormData({ ...formData, recipientEmail: e.target.value })}
                placeholder="recipient@example.com"
                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
          ) : (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <div className="flex items-center gap-2">
                  <Users size={16} />
                  Recipients (comma or newline separated)
                </div>
              </label>
              <textarea
                required
                value={formData.recipients}
                onChange={(e) => setFormData({ ...formData, recipients: e.target.value })}
                placeholder="email1@example.com, email2@example.com"
                rows={3}
                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Subject</label>
            <input
              type="text"
              required
              value={formData.subject}
              onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
              placeholder="Exciting news!"
              className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Body</label>
            <textarea
              required
              value={formData.body}
              onChange={(e) => setFormData({ ...formData, body: e.target.value })}
              placeholder="Hello..."
              rows={8}
              className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 font-sans"
            />
          </div>

          <div className="grid grid-cols-2 gap-6 pt-4 border-t border-gray-100">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <div className="flex items-center gap-2">
                  <Clock size={16} />
                  Schedule At (Local Time)
                </div>
              </label>
              <input
                type="datetime-local"
                value={formData.scheduledAt}
                onChange={(e) => setFormData({ ...formData, scheduledAt: e.target.value })}
                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
              />
              <p className="text-xs text-gray-500 mt-1">Leave empty to send immediately</p>
            </div>

            {mode === 'bulk' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Delay Between Emails (seconds)</label>
                <input
                  type="number"
                  min="0"
                  value={formData.delayBetweenEmails}
                  onChange={(e) => setFormData({ ...formData, delayBetweenEmails: Number(e.target.value) })}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
            )}
          </div>

          <div className="pt-6 flex justify-end">
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2.5 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
            >
              {loading ? 'Scheduling...' : 'Schedule Send'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
