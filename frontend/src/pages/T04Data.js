import React, { useState, useEffect } from 'react';
import { t04API } from '../services/api';

const T04Data = () => {
  const [t04Data, setT04Data] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({
    fg_sku_code: '',
    wh: '',
    mth_num: ''
  });
  const [processing, setProcessing] = useState(false);

  const warehouses = ['GFCM', 'KFCM', 'NFCM', 'X'];
  const months = Array.from({ length: 12 }, (_, i) => i + 1);

  useEffect(() => {
    fetchT04Data();
    fetchSummary();
  }, []);

  const fetchT04Data = async () => {
    try {
      setLoading(true);
      const response = await t04API.getT04Data(filters);
      setT04Data(response.data || []);
      setError(null);
    } catch (err) {
      console.error('Error fetching T04 data:', err);
      setError('Failed to fetch T04 data');
    } finally {
      setLoading(false);
    }
  };

  const fetchSummary = async () => {
    try {
      const response = await t04API.getT04Summary();
      setSummary(response.data);
    } catch (err) {
      console.error('Error fetching T04 summary:', err);
    }
  };

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const applyFilters = () => {
    fetchT04Data();
  };

  const clearFilters = () => {
    setFilters({
      fg_sku_code: '',
      wh: '',
      mth_num: ''
    });
    fetchT04Data();
  };

  const processT04Data = async () => {
    try {
      setProcessing(true);
      const response = await t04API.processT04Data([]); // Will be populated with actual workbook IDs
      
      if (response.success) {
        alert('T04 WHBal data processed successfully!');
        fetchT04Data();
        fetchSummary();
      }
    } catch (err) {
      console.error('Error processing T04 data:', err);
      alert('Failed to process T04 data: ' + (err.response?.data?.error || err.message));
    } finally {
      setProcessing(false);
    }
  };

  const recalculateFormulas = async () => {
    try {
      setProcessing(true);
      const response = await t04API.recalculateT04();
      
      if (response.success) {
        alert(`Recalculated formulas for ${response.updatedCount} records`);
        fetchT04Data();
        fetchSummary();
      }
    } catch (err) {
      console.error('Error recalculating T04 formulas:', err);
      alert('Failed to recalculate formulas: ' + (err.response?.data?.error || err.message));
    } finally {
      setProcessing(false);
    }
  };

  const updateField = async (id, field, value) => {
    try {
      const response = await t04API.updateT04Field(id, field, parseFloat(value) || 0);
      
      if (response.success) {
        fetchT04Data(); // Refresh data to show updated calculations
      }
    } catch (err) {
      console.error('Error updating T04 field:', err);
      alert('Failed to update field: ' + (err.response?.data?.error || err.message));
    }
  };

  const formatNumber = (num) => {
    if (num === null || num === undefined) return '0';
    return parseFloat(num).toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  };

  const formatConstraint = (value) => {
    return value ? '✓' : '✗';
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-900">T04 - Warehouse Balance Data</h1>
        <div className="flex space-x-3">
          <button
            onClick={processT04Data}
            disabled={processing}
            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
          >
            {processing ? 'Processing...' : 'Process T04 Data'}
          </button>
          <button
            onClick={recalculateFormulas}
            disabled={processing}
            className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:opacity-50"
          >
            {processing ? 'Calculating...' : 'Recalculate Formulas'}
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
          {error}
        </div>
      )}

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                    <span className="text-white font-bold">📦</span>
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Total Records</dt>
                    <dd className="text-lg font-medium text-gray-900">{summary.total_records}</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                    <span className="text-white font-bold">🏷️</span>
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Unique SKUs</dt>
                    <dd className="text-lg font-medium text-gray-900">{summary.unique_skus}</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-yellow-500 rounded-full flex items-center justify-center">
                    <span className="text-white font-bold">🏢</span>
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Warehouses</dt>
                    <dd className="text-lg font-medium text-gray-900">{summary.unique_warehouses}</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center">
                    <span className="text-white font-bold">📅</span>
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Months</dt>
                    <dd className="text-lg font-medium text-gray-900">{summary.unique_months}</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-red-500 rounded-full flex items-center justify-center">
                    <span className="text-white font-bold">💰</span>
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Total Storage Cost</dt>
                    <dd className="text-lg font-medium text-gray-900">{formatNumber(summary.total_storage_cost)}</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">SKU Code</label>
            <input
              type="text"
              name="fg_sku_code"
              value={filters.fg_sku_code}
              onChange={handleFilterChange}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter SKU code..."
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Warehouse</label>
            <select
              name="wh"
              value={filters.wh}
              onChange={handleFilterChange}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Warehouses</option>
              {warehouses.map(wh => (
                <option key={wh} value={wh}>{wh}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Month</label>
            <select
              name="mth_num"
              value={filters.mth_num}
              onChange={handleFilterChange}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Months</option>
              {months.map(month => (
                <option key={month} value={month}>Month {month}</option>
              ))}
            </select>
          </div>
          <div className="flex items-end space-x-2">
            <button
              onClick={applyFilters}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Apply Filters
            </button>
            <button
              onClick={clearFilters}
              className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
            >
              Clear
            </button>
          </div>
        </div>
      </div>

      {/* Data Table */}
      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">WH</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">SKU Code</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Month</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">MTO Demand</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">MTS Demand</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Opening Stock</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Closing Stock</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Storage Cost</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Constraints</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {t04Data.map((record) => (
                <tr key={record.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      record.wh === 'X' ? 'bg-red-100 text-red-800' : 'bg-blue-100 text-blue-800'
                    }`}>
                      {record.wh}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{record.fg_sku_code}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{record.mth_num}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{formatNumber(record.mto_demand_next_month)}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{formatNumber(record.mts_demand_next_month)}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{formatNumber(record.os_tot)}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{formatNumber(record.cs_tot)}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{formatNumber(record.storage_cost)}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <div className="flex space-x-1">
                      <span className={`text-xs ${record.os_ge_min ? 'text-green-600' : 'text-red-600'}`}>
                        OS≥Min {formatConstraint(record.os_ge_min)}
                      </span>
                      <span className={`text-xs ${record.cs_ge_min ? 'text-green-600' : 'text-red-600'}`}>
                        CS≥Min {formatConstraint(record.cs_ge_min)}
                      </span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          
          {t04Data.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              No T04 WHBal data found. Click "Process T04 Data" to generate records.
            </div>
          )}
        </div>
      </div>

      {/* Record Count */}
      <div className="mt-4 text-sm text-gray-600">
        Showing {t04Data.length} records
      </div>
    </div>
  );
};

export default T04Data; 