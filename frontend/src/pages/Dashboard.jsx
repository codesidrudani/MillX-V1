import React, { useState, useEffect } from 'react';
import { useAuth } from '../store/useAuth';
import api from '../utils/api';
import { formatDate } from '../utils/dateFormatter';
import { Activity, Package, Truck, Layers, LogOut, Building2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import SuperAdminDashboard from './SuperAdminDashboard';

const StatCard = ({ title, value, icon: Icon, trend }) => (
  <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex items-center justify-between">
    <div>
      <p className="text-sm font-medium text-gray-500 mb-1">{title}</p>
      <h3 className="text-2xl font-bold text-gray-900">{value}</h3>
      {trend && (
        <p className={`text-sm mt-2 ${trend > 0 ? 'text-green-600' : 'text-red-600'}`}>
          {trend > 0 ? '+' : ''}{trend}% from last month
        </p>
      )}
    </div>
    <div className="p-4 bg-forest-50 rounded-full text-forest-600">
      <Icon className="w-6 h-6" />
    </div>
  </div>
);

const Dashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  // Superadmin gets a completely different dashboard
  if (user?.role === 'superadmin') {
    return <SuperAdminDashboard />;
  }

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await api.get('/dashboard');
        setStats(res.data);
      } catch (err) {
        console.error("Failed to load dashboard stats", err);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          {user?.mill && (
            <div className="flex items-center space-x-2 text-forest-700 mb-1">
              <Building2 className="w-4 h-4" />
              <span className="text-sm font-semibold">{user.mill.name}</span>
              {user.mill.address && <span className="text-xs text-gray-400">• {user.mill.address}</span>}
            </div>
          )}
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-500">Welcome back, {user?.name}</p>
        </div>
        <div className="text-sm font-medium text-forest-600 bg-forest-50 px-4 py-2 rounded-full border border-forest-100">
          Role: <span className="capitalize">{user?.role.replace('_', ' ')}</span>
        </div>
      </div>

      {(user?.role === 'admin' || user?.role === 'report_viewer') && stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <StatCard title="Total Logs (Stock)" value={stats.totalLogs} icon={Package} />
          <StatCard title="Sawn Sizes (Stock)" value={stats.totalSawnSizes} icon={Layers} />
          <StatCard title="Dispatched Today" value={stats.dispatchedToday} icon={Truck} />
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 min-h-[300px]">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h3>
          {loading ? (
            <div className="text-sm text-gray-500">Loading activity...</div>
          ) : stats?.recentActivity?.length > 0 ? (
            <div className="space-y-4">
              {stats.recentActivity.map((activity) => (
                <div key={activity.id} className="flex items-start space-x-3">
                  <div className={`p-2 rounded-full ${activity.action === 'CREATE' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                    <Activity className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{activity.user.name} {activity.action.toLowerCase()}d a {activity.entity.replace(/([A-Z])/g, ' $1').trim()}</p>
                    <p className="text-xs text-gray-500">{formatDate(activity.createdAt)} {new Date(activity.createdAt).toLocaleTimeString()}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-sm text-gray-500 flex items-center justify-center h-48 border-2 border-dashed border-gray-100 rounded-lg">
              No recent activity found.
            </div>
          )}
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 min-h-[300px]">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
          <div className="grid grid-cols-2 gap-4">
            {(user?.role === 'admin' || user?.role === 'data_entry') && (
              <>
                <button onClick={() => navigate('/data-entry')} className="p-4 text-left border border-gray-200 rounded-lg hover:border-forest-500 hover:bg-forest-50 transition-colors">
                  <span className="block font-medium text-gray-900">Add New Log</span>
                  <span className="block text-sm text-gray-500 mt-1">Record incoming round logs</span>
                </button>
                <button onClick={() => navigate('/data-entry')} className="p-4 text-left border border-gray-200 rounded-lg hover:border-forest-500 hover:bg-forest-50 transition-colors">
                  <span className="block font-medium text-gray-900">Start Sawing</span>
                  <span className="block text-sm text-gray-500 mt-1">Process logs into sawn sizes</span>
                </button>
              </>
            )}
             {(user?.role === 'admin' || user?.role === 'report_viewer') && (
              <button onClick={() => navigate('/reports')} className="p-4 text-left border border-gray-200 rounded-lg hover:border-forest-500 hover:bg-forest-50 transition-colors">
                <span className="block font-medium text-gray-900">Generate Report</span>
                <span className="block text-sm text-gray-500 mt-1">Export daily inventory</span>
              </button>
             )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
