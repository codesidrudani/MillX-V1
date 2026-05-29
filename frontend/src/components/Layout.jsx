import React from 'react';
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../store/useAuth';
import { Home, Users, FileText, Database, Settings, LogOut, Menu } from 'lucide-react';

const Layout = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const getMenuItems = () => {
    if (!user) return [];
    
    const role = user.role;
    const items = [
      { name: 'Dashboard', icon: <Home className="w-5 h-5" />, path: '/' }
    ];

    if (role === 'superadmin') {
      return items; // Superadmin only sees dashboard
    }

    if (role === 'admin' || role === 'data_entry') {
      items.push({ name: 'Data Entry', icon: <Database className="w-5 h-5" />, path: '/data-entry' });
    }
    
    if (role === 'admin' || role === 'report_viewer') {
      items.push({ name: 'Reports', icon: <FileText className="w-5 h-5" />, path: '/reports' });
      items.push({ name: 'Registers (Form 44)', icon: <FileText className="w-5 h-5" />, path: '/registers' });
    }

    if (role === 'admin') {
      items.push({ name: 'Records & Logs', icon: <Database className="w-5 h-5" />, path: '/records' });
      items.push({ name: 'User Management', icon: <Users className="w-5 h-5" />, path: '/users' });
      items.push({ name: 'Masters', icon: <Settings className="w-5 h-5" />, path: '/masters' });
    }

    return items;
  };

  const menuItems = getMenuItems();

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden font-sans">
      {/* Sidebar */}
      <aside className="w-64 bg-forest-900 text-white flex flex-col shadow-xl hidden md:flex">
        <div className="p-6 bg-forest-950 flex items-center justify-center">
          <h1 className="text-3xl font-bold tracking-wider text-white">MILLX</h1>
        </div>
        <div className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
          {menuItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.name}
                to={item.path}
                className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors duration-200 ${
                  isActive 
                    ? 'bg-forest-700 text-white shadow-md' 
                    : 'text-forest-100 hover:bg-forest-800 hover:text-white'
                }`}
              >
                {item.icon}
                <span className="font-medium">{item.name}</span>
              </Link>
            )
          })}
        </div>
        <div className="p-4 border-t border-forest-800">
          <div className="flex items-center space-x-3 mb-4 px-2">
            <div className="w-10 h-10 rounded-full bg-forest-700 flex items-center justify-center text-lg font-bold">
              {user?.name?.charAt(0).toUpperCase()}
            </div>
            <div>
              <p className="text-sm font-medium text-white">{user?.name}</p>
              <p className="text-xs text-forest-300 capitalize">{user?.role.replace('_', ' ')}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="flex w-full items-center space-x-3 px-4 py-2 text-forest-300 hover:text-white hover:bg-forest-800 rounded-lg transition-colors"
          >
            <LogOut className="w-5 h-5" />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Mobile Header (minimal) */}
        <header className="bg-white shadow-sm md:hidden flex items-center justify-between p-4">
          <h1 className="text-2xl font-bold text-forest-900">MILLX</h1>
          <button className="text-forest-900 p-2">
            <Menu className="w-6 h-6" />
          </button>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-6 md:p-8 bg-gray-50">
          <Outlet />
        </main>

        {/* Footer */}
        <footer className="bg-white border-t border-gray-200 py-4 px-6 text-center text-sm text-gray-500">
          <strong>MillX</strong> - by Obleague Automations
        </footer>
      </div>
    </div>
  );
};

export default Layout;
