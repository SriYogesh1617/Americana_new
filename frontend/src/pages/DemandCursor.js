import React, { useState, useEffect } from 'react';
import { useQuery, useMutation } from 'react-query';
import toast from 'react-hot-toast';
import { demandAPI } from '../services/api';
import { downloadFile } from '../utils/download';

const DemandCursor = () => {
  const [filters, setFilters] = useState({
    geography: '',
    market: '',
    cty: '',
    fgsku_code: '',
    month: '',
    year: '',
    workbook_id: '',
    worksheet_id: '',
    date_from: '',
    date_to: ''
  });
  
  const [sortBy, setSortBy] = useState('created_at');
  const [sortOrder, setSortOrder] = useState('DESC');
  const [limit, setLimit] = useState(10000);
  const [offset, setOffset] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);

  // Sample data for the separate table - will be populated from API with lookup logic
  const [separateTableData, setSeparateTableData] = useState([]);
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [tableStats, setTableStats] = useState(null);

  // Fetch filtered demand data
  const { data: cursorData, isLoading: cursorLoading, refetch: refetchCursor } = useQuery(
    ['demand-cursor', filters, sortBy, sortOrder, limit, offset],
    () => demandAPI.createFilteredDemandCursor({
      filters,
      sortBy,
      sortOrder,
      limit,
      offset
    }),
    {
      enabled: false, // Don't auto-fetch, user will trigger
      refetchOnWindowFocus: false
    }
  );

  // Fetch cursor statistics
  const { data: statsData, isLoading: statsLoading, refetch: refetchStats } = useQuery(
    ['demand-cursor-stats', filters],
    () => demandAPI.getDemandCursorStats({ filters }),
    {
      enabled: false,
      refetchOnWindowFocus: false
    }
  );

  // Export mutation
  const exportMutation = useMutation(
    (exportData) => demandAPI.exportFilteredDemandData(exportData),
    {
      onSuccess: (blob, variables) => {
        const filename = `filtered_demand_data_${Date.now()}.${variables.format}`;
        downloadFile(blob, filename);
        toast.success('Filtered demand data exported successfully!');
      },
      onError: (error) => {
        toast.error('Failed to export filtered demand data');
        console.error('Error exporting data:', error);
      }
    }
  );

  // Auto-load data when component mounts
  useEffect(() => {
    populateTableWithLookup();
  }, []);

  // Function to populate table with real data from API
  const populateTableWithLookup = async () => {
    setIsLoadingData(true);
    try {
      // Get filtered demand data from API - request more data to show all MthNum values
      const response = await demandAPI.getFilteredDemandData({
        limit: 10000,
        offset: 0
      });
      
      setSeparateTableData(response.data);
      
      // Get statistics
      const statsResponse = await demandAPI.getFilteredDemandStats();
      setTableStats(statsResponse);
      
      toast.success(`Table populated with ${response.data.length} rows successfully!`);
      
    } catch (error) {
      console.error('Error populating table:', error);
      toast.error('Failed to populate table with data from database');
    } finally {
      setIsLoadingData(false);
    }
  };

  const handleFilterChange = (field, value) => {
    setFilters(prev => ({
      ...prev,
      [field]: value
    }));
    setOffset(0);
    setCurrentPage(1);
  };

  const handleSearch = () => {
    refetchCursor();
    refetchStats();
  };

  const handleExport = (format = 'xlsx') => {
    exportMutation.mutate({
      filters,
      format,
      sortBy,
      sortOrder
    });
  };

  const handlePageChange = (newPage) => {
    const newOffset = (newPage - 1) * limit;
    setOffset(newOffset);
    setCurrentPage(newPage);
  };

  const clearFilters = () => {
    setFilters({
      geography: '',
      market: '',
      cty: '',
      fgsku_code: '',
      month: '',
      year: '',
      workbook_id: '',
      worksheet_id: '',
      date_from: '',
      date_to: ''
    });
    setOffset(0);
    setCurrentPage(1);
  };

  const formatNumber = (num) => {
    if (num === null || num === undefined) return '0';
    return new Intl.NumberFormat().format(num);
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Filtered Demand</h1>
        <p className="text-gray-600">Filter and analyze processed demand data with advanced querying capabilities</p>
      </div>

      {/* Redesigned Table Section */}
      <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold text-white">Filtered Demand</h2>
            <div className="flex gap-3">
              <button
                onClick={populateTableWithLookup}
                disabled={isLoadingData}
                className="px-4 py-2 bg-white/20 backdrop-blur-sm text-white rounded-lg hover:bg-white/30 disabled:opacity-50 transition-all duration-200 border border-white/30"
              >
                {isLoadingData ? 'Loading...' : 'Load Data'}
              </button>
              <button
                onClick={populateTableWithLookup}
                disabled={isLoadingData}
                className="px-4 py-2 bg-white/20 backdrop-blur-sm text-white rounded-lg hover:bg-white/30 disabled:opacity-50 transition-all duration-200 border border-white/30"
                title="Refresh data with latest backend changes"
              >
                🔄 Refresh
              </button>
              <button
                onClick={() => handleExport('xlsx')}
                disabled={exportMutation.isLoading}
                className="px-4 py-2 bg-white/20 backdrop-blur-sm text-white rounded-lg hover:bg-white/30 disabled:opacity-50 transition-all duration-200 border border-white/30"
              >
                Export Excel
              </button>
              <button
                onClick={() => handleExport('csv')}
                disabled={exportMutation.isLoading}
                className="px-4 py-2 bg-white/20 backdrop-blur-sm text-white rounded-lg hover:bg-white/30 disabled:opacity-50 transition-all duration-200 border border-white/30"
              >
                Export CSV
              </button>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider bg-gradient-to-r from-gray-50 to-gray-100">
                  CTY
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider bg-gradient-to-r from-gray-50 to-gray-100">
                  PD/NPD
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider bg-gradient-to-r from-gray-50 to-gray-100">
                  Origin
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider bg-gradient-to-r from-gray-50 to-gray-100">
                  Unified Code
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider bg-gradient-to-r from-gray-50 to-gray-100">
                  MthNum
                </th>
                <th className="px-6 py-4 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider bg-gradient-to-r from-gray-50 to-gray-100">
                  Demand Cases
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-100">
              {separateTableData.length > 0 ? (
                separateTableData.map((row, index) => (
                  <tr key={index} className="hover:bg-blue-50 transition-colors duration-200 group">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900 group-hover:text-blue-700">{row.cty || 'N/A'}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        row.pdNpd === 'PD' 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-orange-100 text-orange-800'
                      }`}>
                        {row.pdNpd || 'N/A'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{row.origin || 'N/A'}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-mono text-gray-900 bg-gray-50 px-2 py-1 rounded">{row.unifiedCode || 'N/A'}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{row.mthNum || 'N/A'}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <div className="text-sm font-semibold text-gray-900">{formatNumber(row.demandCases)}</div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="6" className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center">
                      <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                        <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                        </svg>
                      </div>
                      <h3 className="text-lg font-medium text-gray-900 mb-2">No data available</h3>
                      <p className="text-gray-500">Click "Load Data" to populate the table with lookup data</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Statistics Section */}
      {tableStats && (
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Statistics</h2>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-blue-50 p-4 rounded-lg"><div className="text-2xl font-bold text-blue-600">{formatNumber(tableStats.statistics?.total_records || 0)}</div><div className="text-sm text-gray-600">Total Records</div></div>
            <div className="bg-green-50 p-4 rounded-lg"><div className="text-2xl font-bold text-green-600">{formatNumber(tableStats.statistics?.total_demand_cases || 0)}</div><div className="text-sm text-gray-600">Total Demand Cases</div></div>
            <div className="bg-purple-50 p-4 rounded-lg"><div className="text-2xl font-bold text-purple-600">{formatNumber(tableStats.statistics?.unique_cty || 0)}</div><div className="text-sm text-gray-600">Unique CTY</div></div>
            <div className="bg-orange-50 p-4 rounded-lg"><div className="text-2xl font-bold text-orange-600">{formatNumber(tableStats.statistics?.unique_codes || 0)}</div><div className="text-sm text-gray-600">Unique Codes</div></div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
            <div>
              <h3 className="font-semibold mb-2">Top CTY Values</h3>
              <div className="space-y-2">
                {(tableStats.top_cty || []).map((item, index) => (
                  <div key={index} className="flex justify-between text-sm">
                    <span>{item.cty || 'N/A'}</span>
                    <span className="font-medium">{item.count}</span>
                  </div>
                ))}
              </div>
            </div>
            
            <div>
              <h3 className="font-semibold mb-2">Origin Distribution</h3>
              <div className="space-y-2">
                {(tableStats.origin_distribution || tableStats.pd_npd_distribution || []).map((item, index) => (
                  <div key={index} className="flex justify-between text-sm">
                    <span>{item.origin || item.pd_npd || 'N/A'}</span>
                    <span className="font-medium">{item.count}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Results Section */}
      {cursorData && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">Filtered Results</h2>
            
            <div className="flex gap-2">
              <button
                onClick={() => handleExport('xlsx')}
                disabled={exportMutation.isLoading}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
              >
                Export Excel
              </button>
              <button
                onClick={() => handleExport('csv')}
                disabled={exportMutation.isLoading}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                Export CSV
              </button>
            </div>
          </div>

          <div className="mb-4 text-sm text-gray-600">
            Showing {cursorData.pagination.offset + 1} to {Math.min(cursorData.pagination.offset + cursorData.pagination.limit, cursorData.pagination.total)} of {cursorData.pagination.total} results
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Geography</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Market</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">CTY</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">FGSKU Code</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Demand Cases</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Supply</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Month/Year</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {cursorData.data.map((row, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{row.geography || 'N/A'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{row.market || 'N/A'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{row.cty || 'N/A'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{row.fgsku_code || 'N/A'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{formatNumber(row.demand_cases)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{formatNumber(row.supply)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{row.month}/{row.year}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {cursorData.pagination.totalPages > 1 && (
            <div className="flex justify-between items-center mt-6">
              <div className="text-sm text-gray-700">
                Page {cursorData.pagination.page} of {cursorData.pagination.totalPages}
              </div>
              
              <div className="flex gap-2">
                <button
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="px-3 py-1 border border-gray-300 rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                
                <button
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === cursorData.pagination.totalPages}
                  className="px-3 py-1 border border-gray-300 rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {cursorData && cursorData.data.length === 0 && (
        <div className="bg-white rounded-lg shadow-md p-6 text-center">
          <p className="text-gray-500">No data found with the current filters.</p>
        </div>
      )}
    </div>
  );
};

export default DemandCursor; 