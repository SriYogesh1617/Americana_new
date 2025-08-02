import React, { useState, useEffect } from 'react';
import { Search, Filter, Download, RefreshCw, Plus, Edit3, Save, X } from 'lucide-react';
import { downloadT03Data, processT03Data } from '../services/api';

const T03Data = () => {
  const [t03Data, setT03Data] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [summary, setSummary] = useState(null);
  const [filters, setFilters] = useState({
    workbook_id: '',
    fg_sku_code: '',
    mth_num: '',
    factory: '',
    warehouse: ''
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editingValue, setEditingValue] = useState('');
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    fetchT03Data();
    fetchSummary();
  }, [filters]);

  const fetchT03Data = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/t03?' + new URLSearchParams(filters));
      const result = await response.json();
      
      if (result.success) {
        setT03Data(result.data);
      } else {
        setError(result.error);
      }
    } catch (err) {
      setError('Failed to fetch T03 data');
      console.error('Error fetching T03 data:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchSummary = async () => {
    try {
      const response = await fetch('/api/t03/summary?' + new URLSearchParams(filters));
      const result = await response.json();
      
      if (result.success) {
        setSummary(result.data);
      }
    } catch (err) {
      console.error('Error fetching summary:', err);
    }
  };

  const handleFilterChange = (field, value) => {
    setFilters(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const clearFilters = () => {
    setFilters({
      workbook_id: '',
      fg_sku_code: '',
      mth_num: '',
      factory: '',
      warehouse: ''
    });
    setSearchTerm('');
  };

  const filteredData = t03Data.filter(item =>
    (searchTerm === '' || 
     item.fg_sku_code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
     item.wh?.toLowerCase().includes(searchTerm.toLowerCase()) ||
     item.plt?.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleQuantityEdit = (id, currentQty) => {
    setEditingId(id);
    setEditingValue(currentQty.toString());
  };

  const saveQuantityEdit = async (id) => {
    try {
      const response = await fetch(`/api/t03/${id}/quantity`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ qty: parseFloat(editingValue) || 0 })
      });

      const result = await response.json();
      
      if (result.success) {
        // Update the local data
        setT03Data(prev => prev.map(item => 
          item.id === id ? result.data : item
        ));
        setEditingId(null);
        setEditingValue('');
        // Refresh summary
        fetchSummary();
      } else {
        setError(result.error);
      }
    } catch (err) {
      setError('Failed to update quantity');
      console.error('Error updating quantity:', err);
    }
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditingValue('');
  };

  const handleProcessT03 = async () => {
    try {
      setProcessing(true);
      // This would typically require selecting source workbooks
      // For now, we'll process with existing data
      const sourceWorkbooks = []; // This should be populated from user selection
      
      const result = await processT03Data(sourceWorkbooks);
      
      if (result.success) {
        fetchT03Data();
        fetchSummary();
        alert('T03 data processed successfully!');
      } else {
        setError(result.error);
      }
    } catch (err) {
      setError('Failed to process T03 data');
      console.error('Error processing T03:', err);
    } finally {
      setProcessing(false);
    }
  };

  const handleRecalculate = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/t03/recalculate', {
        method: 'POST'
      });
      
      const result = await response.json();
      
      if (result.success) {
        fetchT03Data();
        fetchSummary();
      } else {
        setError(result.error);
      }
    } catch (err) {
      setError('Failed to recalculate T03 data');
      console.error('Error recalculating:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatNumber = (num) => {
    if (num === null || num === undefined) return '-';
    return parseFloat(num).toLocaleString(undefined, { 
      minimumFractionDigits: 0, 
      maximumFractionDigits: 4 
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg">Loading T03 Primary Distribution data...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">T03 - Primary Distribution</h1>
          <p className="text-gray-600">Manage factory-to-warehouse distribution data</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleRecalculate}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50"
          >
            <RefreshCw className="w-4 h-4" />
            Recalculate
          </button>
          <button
            onClick={handleProcessT03}
            disabled={processing}
            className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50"
          >
            <Plus className="w-4 h-4" />
            {processing ? 'Processing...' : 'Process T03'}
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div className="bg-white p-4 rounded-lg shadow border">
            <div className="text-sm font-medium text-gray-500">Total Records</div>
            <div className="text-2xl font-bold text-gray-900">{summary.total_records}</div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow border">
            <div className="text-sm font-medium text-gray-500">Unique SKUs</div>
            <div className="text-2xl font-bold text-gray-900">{summary.unique_skus}</div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow border">
            <div className="text-sm font-medium text-gray-500">Factories</div>
            <div className="text-2xl font-bold text-gray-900">{summary.unique_factories}</div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow border">
            <div className="text-sm font-medium text-gray-500">Warehouses</div>
            <div className="text-2xl font-bold text-gray-900">{summary.unique_warehouses}</div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow border">
            <div className="text-sm font-medium text-gray-500">Total Quantity</div>
            <div className="text-2xl font-bold text-gray-900">{formatNumber(summary.total_quantity)}</div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow border space-y-4">
        <div className="flex items-center gap-2">
          <Filter className="w-5 h-5 text-gray-500" />
          <span className="font-medium">Filters</span>
          <button
            onClick={clearFilters}
            className="ml-auto text-sm text-gray-500 hover:text-gray-700"
          >
            Clear All
          </button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              SKU Code
            </label>
            <input
              type="text"
              value={filters.fg_sku_code}
              onChange={(e) => handleFilterChange('fg_sku_code', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter SKU..."
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Month
            </label>
            <select
              value={filters.mth_num}
              onChange={(e) => handleFilterChange('mth_num', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Months</option>
              {[1,2,3,4,5,6,7,8,9,10,11,12].map(month => (
                <option key={month} value={month}>Month {month}</option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Factory
            </label>
            <input
              type="text"
              value={filters.factory}
              onChange={(e) => handleFilterChange('factory', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter factory..."
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Warehouse
            </label>
            <input
              type="text"
              value={filters.warehouse}
              onChange={(e) => handleFilterChange('warehouse', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter warehouse..."
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Search
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Search..."
              />
            </div>
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {/* Data Table */}
      <div className="bg-white rounded-lg shadow border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Warehouse
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Factory
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  SKU Code
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Month
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Cost/Unit
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Weight/Unit
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Quantity
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total Weight
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Row Cost
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredData.map((item) => (
                <tr key={item.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {item.wh}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {item.plt}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {item.fg_sku_code}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {item.mth_num}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatNumber(item.cost_per_unit)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatNumber(item.fg_wt_per_unit)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {editingId === item.id ? (
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          value={editingValue}
                          onChange={(e) => setEditingValue(e.target.value)}
                          className="w-20 px-2 py-1 border border-gray-300 rounded text-sm"
                          step="0.01"
                          min="0"
                        />
                        <button
                          onClick={() => saveQuantityEdit(item.id)}
                          className="text-green-600 hover:text-green-800"
                        >
                          <Save className="w-4 h-4" />
                        </button>
                        <button
                          onClick={cancelEdit}
                          className="text-red-600 hover:text-red-800"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <span>{formatNumber(item.qty)}</span>
                        <button
                          onClick={() => handleQuantityEdit(item.id, item.qty)}
                          className="text-blue-600 hover:text-blue-800"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatNumber(item.wt)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatNumber(item.row_cost)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <button
                      onClick={() => downloadT03Data(item.id)}
                      className="text-blue-600 hover:text-blue-800"
                    >
                      <Download className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {filteredData.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            No T03 distribution data found
          </div>
        )}
      </div>

      {/* Data Count */}
      <div className="text-sm text-gray-500">
        Showing {filteredData.length} of {t03Data.length} records
      </div>
    </div>
  );
};

export default T03Data; 