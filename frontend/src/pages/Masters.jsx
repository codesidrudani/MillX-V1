import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import { Settings, Plus, Trash2 } from 'lucide-react';

const categoryMap = {
  'Timber Types': { endpoint: 'timberType', fields: [{ name: 'name', label: 'Type Name' }, { name: 'scientificName', label: 'Scientific Name' }, { name: 'description', label: 'Description' }] },
  'Parties': { endpoint: 'party', fields: [{ name: 'name', label: 'Name' }, { name: 'contact', label: 'Contact No.' }, { name: 'address', label: 'Address' }, { name: 'partyType', label: 'Party Type', type: 'select', options: ['Private', 'Government'] }] },
};

const Masters = () => {
  const [activeCategory, setActiveCategory] = useState('Timber Types');
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [formData, setFormData] = useState({});
  const [error, setError] = useState('');

  const currentConfig = categoryMap[activeCategory];

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/${currentConfig.endpoint}`);
      setData(res.data);
    } catch (err) {
      setError('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    setIsAdding(false);
    setFormData({});
    setError('');
  }, [activeCategory]);

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.post(`/${currentConfig.endpoint}`, formData);
      setIsAdding(false);
      setFormData({});
      fetchData();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this record?")) return;
    try {
      await api.delete(`/${currentConfig.endpoint}/${id}`);
      fetchData();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to delete');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Master Settings</h1>
          <p className="text-gray-500">Configure global application variables and lists</p>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-6">
        {/* Sidebar Menu */}
        <div className="w-full md:w-64 flex-shrink-0">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-4 border-b border-gray-100 bg-gray-50 font-semibold text-gray-700">
              Categories
            </div>
            <nav className="flex flex-col p-2 space-y-1">
              {Object.keys(categoryMap).map((category) => (
                <button
                  key={category}
                  onClick={() => setActiveCategory(category)}
                  className={`text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    activeCategory === category
                      ? 'bg-forest-50 text-forest-700'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  }`}
                >
                  {category}
                </button>
              ))}
            </nav>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 bg-white rounded-xl shadow-sm border border-gray-100 flex flex-col">
          <div className="p-4 border-b border-gray-100 flex justify-between items-center">
            <h2 className="text-lg font-semibold text-gray-900">{activeCategory}</h2>
            <button 
              onClick={() => setIsAdding(!isAdding)}
              className="flex items-center space-x-1 px-3 py-1.5 bg-forest-50 text-forest-600 hover:bg-forest-100 rounded-md text-sm font-medium transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>{isAdding ? 'Cancel' : 'Add New'}</span>
            </button>
          </div>

          {error && (
             <div className="m-4 bg-red-50 border-l-4 border-red-500 p-4 rounded-md">
               <p className="text-sm text-red-700">{error}</p>
             </div>
          )}
          
          <div className="flex-1 p-6">
            {isAdding && (
              <form onSubmit={handleSubmit} className="mb-8 bg-gray-50 p-4 rounded-lg border border-gray-200">
                <h3 className="text-sm font-medium text-gray-900 mb-4">Add new {activeCategory.slice(0, -1)}</h3>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {currentConfig.fields.map(field => (
                    <div key={field.name}>
                      <label className="block text-sm font-medium text-gray-700 mb-1">{field.label}</label>
                      {field.type === 'select' ? (
                        <select
                          required
                          value={formData[field.name] || ''}
                          onChange={(e) => setFormData({ ...formData, [field.name]: e.target.value })}
                          className="block w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-forest-500 focus:border-forest-500 sm:text-sm"
                        >
                          <option value="">Select...</option>
                          {field.options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                        </select>
                      ) : (
                        <input
                          type="text"
                          required={field.name !== 'description' && field.name !== 'scientificName'}
                          value={formData[field.name] || ''}
                          onChange={(e) => setFormData({ ...formData, [field.name]: e.target.value })}
                          className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-forest-500 focus:border-forest-500 sm:text-sm"
                        />
                      )}
                    </div>
                  ))}
                </div>
                <div className="mt-4 flex justify-end space-x-3">
                  <button type="button" onClick={() => setIsAdding(false)} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50">Cancel</button>
                  <button type="submit" className="px-4 py-2 text-sm font-medium text-white bg-forest-600 border border-transparent rounded-md hover:bg-forest-700">Save Record</button>
                </div>
              </form>
            )}

            {loading ? (
              <div className="flex justify-center p-8 text-gray-500">Loading...</div>
            ) : data.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-12 text-center text-gray-500">
                <Settings className="w-8 h-8 text-gray-300 mb-3" />
                <p>No records found in {activeCategory}.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 border border-gray-200 rounded-lg overflow-hidden">
                  <thead className="bg-gray-50">
                    <tr>
                      {currentConfig.fields.map(field => (
                        <th key={field.name} scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          {field.label}
                        </th>
                      ))}
                      <th scope="col" className="relative px-6 py-3"><span className="sr-only">Actions</span></th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {data.map((item) => (
                      <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                        {currentConfig.fields.map(field => (
                          <td key={field.name} className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {item[field.name]}
                          </td>
                        ))}
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <button onClick={() => handleDelete(item.id)} className="text-red-600 hover:text-red-900 transition-colors p-2 hover:bg-red-50 rounded-full">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Masters;
