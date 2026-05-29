import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import { Building2, Plus, Snowflake, CheckCircle, Users, X, Key } from 'lucide-react';

const SuperAdminDashboard = () => {
  const [mills, setMills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');
  
  const [passwordModal, setPasswordModal] = useState({ isOpen: false, user: null, millName: '', newPassword: '', loading: false, error: '' });

  const [form, setForm] = useState({
    millName: '',
    millAddress: '',
    adminName: '',
    adminEmail: '',
    adminPassword: '',
  });

  const fetchMills = async () => {
    try {
      const res = await api.get('/superadmin/mills');
      setMills(res.data);
    } catch (err) {
      console.error('Failed to fetch mills', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchMills(); }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    setCreating(true);
    setError('');
    try {
      await api.post('/superadmin/mills', form);
      setForm({ millName: '', millAddress: '', adminName: '', adminEmail: '', adminPassword: '' });
      setShowCreateForm(false);
      fetchMills();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create mill');
    } finally {
      setCreating(false);
    }
  };

  const toggleFreeze = async (mill) => {
    const newStatus = mill.status === 'ACTIVE' ? 'FROZEN' : 'ACTIVE';
    try {
      await api.put(`/superadmin/mills/${mill.id}/status`, { status: newStatus });
      fetchMills();
    } catch (err) {
      console.error('Failed to update mill status', err);
    }
  };

  const handlePasswordUpdate = async (e) => {
    e.preventDefault();
    if (!passwordModal.newPassword) return;
    setPasswordModal(prev => ({ ...prev, loading: true, error: '' }));
    try {
      await api.put(`/superadmin/users/${passwordModal.user.id}/password`, {
        newPassword: passwordModal.newPassword
      });
      setPasswordModal({ isOpen: false, user: null, millName: '', newPassword: '', loading: false, error: '' });
      // Optionally show a success toast here
    } catch (err) {
      setPasswordModal(prev => ({ ...prev, loading: false, error: err.response?.data?.error || 'Failed to update password' }));
    }
  };

  if (loading) {
    return <div className="p-12 text-center text-gray-500">Loading mills...</div>;
  }

  return (
    <div className="space-y-6 pb-20">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Mill Management</h1>
          <p className="text-gray-500">Create and manage saw mills across the platform</p>
        </div>
        <button
          onClick={() => setShowCreateForm(true)}
          className="flex items-center space-x-2 px-4 py-2 bg-forest-600 text-white rounded-lg hover:bg-forest-700 transition-colors font-medium text-sm"
        >
          <Plus className="w-4 h-4" />
          <span>Register New Mill</span>
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center space-x-3">
            <div className="bg-forest-50 p-3 rounded-lg">
              <Building2 className="w-6 h-6 text-forest-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{mills.length}</p>
              <p className="text-sm text-gray-500">Total Mills</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center space-x-3">
            <div className="bg-green-50 p-3 rounded-lg">
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{mills.filter(m => m.status === 'ACTIVE').length}</p>
              <p className="text-sm text-gray-500">Active</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center space-x-3">
            <div className="bg-blue-50 p-3 rounded-lg">
              <Snowflake className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{mills.filter(m => m.status === 'FROZEN').length}</p>
              <p className="text-sm text-gray-500">Frozen</p>
            </div>
          </div>
        </div>
      </div>

      {/* Mills Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase">Mill Name</th>
              <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase">Address</th>
              <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase">Admins</th>
              <th className="px-6 py-3 text-center text-xs font-bold text-gray-700 uppercase">Users</th>
              <th className="px-6 py-3 text-center text-xs font-bold text-gray-700 uppercase">Status</th>
              <th className="px-6 py-3 text-center text-xs font-bold text-gray-700 uppercase">Created</th>
              <th className="px-6 py-3 text-center text-xs font-bold text-gray-700 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {mills.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                  No mills registered yet. Click "Register New Mill" to get started.
                </td>
              </tr>
            ) : (
              mills.map((mill) => (
                <tr key={mill.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900">{mill.name}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{mill.address || '—'}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                    {mill.users && mill.users.map(u => (
                      <div key={u.id} className="flex items-center space-x-2 py-1">
                        <span className="font-medium">{u.name}</span>
                        <span className="text-gray-400">({u.email})</span>
                        <button 
                          onClick={() => setPasswordModal({ isOpen: true, user: u, millName: mill.name, newPassword: '', loading: false, error: '' })} 
                          className="p-1 text-forest-600 hover:bg-forest-50 rounded transition-colors" 
                          title="Edit Password"
                        >
                          <Key className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-center text-gray-700">
                    <span className="inline-flex items-center space-x-1">
                      <Users className="w-4 h-4" />
                      <span>{mill._count.users}</span>
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      mill.status === 'ACTIVE' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'
                    }`}>
                      {mill.status === 'ACTIVE' ? <CheckCircle className="w-3 h-3 mr-1" /> : <Snowflake className="w-3 h-3 mr-1" />}
                      {mill.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-center text-gray-500">
                    {new Date(mill.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <button
                      onClick={() => toggleFreeze(mill)}
                      className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                        mill.status === 'ACTIVE'
                          ? 'bg-blue-50 text-blue-700 hover:bg-blue-100'
                          : 'bg-green-50 text-green-700 hover:bg-green-100'
                      }`}
                    >
                      {mill.status === 'ACTIVE' ? 'Freeze' : 'Unfreeze'}
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Create Mill Modal */}
      {showCreateForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full mx-4">
            <div className="flex justify-between items-center px-6 py-4 border-b">
              <h3 className="text-lg font-bold text-gray-900">Register New Mill</h3>
              <button onClick={() => setShowCreateForm(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="p-6 space-y-5">
              {error && (
                <div className="bg-red-50 border-l-4 border-red-500 p-3 rounded-md">
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              )}

              <div className="space-y-1">
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Mill Details</p>
                <div className="grid grid-cols-1 gap-3">
                  <input
                    type="text" required placeholder="Mill Name *"
                    value={form.millName} onChange={(e) => setForm({ ...form, millName: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-forest-500 focus:border-forest-500"
                  />
                  <input
                    type="text" placeholder="Mill Address"
                    value={form.millAddress} onChange={(e) => setForm({ ...form, millAddress: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-forest-500 focus:border-forest-500"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Admin Account</p>
                <div className="grid grid-cols-1 gap-3">
                  <input
                    type="text" required placeholder="Admin Name *"
                    value={form.adminName} onChange={(e) => setForm({ ...form, adminName: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-forest-500 focus:border-forest-500"
                  />
                  <input
                    type="email" required placeholder="Admin Email *"
                    value={form.adminEmail} onChange={(e) => setForm({ ...form, adminEmail: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-forest-500 focus:border-forest-500"
                  />
                  <input
                    type="password" required placeholder="Admin Password *"
                    value={form.adminPassword} onChange={(e) => setForm({ ...form, adminPassword: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-forest-500 focus:border-forest-500"
                  />
                </div>
              </div>

              <button
                type="submit" disabled={creating}
                className={`w-full py-2.5 px-4 rounded-lg text-sm font-medium text-white bg-forest-600 hover:bg-forest-700 transition-colors ${creating ? 'opacity-70 cursor-not-allowed' : ''}`}
              >
                {creating ? 'Creating...' : 'Create Mill & Admin'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Edit Password Modal */}
      {passwordModal.isOpen && passwordModal.user && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full mx-4">
            <div className="flex justify-between items-center px-6 py-4 border-b">
              <h3 className="text-lg font-bold text-gray-900">Update Password</h3>
              <button onClick={() => setPasswordModal({ isOpen: false, user: null, millName: '', newPassword: '', loading: false, error: '' })} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handlePasswordUpdate} className="p-6 space-y-5">
              {passwordModal.error && (
                <div className="bg-red-50 border-l-4 border-red-500 p-3 rounded-md">
                  <p className="text-sm text-red-700">{passwordModal.error}</p>
                </div>
              )}

              <div>
                <p className="text-sm text-gray-500 mb-1">User: <span className="font-medium text-gray-900">{passwordModal.user.name}</span></p>
                <p className="text-sm text-gray-500 mb-4">Mill: <span className="font-medium text-gray-900">{passwordModal.millName}</span></p>
                
                <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
                <input
                  type="text"
                  required
                  placeholder="Enter new password"
                  value={passwordModal.newPassword}
                  onChange={(e) => setPasswordModal({ ...passwordModal, newPassword: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-forest-500 focus:border-forest-500"
                />
                <p className="text-xs text-gray-500 mt-1">This will immediately overwrite their existing password.</p>
              </div>

              <button
                type="submit" disabled={passwordModal.loading}
                className={`w-full py-2.5 px-4 rounded-lg text-sm font-medium text-white bg-forest-600 hover:bg-forest-700 transition-colors ${passwordModal.loading ? 'opacity-70 cursor-not-allowed' : ''}`}
              >
                {passwordModal.loading ? 'Updating...' : 'Update Password'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default SuperAdminDashboard;
