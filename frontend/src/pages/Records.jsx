import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import { formatDate } from '../utils/dateFormatter';
import { Calendar, Trash2, ChevronDown, ChevronRight, Activity, Plus, Edit2, Check, X } from 'lucide-react';

const Records = () => {
  const [activeTab, setActiveTab] = useState('incoming');
  const [startDate, setStartDate] = useState(new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  
  const [incoming, setIncoming] = useState([]);
  const [outgoing, setOutgoing] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [timberTypes, setTimberTypes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [expandedRows, setExpandedRows] = useState({});
  const [error, setError] = useState(null);

  // Form states for adding items
  const [showAddForm, setShowAddForm] = useState(null); // batchId
  const [addMode, setAddMode] = useState('log'); // 'log' or 'sawn_size'
  const [newItem, setNewItem] = useState({ logNo: '', timberTypeId: '', length: '', girth: '', volume: '', isReeper: false, runningFeet: '', thickness: '', width: '', quantity: '', totalVolume: '' });

  // Permit editing state
  const [editingPermit, setEditingPermit] = useState({ id: null, value: '' });

  const fetchRecords = async () => {
    setLoading(true);
    setError(null);
    try {
      if (activeTab === 'incoming') {
        const res = await api.get('/records/incoming', { params: { startDate, endDate } });
        setIncoming(res.data);
      } else if (activeTab === 'outgoing') {
        const res = await api.get('/records/outgoing', { params: { startDate, endDate } });
        setOutgoing(res.data);
      } else if (activeTab === 'logs') {
        const res = await api.get('/records/audit-logs');
        setAuditLogs(res.data);
      }
    } catch (err) {
      console.error("Failed to fetch records", err);
      setError("Failed to load records. Ensure you have admin privileges.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecords();
    setExpandedRows({});
    // Fetch timber types for the add forms
    api.get('/timberType').then(res => setTimberTypes(res.data)).catch(console.error);
  }, [activeTab, startDate, endDate]);

  const toggleRow = (id) => {
    setExpandedRows(prev => ({ ...prev, [id]: !prev[id] }));
    setShowAddForm(null);
  };

  const handlePartialDelete = async (endpoint) => {
    if (!window.confirm("Are you sure you want to delete this item?")) return;
    try {
      await api.delete(endpoint);
      fetchRecords();
    } catch (err) {
      alert(err.response?.data?.error || "Failed to delete item");
    }
  };

  const handleUpdatePermit = async (batchId) => {
    try {
      await api.put(`/records/incoming/${batchId}/permit`, { permitNo: editingPermit.value });
      setEditingPermit({ id: null, value: '' });
      fetchRecords();
    } catch (err) {
      alert(err.response?.data?.error || "Failed to update permit number");
    }
  };

  const handleAddItem = async (batchId, type) => {
    try {
      if (type === 'incoming') {
        await api.post(`/records/incoming/${batchId}/items`, { mode: addMode, item: newItem });
      } else {
        await api.post(`/records/outgoing/${batchId}/produced`, { size: newItem });
      }
      setShowAddForm(null);
      setNewItem({ logNo: '', timberTypeId: '', length: '', girth: '', volume: '', isReeper: false, runningFeet: '', thickness: '', width: '', quantity: '', totalVolume: '' });
      fetchRecords();
    } catch (err) {
      alert(err.response?.data?.error || "Failed to add item");
    }
  };

  const handleDelete = async (id, type) => {
    if (!window.confirm(`Are you sure you want to delete this ${type} batch?`)) return;
    
    try {
      await api.delete(`/records/${type}/${id}`);
      fetchRecords(); // Refresh data
    } catch (err) {
      alert(err.response?.data?.error || `Failed to delete ${type} batch`);
    }
  };

  return (
    <div className="space-y-6 pb-20">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Records & Logs</h1>
          <p className="text-gray-500">Manage batches and view audit logs</p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        {activeTab !== 'logs' ? (
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <Calendar className="w-5 h-5 text-gray-400" />
              <input 
                type="date" 
                value={startDate} 
                onChange={(e) => setStartDate(e.target.value)} 
                className="px-3 py-1.5 border border-gray-300 rounded-md text-sm focus:ring-forest-500 focus:border-forest-500" 
              />
            </div>
            <span className="text-gray-500 font-medium">to</span>
            <div className="flex items-center space-x-2">
              <input 
                type="date" 
                value={endDate} 
                onChange={(e) => setEndDate(e.target.value)} 
                className="px-3 py-1.5 border border-gray-300 rounded-md text-sm focus:ring-forest-500 focus:border-forest-500" 
              />
            </div>
          </div>
        ) : (
          <div className="text-sm text-gray-500 font-medium flex items-center space-x-2">
            <Activity className="w-5 h-5 text-blue-500" />
            <span>Viewing chronological audit logs of all user modifications.</span>
          </div>
        )}
      </div>

      {error && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-md">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8 px-6">
            <button
              onClick={() => setActiveTab('incoming')}
              className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'incoming' ? 'border-forest-500 text-forest-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Incoming Records
            </button>
            <button
              onClick={() => setActiveTab('outgoing')}
              className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'outgoing' ? 'border-forest-500 text-forest-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Outgoing Records
            </button>
            <button
              onClick={() => setActiveTab('logs')}
              className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'logs' ? 'border-forest-500 text-forest-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Audit Logs
            </button>
          </nav>
        </div>

        <div className="p-0">
          {loading ? (
            <div className="p-12 text-center text-gray-500">Loading records...</div>
          ) : activeTab === 'incoming' ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 border-collapse">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="w-10 px-3 py-3"></th>
                    <th className="px-3 py-3 text-left text-xs font-bold text-gray-700 uppercase">Date</th>
                    <th className="px-3 py-3 text-left text-xs font-bold text-gray-700 uppercase">Permit No</th>
                    <th className="px-3 py-3 text-left text-xs font-bold text-gray-700 uppercase">Party</th>
                    <th className="px-3 py-3 text-left text-xs font-bold text-gray-700 uppercase">Source</th>
                    <th className="px-3 py-3 text-left text-xs font-bold text-gray-700 uppercase">Items</th>
                    <th className="px-3 py-3 text-right text-xs font-bold text-gray-700 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {incoming.length === 0 ? (
                    <tr><td colSpan={7} className="px-6 py-8 text-center text-gray-500">No incoming records found.</td></tr>
                  ) : incoming.map((batch) => (
                    <React.Fragment key={batch.id}>
                      <tr className="hover:bg-gray-50 cursor-pointer" onClick={() => toggleRow(batch.id)}>
                        <td className="px-3 py-4 text-center">
                          {expandedRows[batch.id] ? <ChevronDown className="w-5 h-5 text-gray-400" /> : <ChevronRight className="w-5 h-5 text-gray-400" />}
                        </td>
                        <td className="px-3 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{formatDate(batch.date)}</td>
                        <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-700">
                          {editingPermit.id === batch.id ? (
                            <div className="flex items-center space-x-2" onClick={e => e.stopPropagation()}>
                              <input 
                                type="text" 
                                value={editingPermit.value} 
                                onChange={e => setEditingPermit({ ...editingPermit, value: e.target.value })}
                                className="border border-gray-300 rounded px-2 py-1 w-24 text-sm focus:ring-forest-500 focus:border-forest-500"
                                autoFocus
                              />
                              <button onClick={() => handleUpdatePermit(batch.id)} className="text-green-600 hover:text-green-800"><Check className="w-4 h-4" /></button>
                              <button onClick={() => setEditingPermit({ id: null, value: '' })} className="text-red-600 hover:text-red-800"><X className="w-4 h-4" /></button>
                            </div>
                          ) : (
                            <div className="flex items-center space-x-2 group">
                              <span>{batch.permitNo}</span>
                              <button 
                                onClick={(e) => { e.stopPropagation(); setEditingPermit({ id: batch.id, value: batch.permitNo }); }}
                                className="text-gray-400 hover:text-forest-600 opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                <Edit2 className="w-3 h-3" />
                              </button>
                            </div>
                          )}
                        </td>
                        <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-700">{batch.party?.name || 'Unknown'}</td>
                        <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-500">{batch.source || '-'}</td>
                        <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-500">{batch.logs.length + batch.sawnSizes.length} items</td>
                        <td className="px-3 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <button onClick={(e) => { e.stopPropagation(); handleDelete(batch.id, 'incoming'); }} className="text-red-600 hover:text-red-900 p-2 hover:bg-red-50 rounded-full transition-colors">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                      {expandedRows[batch.id] && (
                        <tr>
                          <td colSpan={7} className="bg-gray-50 px-8 py-4 border-b border-gray-200">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                              {batch.logs.length > 0 && (
                                <div>
                                  <h4 className="text-sm font-bold text-gray-700 mb-2 border-b pb-1">Logs</h4>
                                  <ul className="space-y-1">
                                    {batch.logs.map(log => (
                                      <li key={log.id} className="text-xs text-gray-600 flex justify-between items-center group">
                                        <span>Log No: {log.logNo} | {log.timberType?.name} | {log.length}' x {log.girth}" | {log.volume} cft</span>
                                        <div className="flex items-center space-x-2">
                                          <span className={`font-medium ${log.status === 'UTILIZED' ? 'text-red-600' : 'text-green-600'}`}>{log.status}</span>
                                          {log.status === 'IN_STOCK' && (
                                            <button onClick={() => handlePartialDelete(`/records/incoming/logs/${log.id}`)} className="text-red-500 opacity-0 group-hover:opacity-100 hover:text-red-700">
                                              <Trash2 className="w-3 h-3" />
                                            </button>
                                          )}
                                        </div>
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                              {batch.sawnSizes.length > 0 && (
                                <div>
                                  <h4 className="text-sm font-bold text-gray-700 mb-2 border-b pb-1">Sawn Sizes</h4>
                                  <ul className="space-y-1">
                                    {batch.sawnSizes.map(size => (
                                      <li key={size.id} className="text-xs text-gray-600 flex justify-between items-center group">
                                        <span>{size.timberType?.name} | {size.isReeper ? `${size.runningFeet}rft` : `${size.length}ft x ${size.width}" x ${size.thickness}" | ${size.quantity}nos`}</span>
                                        <div className="flex items-center space-x-2">
                                          <span className={`font-medium ${size.status === 'UTILIZED' ? 'text-red-600' : 'text-green-600'}`}>{size.status}</span>
                                          {size.status === 'IN_STOCK' && (
                                            <button onClick={() => handlePartialDelete(`/records/incoming/sizes/${size.id}`)} className="text-red-500 opacity-0 group-hover:opacity-100 hover:text-red-700">
                                              <Trash2 className="w-3 h-3" />
                                            </button>
                                          )}
                                        </div>
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                            </div>
                            
                            <div className="mt-4 pt-4 border-t border-gray-200">
                              {showAddForm === batch.id ? (
                                <div className="bg-white p-3 rounded border shadow-sm">
                                  <div className="flex space-x-4 mb-2 border-b pb-2">
                                    <label className="text-xs flex items-center space-x-1"><input type="radio" checked={addMode==='log'} onChange={()=>setAddMode('log')} /><span>Log</span></label>
                                    <label className="text-xs flex items-center space-x-1"><input type="radio" checked={addMode==='sawn_size'} onChange={()=>setAddMode('sawn_size')} /><span>Sawn Size</span></label>
                                  </div>
                                  <div className="flex flex-wrap gap-2 items-end">
                                    {addMode === 'log' ? (
                                      <>
                                        <input type="text" placeholder="Log No" className="border p-1 text-xs w-20" value={newItem.logNo} onChange={e => setNewItem({...newItem, logNo: e.target.value})} />
                                        <select className="border p-1 text-xs" value={newItem.timberTypeId} onChange={e => setNewItem({...newItem, timberTypeId: e.target.value})}>
                                          <option value="">Select Timber</option>
                                          {timberTypes.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                                        </select>
                                        <input type="number" placeholder="Length" className="border p-1 text-xs w-16" value={newItem.length} onChange={e => setNewItem({...newItem, length: e.target.value})} />
                                        <input type="number" placeholder="Girth" className="border p-1 text-xs w-16" value={newItem.girth} onChange={e => setNewItem({...newItem, girth: e.target.value})} />
                                        <input type="number" placeholder="Volume" className="border p-1 text-xs w-16" value={newItem.volume} onChange={e => setNewItem({...newItem, volume: e.target.value})} />
                                      </>
                                    ) : (
                                      <>
                                        <select className="border p-1 text-xs" value={newItem.timberTypeId} onChange={e => setNewItem({...newItem, timberTypeId: e.target.value})}>
                                          <option value="">Select Timber</option>
                                          {timberTypes.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                                        </select>
                                        <label className="text-xs flex items-center space-x-1"><input type="checkbox" checked={newItem.isReeper} onChange={e => setNewItem({...newItem, isReeper: e.target.checked})} /><span>Is Reeper</span></label>
                                        {newItem.isReeper ? (
                                          <input type="number" placeholder="R.Feet" className="border p-1 text-xs w-16" value={newItem.runningFeet} onChange={e => setNewItem({...newItem, runningFeet: e.target.value})} />
                                        ) : (
                                          <>
                                            <input type="number" placeholder="L" className="border p-1 text-xs w-12" value={newItem.length} onChange={e => setNewItem({...newItem, length: e.target.value})} />
                                            <input type="number" placeholder="W" className="border p-1 text-xs w-12" value={newItem.width} onChange={e => setNewItem({...newItem, width: e.target.value})} />
                                            <input type="number" placeholder="T" className="border p-1 text-xs w-12" value={newItem.thickness} onChange={e => setNewItem({...newItem, thickness: e.target.value})} />
                                            <input type="number" placeholder="Qty" className="border p-1 text-xs w-12" value={newItem.quantity} onChange={e => setNewItem({...newItem, quantity: e.target.value})} />
                                            <input type="number" placeholder="Vol" className="border p-1 text-xs w-16" value={newItem.volume} onChange={e => setNewItem({...newItem, volume: e.target.value})} />
                                          </>
                                        )}
                                      </>
                                    )}
                                    <button onClick={() => handleAddItem(batch.id, 'incoming')} className="bg-forest-600 text-white px-2 py-1 text-xs rounded hover:bg-forest-700">Save</button>
                                    <button onClick={() => setShowAddForm(null)} className="bg-gray-200 text-gray-700 px-2 py-1 text-xs rounded hover:bg-gray-300">Cancel</button>
                                  </div>
                                </div>
                              ) : (
                                <button onClick={() => setShowAddForm(batch.id)} className="flex items-center space-x-1 text-xs font-medium text-forest-600 hover:text-forest-800">
                                  <Plus className="w-3 h-3" />
                                  <span>Add Item to Batch</span>
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          ) : activeTab === 'outgoing' ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 border-collapse">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="w-10 px-3 py-3"></th>
                    <th className="px-3 py-3 text-left text-xs font-bold text-gray-700 uppercase">Date</th>
                    <th className="px-3 py-3 text-left text-xs font-bold text-gray-700 uppercase">Permit No</th>
                    <th className="px-3 py-3 text-left text-xs font-bold text-gray-700 uppercase">Party</th>
                    <th className="px-3 py-3 text-left text-xs font-bold text-gray-700 uppercase">Vehicle No</th>
                    <th className="px-3 py-3 text-left text-xs font-bold text-gray-700 uppercase">Produced</th>
                    <th className="px-3 py-3 text-right text-xs font-bold text-gray-700 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {outgoing.length === 0 ? (
                    <tr><td colSpan={7} className="px-6 py-8 text-center text-gray-500">No outgoing records found.</td></tr>
                  ) : outgoing.map((batch) => (
                    <React.Fragment key={batch.id}>
                      <tr className="hover:bg-gray-50 cursor-pointer" onClick={() => toggleRow(batch.id)}>
                        <td className="px-3 py-4 text-center">
                          {expandedRows[batch.id] ? <ChevronDown className="w-5 h-5 text-gray-400" /> : <ChevronRight className="w-5 h-5 text-gray-400" />}
                        </td>
                        <td className="px-3 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{formatDate(batch.date)}</td>
                        <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-700">{batch.permitNo}</td>
                        <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-700">{batch.party?.name || 'Internal'}</td>
                        <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-500">{batch.vehicleNo || '-'}</td>
                        <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-500">{batch.producedSizes.length} items</td>
                        <td className="px-3 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <button onClick={(e) => { e.stopPropagation(); handleDelete(batch.id, 'outgoing'); }} className="text-red-600 hover:text-red-900 p-2 hover:bg-red-50 rounded-full transition-colors">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                      {expandedRows[batch.id] && (
                        <tr>
                          <td colSpan={7} className="bg-gray-50 px-8 py-4 border-b border-gray-200">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                              <div>
                                <h4 className="text-sm font-bold text-gray-700 mb-2 border-b pb-1">Utilized Inventory</h4>
                                <ul className="space-y-1">
                                  {batch.logUsages.map(u => (
                                    <li key={u.id} className="text-xs text-gray-600 flex justify-between items-center group">
                                      <span>Log No: {u.logInventory.logNo} | {u.logInventory.timberType?.name} | {u.logInventory.length}' x {u.logInventory.girth}"</span>
                                      <button onClick={() => handlePartialDelete(`/records/outgoing/usages/log/${u.id}`)} className="text-red-500 opacity-0 group-hover:opacity-100 hover:text-red-700">
                                        <Trash2 className="w-3 h-3" />
                                      </button>
                                    </li>
                                  ))}
                                  {batch.sizeUsages.map(u => (
                                    <li key={u.id} className="text-xs text-gray-600 flex justify-between items-center group">
                                      <span>Size: {u.sawnSizeInventory.timberType?.name} | {u.sawnSizeInventory.isReeper ? `${u.sawnSizeInventory.runningFeet}rft` : `${u.sawnSizeInventory.length}ft x ${u.sawnSizeInventory.width}" x ${u.sawnSizeInventory.thickness}"`}</span>
                                      <button onClick={() => handlePartialDelete(`/records/outgoing/usages/size/${u.id}`)} className="text-red-500 opacity-0 group-hover:opacity-100 hover:text-red-700">
                                        <Trash2 className="w-3 h-3" />
                                      </button>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                              {batch.producedSizes.length > 0 && (
                                <div>
                                  <h4 className="text-sm font-bold text-gray-700 mb-2 border-b pb-1">Produced Sizes</h4>
                                  <ul className="space-y-1">
                                    {batch.producedSizes.map(size => (
                                      <li key={size.id} className="text-xs text-gray-600 flex justify-between items-center group">
                                        <span>{size.timberType?.name} | {size.isReeper ? `${size.runningFeet} rft` : `${size.length}ft x ${size.width}" x ${size.thickness}" | ${size.quantity}nos`}</span>
                                        <button onClick={() => handlePartialDelete(`/records/outgoing/produced/${size.id}`)} className="text-red-500 opacity-0 group-hover:opacity-100 hover:text-red-700">
                                          <Trash2 className="w-3 h-3" />
                                        </button>
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                            </div>

                            <div className="mt-4 pt-4 border-t border-gray-200">
                              {showAddForm === batch.id ? (
                                <div className="bg-white p-3 rounded border shadow-sm">
                                  <h4 className="text-xs font-bold text-gray-700 mb-2">Add Produced Size</h4>
                                  <div className="flex flex-wrap gap-2 items-end">
                                    <select className="border p-1 text-xs" value={newItem.timberTypeId} onChange={e => setNewItem({...newItem, timberTypeId: e.target.value})}>
                                      <option value="">Select Timber</option>
                                      {timberTypes.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                                    </select>
                                    <label className="text-xs flex items-center space-x-1"><input type="checkbox" checked={newItem.isReeper} onChange={e => setNewItem({...newItem, isReeper: e.target.checked})} /><span>Is Reeper</span></label>
                                    {newItem.isReeper ? (
                                      <input type="number" placeholder="R.Feet" className="border p-1 text-xs w-16" value={newItem.runningFeet} onChange={e => setNewItem({...newItem, runningFeet: e.target.value})} />
                                    ) : (
                                      <>
                                        <input type="number" placeholder="L" className="border p-1 text-xs w-12" value={newItem.length} onChange={e => setNewItem({...newItem, length: e.target.value})} />
                                        <input type="number" placeholder="W" className="border p-1 text-xs w-12" value={newItem.width} onChange={e => setNewItem({...newItem, width: e.target.value})} />
                                        <input type="number" placeholder="T" className="border p-1 text-xs w-12" value={newItem.thickness} onChange={e => setNewItem({...newItem, thickness: e.target.value})} />
                                        <input type="number" placeholder="Qty" className="border p-1 text-xs w-12" value={newItem.quantity} onChange={e => setNewItem({...newItem, quantity: e.target.value})} />
                                        <input type="number" placeholder="Vol" className="border p-1 text-xs w-16" value={newItem.totalVolume} onChange={e => setNewItem({...newItem, totalVolume: e.target.value})} />
                                      </>
                                    )}
                                    <button onClick={() => handleAddItem(batch.id, 'outgoing')} className="bg-forest-600 text-white px-2 py-1 text-xs rounded hover:bg-forest-700">Save</button>
                                    <button onClick={() => setShowAddForm(null)} className="bg-gray-200 text-gray-700 px-2 py-1 text-xs rounded hover:bg-gray-300">Cancel</button>
                                  </div>
                                </div>
                              ) : (
                                <button onClick={() => setShowAddForm(batch.id)} className="flex items-center space-x-1 text-xs font-medium text-forest-600 hover:text-forest-800">
                                  <Plus className="w-3 h-3" />
                                  <span>Add Produced Size</span>
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 border-collapse">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Timestamp</th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">User</th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Action</th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Entity</th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Details</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {auditLogs.length === 0 ? (
                    <tr><td colSpan={5} className="px-6 py-8 text-center text-gray-500">No audit logs found.</td></tr>
                  ) : auditLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatDate(log.createdAt)} {new Date(log.createdAt).toLocaleTimeString()}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{log.user.name} ({log.user.email})</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-bold">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          log.action === 'CREATE' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {log.action}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{log.entity} #{log.entityId}</td>
                      <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate" title={log.details}>
                        {log.details}
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
  );
};

export default Records;
