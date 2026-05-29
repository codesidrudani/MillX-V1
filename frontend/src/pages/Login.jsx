import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../store/useAuth';
import api from '../utils/api';
import { Leaf } from 'lucide-react';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await api.post('/auth/login', { email, password });
      login(res.data.user, res.data.token);
      navigate('/');
    } catch (err) {
      const errMsg = err.response?.data?.error;
      if (errMsg === 'PAYMENT_PENDING') {
        setError('PAYMENT_PENDING');
      } else {
        setError(errMsg || 'Failed to login');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8 bg-[url('https://images.unsplash.com/photo-1448375240586-882707db888b?q=80&w=2070&auto=format&fit=crop')] bg-cover bg-center">
      <div className="absolute inset-0 bg-forest-950/70 backdrop-blur-sm"></div>
      
      <div className="relative sm:mx-auto sm:w-full sm:max-w-md z-10">
        <div className="flex justify-center text-white mb-4">
          <div className="bg-forest-600 p-3 rounded-xl shadow-lg border border-forest-500">
            <Leaf className="w-10 h-10" />
          </div>
        </div>
        <h2 className="mt-2 text-center text-4xl font-extrabold text-white tracking-tight">
          MILLX
        </h2>
        <p className="mt-2 text-center text-sm text-forest-200">
          End-to-End Mill Management Solution
        </p>
      </div>

      <div className="relative mt-8 sm:mx-auto sm:w-full sm:max-w-md z-10">
        <div className="bg-white py-8 px-4 shadow-2xl sm:rounded-2xl sm:px-10 border border-gray-100">
          <form className="space-y-6" onSubmit={handleSubmit}>
            {error && error === 'PAYMENT_PENDING' ? (
              <div className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded-md">
                <p className="text-sm font-bold text-amber-800">⚠️ Payment Pending</p>
                <p className="text-sm text-amber-700 mt-1">Your mill account has been frozen due to pending payment. Please contact the administrator to restore access.</p>
              </div>
            ) : error ? (
              <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-md">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            ) : null}
            
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Email address
              </label>
              <div className="mt-1">
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-forest-500 focus:border-forest-500 sm:text-sm transition-colors"
                  placeholder="admin@millx.com"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Password
              </label>
              <div className="mt-1">
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-forest-500 focus:border-forest-500 sm:text-sm transition-colors"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={loading}
                className={`w-full flex justify-center py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-forest-600 hover:bg-forest-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-forest-500 transition-colors ${loading ? 'opacity-70 cursor-not-allowed' : ''}`}
              >
                {loading ? 'Signing in...' : 'Sign in'}
              </button>
            </div>
          </form>
        </div>
      </div>
      <div className="relative mt-8 text-center text-sm text-forest-200 z-10">
        MillX - by Obleague Automations
      </div>
    </div>
  );
};

export default Login;
