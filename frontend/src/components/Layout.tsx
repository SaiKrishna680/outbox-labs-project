import type { ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Clock, Send, LogOut } from 'lucide-react';
import api from '../services/api';

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const { user, logout } = useAuth();
  const location = useLocation();

  const isActive = (path: string) => location.pathname === path;

  return (
    <div className="flex h-screen bg-white">
      {/* Left Sidebar */}
      <aside className="w-64 border-r border-gray-200 flex flex-col">
        {/* Logo */}
        <div className="p-4">
          <h1 className="text-2xl font-bold tracking-tight">ONB</h1>
        </div>

        {/* User Info */}
        <div className="px-4 py-3 flex items-center gap-3">
          <img
            src={user?.avatar || `https://ui-avatars.com/api/?name=${user?.name || 'User'}`}
            alt={user?.name || 'User'}
            className="w-10 h-10 rounded-full"
          />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">{user?.name}</p>
            <p className="text-xs text-gray-500 truncate">{user?.email}</p>
          </div>
          <button onClick={logout} className="text-gray-400 hover:text-gray-600" title="Logout">
            <LogOut size={16} />
          </button>
        </div>

        {/* Compose Button */}
        <div className="px-4 py-3">
          <Link
            to="/compose"
            className="block w-full text-center py-2.5 border-2 border-green-500 text-green-600 rounded-full font-medium hover:bg-green-50 transition-colors"
          >
            Compose
          </Link>
        </div>

        {/* Navigation */}
        <nav className="px-4 mt-2 flex-1">
          <p className="text-xs text-gray-400 uppercase tracking-wider mb-2">Core</p>
          <Link
            to="/dashboard/scheduled"
            className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm mb-1 ${
              isActive('/dashboard/scheduled') || isActive('/dashboard')
                ? 'bg-green-50 text-green-700 font-medium'
                : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            <Clock size={18} />
            <span>Scheduled</span>
          </Link>
          <Link
            to="/dashboard/sent"
            className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm ${
              isActive('/dashboard/sent')
                ? 'bg-green-50 text-green-700 font-medium'
                : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            <Send size={18} />
            <span>Sent</span>
          </Link>
        </nav>

        {/* Integrations */}
        <div className="px-4 py-6 border-t border-gray-200 mt-auto">
          <p className="text-xs text-gray-400 uppercase tracking-wider mb-3">Integrations</p>
          {!user?.slackConnected ? (
            <button
              onClick={async () => {
                try {
                  const res = await api.get('/slack/connect');
                  if (res.data.url) window.location.href = res.data.url;
                } catch (e) {
                  console.error('Failed to connect Slack', e);
                }
              }}
              className="flex items-center justify-center gap-2 w-full py-2 px-3 border border-gray-300 rounded-lg text-sm text-gray-700 font-medium hover:bg-gray-50 transition-colors cursor-pointer"
            >
              <img src="https://upload.wikimedia.org/wikipedia/commons/d/d5/Slack_icon_2019.svg" alt="Slack" className="w-4 h-4" />
              Connect Slack
            </button>
          ) : (
            <div className="flex items-center gap-2 px-3 py-2 bg-green-50 text-green-700 rounded-lg text-sm font-medium">
              <img src="https://upload.wikimedia.org/wikipedia/commons/d/d5/Slack_icon_2019.svg" alt="Slack" className="w-4 h-4" />
              Slack Connected
            </div>
          )}
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto bg-gray-50/50">
        {children}
      </main>
    </div>
  );
}
