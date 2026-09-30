import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const GOOGLE_ICON = 'https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg';

export default function Login() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { login } = useAuth();

  useEffect(() => {
    const token = searchParams.get('token');
    if (token) {
      login(token);
      navigate('/dashboard', { replace: true });
    }
  }, [searchParams, login, navigate]);

  const handleGoogleLogin = () => {
    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
    window.location.href = `${API_URL}/auth/google`;
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-10 w-full max-w-md">
        <h1 className="text-3xl font-bold text-center mb-8">Login</h1>

        {/* Google Login */}
        <button
          onClick={handleGoogleLogin}
          className="w-full flex items-center justify-center gap-3 py-3 px-4 bg-green-50 border border-green-100 rounded-full text-gray-700 font-medium hover:bg-green-100 transition-colors"
        >
          <img src={GOOGLE_ICON} alt="Google" className="w-5 h-5" />
          Login with Google
        </button>

        {/* Divider */}
        <div className="flex items-center my-6">
          <div className="flex-1 border-t border-gray-200" />
          <span className="px-4 text-sm text-gray-400">or sign up through email</span>
          <div className="flex-1 border-t border-gray-200" />
        </div>

        {/* Email/Password (display only per Figma) */}
        <div className="space-y-4">
          <input
            type="email"
            placeholder="Email ID"
            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            disabled
          />
          <input
            type="password"
            placeholder="Password"
            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            disabled
          />
        </div>

        <button
          className="w-full mt-6 py-3 bg-emerald-500 text-white rounded-full font-medium hover:bg-emerald-600 transition-colors"
          disabled
        >
          Login
        </button>
      </div>
    </div>
  );
}
