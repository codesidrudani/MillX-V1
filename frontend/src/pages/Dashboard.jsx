import React from 'react';
import { useAuth } from '../store/useAuth';
import { Activity, Package, Truck, FileText } from 'lucide-react';

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

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-500">Welcome back, {user?.name}</p>
        </div>
        <div className="text-sm font-medium text-forest-600 bg-forest-50 px-4 py-2 rounded-full border border-forest-100">
          Role: <span className="capitalize">{user?.role.replace('_', ' ')}</span>
        </div>
      </div>

      {(user?.role === 'admin' || user?.role === 'report_viewer') && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard title="Total Logs (Stock)" value="1,248" icon={Package} trend={12} />
          <StatCard title="Active Sawing" value="24" icon={Activity} />
          <StatCard title="Dispatched Today" value="156" icon={Truck} trend={5} />
          <StatCard title="Pending Reports" value="3" icon={FileText} />
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 min-h-[300px]">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h3>
          <div className="text-sm text-gray-500 flex items-center justify-center h-48 border-2 border-dashed border-gray-100 rounded-lg">
            Activity stream placeholder
          </div>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 min-h-[300px]">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
          <div className="grid grid-cols-2 gap-4">
            {(user?.role === 'admin' || user?.role === 'data_entry') && (
              <>
                <button className="p-4 text-left border border-gray-200 rounded-lg hover:border-forest-500 hover:bg-forest-50 transition-colors">
                  <span className="block font-medium text-gray-900">Add New Log</span>
                  <span className="block text-sm text-gray-500 mt-1">Record incoming round logs</span>
                </button>
                <button className="p-4 text-left border border-gray-200 rounded-lg hover:border-forest-500 hover:bg-forest-50 transition-colors">
                  <span className="block font-medium text-gray-900">Start Sawing</span>
                  <span className="block text-sm text-gray-500 mt-1">Begin log processing</span>
                </button>
              </>
            )}
             {(user?.role === 'admin' || user?.role === 'report_viewer') && (
              <button className="p-4 text-left border border-gray-200 rounded-lg hover:border-forest-500 hover:bg-forest-50 transition-colors">
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
