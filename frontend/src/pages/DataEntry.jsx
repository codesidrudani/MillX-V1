import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import { Plus, Trash2 } from 'lucide-react';

const IncomingForm = ({ masters, fetchInventory }) => {
  const [mode, setMode] = useState('log');
  const [isMetric, setIsMetric] = useState(true);
  const [header, setHeader] = useState({ date: new Date().toISOString().split('T')[0], permitNo: '', partyId: '', source: '', sourceType: '' });
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleHeaderChange = (e) => setHeader({ ...header, [e.target.name]: e.target.value });

  const addItem = () => {
    if (mode === 'log') {
      setItems([...items, { logNo: '', timberTypeId: '', length: '', girth: '', volume: '' }]);
    } else {
      setItems([...items, { isReeper: false, runningFeet: '', timberTypeId: '', thickness: '', width: '', length: '', quantity: '1', volume: '' }]);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addItem();
      setTimeout(() => {
        const el = document.getElementById(`incoming-timber-${items.length}`);
        if (el) el.focus();
      }, 50);
    }
  };

  const removeItem = (index) => setItems(items.filter((_, i) => i !== index));

  const handleItemChange = (index, field, value) => {
    const newItems = [...items];
    newItems[index][field] = value;
    
    // Auto calculate volume
    if (mode === 'log' && (field === 'length' || field === 'girth')) {
      const l = parseFloat(newItems[index].length) || 0;
      const g = parseFloat(newItems[index].girth) || 0;
      if (l > 0 && g > 0) {
        newItems[index].volume = (isMetric ? ((l * g * g) / 16) : ((l * g * g) / 2304)).toFixed(3);
      }
    } else if (mode === 'sawn_size') {
      if (field === 'isReeper') {
        newItems[index].isReeper = value;
      }
      if (['thickness', 'width', 'length', 'quantity', 'isReeper'].includes(field) && !newItems[index].isReeper) {
        const t = parseFloat(newItems[index].thickness) || 0;
        const w = parseFloat(newItems[index].width) || 0;
        const l = parseFloat(newItems[index].length) || 0;
        const q = parseInt(newItems[index].quantity) || 1;
        if (t > 0 && w > 0 && l > 0) {
          newItems[index].volume = (t * w * l * q).toFixed(3);
        }
      }
    }
    setItems(newItems);
  };

  const toggleMetric = (checked) => {
    setIsMetric(checked);
    const newItems = items.map(item => {
      let vol = item.volume;
      if (mode === 'log') {
        const l = parseFloat(item.length) || 0;
        const g = parseFloat(item.girth) || 0;
        if (l > 0 && g > 0) {
          vol = (checked ? ((l * g * g) / 16) : ((l * g * g) / 2304)).toFixed(3);
        }
      } else if (mode === 'sawn_size') {
        if (!item.isReeper) {
          const t = parseFloat(item.thickness) || 0;
          const w = parseFloat(item.width) || 0;
          const l = parseFloat(item.length) || 0;
          const q = parseInt(item.quantity) || 1;
          if (t > 0 && w > 0 && l > 0) {
            vol = (t * w * l * q).toFixed(3);
          }
        }
      }
      return { ...item, volume: vol };
    });
    setItems(newItems);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!header.permitNo || !header.partyId || items.length === 0) {
      return setError('Please fill all header fields and add at least one item.');
    }
    setLoading(true);
    try {
      await api.post('/incoming', { ...header, mode, items });
      setSuccess('Incoming batch saved successfully!');
      setItems([]);
      setHeader({ ...header, permitNo: '' });
      fetchInventory();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save incoming batch');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden mb-8">
      <div className="p-6 border-b border-gray-200 bg-gray-50">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-lg font-semibold text-gray-900">Record Incoming Batch</h2>
          <div className="flex items-center space-x-6">
            <label className="flex items-center space-x-2 cursor-pointer">
              <input type="checkbox" checked={isMetric} onChange={(e) => toggleMetric(e.target.checked)} className="h-4 w-4 rounded text-forest-600 focus:ring-forest-500 border-gray-300" />
              <span className="text-sm font-medium text-gray-700">Use Meters</span>
            </label>
            <div className="flex bg-white rounded-lg p-1 border border-gray-200 shadow-sm">
              <button type="button" onClick={() => { setMode('log'); setItems([]); }} className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${mode === 'log' ? 'bg-forest-100 text-forest-700' : 'text-gray-500 hover:text-gray-700'}`}>Round Logs</button>
              <button type="button" onClick={() => { setMode('sawn_size'); setItems([]); }} className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${mode === 'sawn_size' ? 'bg-forest-100 text-forest-700' : 'text-gray-500 hover:text-gray-700'}`}>Sawn Sizes</button>
            </div>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
            <input type="date" name="date" required value={header.date} onChange={handleHeaderChange} className="block w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-forest-500 focus:border-forest-500 sm:text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Permit Number</label>
            <input type="text" name="permitNo" required value={header.permitNo} onChange={handleHeaderChange} className="block w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-forest-500 focus:border-forest-500 sm:text-sm" placeholder="Enter Permit No." />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Party (Supplier)</label>
            <select name="partyId" required value={header.partyId} onChange={handleHeaderChange} className="block w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-forest-500 focus:border-forest-500 sm:text-sm">
              <option value="">Select Party</option>
              {masters.parties?.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Source (State)</label>
            <select name="source" required value={header.source} onChange={handleHeaderChange} className="block w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-forest-500 focus:border-forest-500 sm:text-sm">
              <option value="">Select Source</option>
              <option value="Karnataka">Karnataka</option>
              <option value="Maharashtra">Maharashtra</option>
              <option value="Kerala">Kerala</option>
              <option value="Gujarat">Gujarat</option>
              <option value="Other">Other</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Source Type</label>
            <select name="sourceType" required value={header.sourceType} onChange={handleHeaderChange} className="block w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-forest-500 focus:border-forest-500 sm:text-sm">
              <option value="">Select Type</option>
              <option value="Private">Private</option>
              <option value="Govt">Government</option>
            </select>
          </div>
        </div>
      </div>

      <div className="p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-sm font-medium text-gray-900">{mode === 'log' ? 'Logs Received' : 'Sizes Received'}</h3>
          <button type="button" onClick={addItem} className="flex items-center space-x-1 px-3 py-1.5 text-sm font-medium text-forest-600 hover:bg-forest-50 rounded-md transition-colors">
            <Plus className="w-4 h-4" /><span>Add Row</span>
          </button>
        </div>

        {items.length === 0 ? (
          <div className="text-center py-8 text-gray-500 border-2 border-dashed border-gray-200 rounded-lg">Click "Add Row" to start adding items.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead>
                <tr>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Timber Type</th>
                  {mode === 'log' ? (
                    <>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Log No.</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Length {isMetric ? '(m)' : '(ft)'}</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Girth {isMetric ? '(m)' : '(in)'}</th>
                    </>
                  ) : (
                    <>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Reeper?</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Dimensions {isMetric ? '(m)' : '(ft)'} / R.Feet</th>
                    </>
                  )}
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">{mode === 'log' ? `Volume ${isMetric ? '(cbm)' : '(cft)'}` : `Vol/Qty ${isMetric ? '(cbm)' : '(cft)'}`}</th>
                  <th className="px-3 py-2"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {items.map((item, idx) => (
                  <tr key={idx}>
                    <td className="px-2 py-2">
                      <select id={`incoming-timber-${idx}`} required value={item.timberTypeId} onChange={(e) => handleItemChange(idx, 'timberTypeId', e.target.value)} className="block w-full border-gray-300 rounded-md sm:text-sm">
                        <option value="">Select Type</option>
                        {masters.timberTypes?.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                      </select>
                    </td>
                    {mode === 'log' ? (
                      <>
                        <td className="px-2 py-2"><input type="text" required value={item.logNo} onChange={(e) => handleItemChange(idx, 'logNo', e.target.value)} onKeyDown={handleKeyDown} className="block w-full border-gray-300 rounded-md sm:text-sm" placeholder="No." /></td>
                        <td className="px-2 py-2"><input type="number" step="any" required value={item.length} onChange={(e) => handleItemChange(idx, 'length', e.target.value)} onKeyDown={handleKeyDown} className="block w-full border-gray-300 rounded-md sm:text-sm" placeholder="L" /></td>
                        <td className="px-2 py-2"><input type="number" step="any" required value={item.girth} onChange={(e) => handleItemChange(idx, 'girth', e.target.value)} onKeyDown={handleKeyDown} className="block w-full border-gray-300 rounded-md sm:text-sm" placeholder="G" /></td>
                      </>
                    ) : (
                      <>
                        <td className="px-2 py-2 text-center">
                          <input type="checkbox" checked={item.isReeper} onChange={(e) => handleItemChange(idx, 'isReeper', e.target.checked)} className="h-4 w-4 text-forest-600 rounded" />
                        </td>
                        <td className="px-2 py-2">
                          {item.isReeper ? (
                            <input type="number" step="any" required value={item.runningFeet} onChange={(e) => handleItemChange(idx, 'runningFeet', e.target.value)} onKeyDown={handleKeyDown} className="block w-full border-gray-300 rounded-md sm:text-sm" placeholder="Running Feet" />
                          ) : (
                            <div className="flex space-x-1">
                              <input type="number" step="any" required value={item.thickness} onChange={(e) => handleItemChange(idx, 'thickness', e.target.value)} onKeyDown={handleKeyDown} className="w-12 border-gray-300 rounded-md sm:text-sm" placeholder="T" />
                              <input type="number" step="any" required value={item.width} onChange={(e) => handleItemChange(idx, 'width', e.target.value)} onKeyDown={handleKeyDown} className="w-12 border-gray-300 rounded-md sm:text-sm" placeholder="W" />
                              <input type="number" step="any" required value={item.length} onChange={(e) => handleItemChange(idx, 'length', e.target.value)} onKeyDown={handleKeyDown} className="w-12 border-gray-300 rounded-md sm:text-sm" placeholder="L" />
                              <input type="number" required value={item.quantity} onChange={(e) => handleItemChange(idx, 'quantity', e.target.value)} onKeyDown={handleKeyDown} className="w-12 border-gray-300 rounded-md sm:text-sm" placeholder="Qty" />
                            </div>
                          )}
                        </td>
                      </>
                    )}
                    <td className="px-2 py-2">
                      {!item.isReeper ? (
                        <input type="number" step="any" required value={item.volume} onChange={(e) => handleItemChange(idx, 'volume', e.target.value)} onKeyDown={handleKeyDown} className="block w-24 border-gray-300 rounded-md sm:text-sm bg-gray-50" placeholder="Vol" />
                      ) : (
                        <span className="text-sm text-gray-500 pl-2">R.Ft</span>
                      )}
                    </td>
                    <td className="px-2 py-2 text-right">
                      <button type="button" onClick={() => removeItem(idx)} className="text-red-500 hover:text-red-700"><Trash2 className="w-4 h-4" /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {error && <div className="mt-4 text-sm text-red-600">{error}</div>}
        {success && <div className="mt-4 text-sm text-green-600">{success}</div>}

        <div className="mt-6 flex justify-end">
          <button type="submit" disabled={loading || items.length === 0} className={`px-6 py-2 bg-forest-600 text-white font-medium rounded-lg shadow-sm hover:bg-forest-700 transition-colors ${loading ? 'opacity-50' : ''}`}>
            {loading ? 'Saving...' : 'Submit Incoming Batch'}
          </button>
        </div>
      </div>
    </form>
  );
};

const OutgoingForm = ({ masters, inventory, fetchInventory }) => {
  const [mode, setMode] = useState('log');
  const [isMetric, setIsMetric] = useState(true);
  const [header, setHeader] = useState({ date: new Date().toISOString().split('T')[0], permitNo: '', vehicleNo: '', partyId: '' });
  const [utilizedItemIds, setUtilizedItemIds] = useState([]);
  const [producedSizes, setProducedSizes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [permitFilter, setPermitFilter] = useState('');

  const availableItems = mode === 'log' ? inventory.logs : inventory.sawnSizes;
  const uniquePermits = [...new Set(availableItems?.map(i => i.incomingBatch?.permitNo).filter(Boolean))];

  const displayedItems = permitFilter 
    ? availableItems?.filter(i => i.incomingBatch?.permitNo === permitFilter)
    : availableItems;

  const handleHeaderChange = (e) => setHeader({ ...header, [e.target.name]: e.target.value });

  const toggleItemSelection = (id) => {
    if (utilizedItemIds.includes(id)) {
      setUtilizedItemIds(utilizedItemIds.filter(i => i !== id));
    } else {
      setUtilizedItemIds([...utilizedItemIds, id]);
    }
  };

  const addProducedSize = () => {
    setProducedSizes([...producedSizes, { isReeper: false, runningFeet: '', timberTypeId: '', thickness: '', width: '', length: '', quantity: '1', totalVolume: '' }]);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addProducedSize();
      setTimeout(() => {
        const el = document.getElementById(`outgoing-timber-${producedSizes.length}`);
        if (el) el.focus();
      }, 50);
    }
  };

  const removeProducedSize = (index) => setProducedSizes(producedSizes.filter((_, i) => i !== index));

  const handleProducedSizeChange = (index, field, value) => {
    const newSizes = [...producedSizes];
    
    if (field === 'isReeper') {
      newSizes[index].isReeper = value;
    } else {
      newSizes[index][field] = value;
    }
    
    if (['thickness', 'width', 'length', 'quantity', 'isReeper'].includes(field) && !newSizes[index].isReeper) {
      const t = parseFloat(newSizes[index].thickness) || 0;
      const w = parseFloat(newSizes[index].width) || 0;
      const l = parseFloat(newSizes[index].length) || 0;
      const q = parseInt(newSizes[index].quantity) || 1;
      if (t > 0 && w > 0 && l > 0) {
        newSizes[index].totalVolume = (t * w * l * q).toFixed(3);
      }
    }
    setProducedSizes(newSizes);
  };

  const toggleMetric = (checked) => {
    setIsMetric(checked);
    const newSizes = producedSizes.map(size => {
      let vol = size.totalVolume;
      if (!size.isReeper) {
        const t = parseFloat(size.thickness) || 0;
        const w = parseFloat(size.width) || 0;
        const l = parseFloat(size.length) || 0;
        const q = parseInt(size.quantity) || 1;
        if (t > 0 && w > 0 && l > 0) {
          vol = (t * w * l * q).toFixed(3);
        }
      }
      return { ...size, totalVolume: vol };
    });
    setProducedSizes(newSizes);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!header.permitNo || !header.partyId || utilizedItemIds.length === 0 || producedSizes.length === 0) {
      return setError('Please fill all header fields, select at least one utilized item, and add at least one produced size.');
    }
    setLoading(true);
    try {
      await api.post('/outgoing', { ...header, mode, utilizedItemIds, producedSizes });
      setSuccess('Outgoing batch saved successfully!');
      setUtilizedItemIds([]);
      setProducedSizes([]);
      setHeader({ ...header, permitNo: '' });
      fetchInventory();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save outgoing batch');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden mb-8">
      <div className="p-6 border-b border-gray-200 bg-gray-50">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-lg font-semibold text-gray-900">Record Outgoing / Sawing Batch</h2>
          <div className="flex items-center space-x-6">
            <label className="flex items-center space-x-2 cursor-pointer">
              <input type="checkbox" checked={isMetric} onChange={(e) => toggleMetric(e.target.checked)} className="h-4 w-4 rounded text-forest-600 focus:ring-forest-500 border-gray-300" />
              <span className="text-sm font-medium text-gray-700">Use Meters</span>
            </label>
            <div className="flex bg-white rounded-lg p-1 border border-gray-200 shadow-sm">
              <button type="button" onClick={() => { setMode('log'); setUtilizedItemIds([]); }} className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${mode === 'log' ? 'bg-forest-100 text-forest-700' : 'text-gray-500 hover:text-gray-700'}`}>Utilize Logs</button>
              <button type="button" onClick={() => { setMode('sawn_size'); setUtilizedItemIds([]); }} className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${mode === 'sawn_size' ? 'bg-forest-100 text-forest-700' : 'text-gray-500 hover:text-gray-700'}`}>Utilize Sizes</button>
            </div>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
            <input type="date" name="date" required value={header.date} onChange={handleHeaderChange} className="block w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-forest-500 focus:border-forest-500 sm:text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Permit Number</label>
            <input type="text" name="permitNo" required value={header.permitNo} onChange={handleHeaderChange} className="block w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-forest-500 focus:border-forest-500 sm:text-sm" placeholder="Enter Permit No." />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Vehicle Number</label>
            <input type="text" name="vehicleNo" value={header.vehicleNo} onChange={handleHeaderChange} className="block w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-forest-500 focus:border-forest-500 sm:text-sm" placeholder="e.g. GJ-01-AB-1234" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Party (Customer)</label>
            <select name="partyId" required value={header.partyId} onChange={handleHeaderChange} className="block w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-forest-500 focus:border-forest-500 sm:text-sm">
              <option value="">Select Party</option>
              {masters.parties?.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
        </div>
      </div>

      <div className="p-6 grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Input Items */}
        <div>
          <div className="flex justify-between items-end mb-4 border-b pb-2">
            <h3 className="text-sm font-medium text-gray-900">1. Select Utilized {mode === 'log' ? 'Logs' : 'Sizes'}</h3>
            <div className="w-48">
              <select
                value={permitFilter}
                onChange={(e) => setPermitFilter(e.target.value)}
                className="block w-full px-2 py-1 text-xs border border-gray-300 rounded-md focus:ring-forest-500 focus:border-forest-500"
              >
                <option value="">All Permits</option>
                {uniquePermits.map(p => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>
          </div>
          
          <div className="max-h-64 overflow-y-auto border border-gray-200 rounded-md divide-y divide-gray-100">
            {displayedItems?.length === 0 ? (
              <p className="p-4 text-sm text-gray-500 text-center">
                {permitFilter ? `No ${mode === 'log' ? 'logs' : 'sizes'} available for permit ${permitFilter}.` : `No ${mode === 'log' ? 'logs' : 'sizes'} currently in stock.`}
              </p>
            ) : (
              displayedItems?.map(item => (
                <div key={item.id} className="p-3 hover:bg-gray-50 flex items-center">
                  <input
                    type="checkbox"
                    checked={utilizedItemIds.includes(item.id)}
                    onChange={() => toggleItemSelection(item.id)}
                    className="h-4 w-4 text-forest-600 focus:ring-forest-500 border-gray-300 rounded mr-3"
                  />
                  <div className="text-sm">
                    {mode === 'log' ? (
                      <p className="font-medium text-gray-900">Log No: {item.logNo} - Vol: {item.volume} cft (L:{item.length} G:{item.girth})</p>
                    ) : item.isReeper ? (
                      <p className="font-medium text-gray-900">Reeper #{item.id} - R.Feet: {item.runningFeet}</p>
                    ) : (
                      <p className="font-medium text-gray-900">Size #{item.id} - Vol: {item.volume} (T:{item.thickness} W:{item.width} L:{item.length} Qty:{item.quantity})</p>
                    )}
                    <p className="text-xs text-gray-500">From Permit: {item.incomingBatch?.permitNo}</p>
                  </div>
                </div>
              ))
            )}
          </div>
          <p className="text-xs text-gray-500 mt-2 text-right">{utilizedItemIds.length} items selected.</p>
        </div>

        {/* Output Items */}
        <div>
           <div className="flex justify-between items-center mb-4 border-b pb-2">
            <h3 className="text-sm font-medium text-gray-900">2. Record Sizes Produced & Dispatched</h3>
            <button type="button" onClick={addProducedSize} className="flex items-center space-x-1 px-3 py-1 text-xs font-medium text-forest-600 hover:bg-forest-50 rounded-md transition-colors">
              <Plus className="w-3 h-3" /><span>Add Size</span>
            </button>
          </div>

          <div className="flex space-x-2 px-2 mb-1 text-xs font-medium text-gray-500">
             <span className="w-8">Reeper?</span>
             <span className="flex-1 text-center">Dimensions {isMetric ? '(m)' : '(ft)'} / R.Feet</span>
             <span className="w-20 text-right">Vol/Qty {isMetric ? '(cbm)' : '(cft)'}</span>
          </div>

          {producedSizes.length === 0 ? (
            <div className="text-center py-6 text-gray-500 border-2 border-dashed border-gray-200 rounded-lg text-sm">Click "Add Size" to record output.</div>
          ) : (
            <div className="space-y-3 max-h-64 overflow-y-auto">
              {producedSizes.map((size, idx) => (
                <div key={idx} className="flex items-center space-x-2 bg-gray-50 p-2 rounded-md border border-gray-200">
                  <select id={`outgoing-timber-${idx}`} required value={size.timberTypeId || ''} onChange={(e) => handleProducedSizeChange(idx, 'timberTypeId', e.target.value)} className="w-24 px-1 py-1 text-sm border-gray-300 rounded-md bg-white">
                     <option value="">Type</option>
                     {masters.timberTypes?.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                  </select>
                  <input type="checkbox" checked={size.isReeper} onChange={(e) => handleProducedSizeChange(idx, 'isReeper', e.target.checked)} className="h-4 w-4 text-forest-600 rounded mx-2" />
                  
                  {size.isReeper ? (
                    <input type="number" step="any" required placeholder="Running Feet" value={size.runningFeet} onChange={(e) => handleProducedSizeChange(idx, 'runningFeet', e.target.value)} onKeyDown={handleKeyDown} className="flex-1 px-2 py-1 text-sm border-gray-300 rounded-md" />
                  ) : (
                    <div className="flex space-x-1 flex-1">
                      <input type="number" step="any" required placeholder="T" value={size.thickness} onChange={(e) => handleProducedSizeChange(idx, 'thickness', e.target.value)} onKeyDown={handleKeyDown} className="w-10 px-1 py-1 text-sm border-gray-300 rounded-md" />
                      <input type="number" step="any" required placeholder="W" value={size.width} onChange={(e) => handleProducedSizeChange(idx, 'width', e.target.value)} onKeyDown={handleKeyDown} className="w-10 px-1 py-1 text-sm border-gray-300 rounded-md" />
                      <input type="number" step="any" required placeholder="L" value={size.length} onChange={(e) => handleProducedSizeChange(idx, 'length', e.target.value)} onKeyDown={handleKeyDown} className="w-10 px-1 py-1 text-sm border-gray-300 rounded-md" />
                      <input type="number" required placeholder="Qty" value={size.quantity} onChange={(e) => handleProducedSizeChange(idx, 'quantity', e.target.value)} onKeyDown={handleKeyDown} className="w-10 px-1 py-1 text-sm border-gray-300 rounded-md" />
                    </div>
                  )}

                  {!size.isReeper ? (
                    <input type="number" step="any" required placeholder="Vol" value={size.totalVolume} onChange={(e) => handleProducedSizeChange(idx, 'totalVolume', e.target.value)} onKeyDown={handleKeyDown} className="w-16 px-1 py-1 text-sm border-gray-300 rounded-md bg-white text-right" />
                  ) : (
                    <span className="w-16 text-sm text-gray-500 text-right pr-2">R.Ft</span>
                  )}
                  
                  <button type="button" onClick={() => removeProducedSize(idx)} className="p-1 text-red-500 hover:text-red-700"><Trash2 className="w-4 h-4" /></button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="p-6 bg-gray-50 border-t border-gray-200 flex justify-between items-center">
        <div>
           {error && <div className="text-sm text-red-600 font-medium">{error}</div>}
           {success && <div className="text-sm text-green-600 font-medium">{success}</div>}
        </div>
        <button type="submit" disabled={loading || utilizedItemIds.length === 0 || producedSizes.length === 0} className={`px-6 py-2 bg-forest-600 text-white font-medium rounded-lg shadow-sm hover:bg-forest-700 transition-colors ${loading ? 'opacity-50' : ''}`}>
          {loading ? 'Saving...' : 'Submit Outgoing Batch'}
        </button>
      </div>
    </form>
  );
};

const DataEntry = () => {
  const [activeTab, setActiveTab] = useState('incoming');
  const [masters, setMasters] = useState({});
  const [inventory, setInventory] = useState({ logs: [], sawnSizes: [] });
  const [loading, setLoading] = useState(true);

  const fetchInitialData = async () => {
    try {
      const [mastersRes, invRes] = await Promise.all([
        api.get('/masters/all'),
        api.get('/inventory/in-stock')
      ]);
      setMasters(mastersRes.data);
      setInventory(invRes.data);
    } catch (error) {
      console.error("Failed to load data for data entry", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInitialData();
  }, []);

  if (loading) return <div className="p-8 text-gray-500 text-center">Loading forms...</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Data Entry</h1>
          <p className="text-gray-500">Record incoming stock and outgoing dispatches</p>
        </div>
      </div>

      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('incoming')}
            className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'incoming'
                ? 'border-forest-500 text-forest-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Incoming Form (Receipts)
          </button>
          <button
            onClick={() => setActiveTab('outgoing')}
            className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'outgoing'
                ? 'border-forest-500 text-forest-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Outgoing Form (Sawing & Dispatch)
          </button>
        </nav>
      </div>

      <div>
        {activeTab === 'incoming' ? (
          <IncomingForm masters={masters} fetchInventory={fetchInitialData} />
        ) : (
          <OutgoingForm masters={masters} inventory={inventory} fetchInventory={fetchInitialData} />
        )}
      </div>
    </div>
  );
};

export default DataEntry;
