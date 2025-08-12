import React, { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import styled from 'styled-components';
import { Download, RefreshCw, Plus } from 'lucide-react';
import { processT03Data } from '../services/api';
import api from '../services/api';

// Styled components for Excel-like table
const Container = styled.div`
  padding: 20px;
  max-width: 100%;
  overflow-x: auto;
`;

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  flex-wrap: wrap;
  gap: 10px;
`;

const Title = styled.h1`
  color: #333;
  margin: 0;
`;

const Button = styled.button`
  background: ${props => props.variant === 'danger' ? '#dc3545' : props.variant === 'success' ? '#28a745' : '#007bff'};
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 5px;
  cursor: pointer;
  font-size: 14px;
  transition: background 0.3s;
  display: flex;
  align-items: center;
  gap: 8px;

  &:hover {
    background: ${props => props.variant === 'danger' ? '#c82333' : props.variant === 'success' ? '#218838' : '#0056b3'};
  }

  &:disabled {
    background: #6c757d;
    cursor: not-allowed;
  }
`;

const StatsContainer = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 15px;
  margin-bottom: 20px;
`;

const StatCard = styled.div`
  background: white;
  padding: 15px;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  border-left: 4px solid #007bff;
`;

const StatTitle = styled.div`
  font-size: 12px;
  color: #666;
  text-transform: uppercase;
  margin-bottom: 5px;
`;

const StatValue = styled.div`
  font-size: 24px;
  font-weight: bold;
  color: #333;
`;

const ControlPanel = styled.div`
  background: white;
  padding: 20px;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  margin-bottom: 20px;
`;

const ControlRow = styled.div`
  display: flex;
  gap: 15px;
  align-items: center;
  margin-bottom: 15px;
  flex-wrap: wrap;
`;

const Label = styled.label`
  font-weight: 500;
  color: #333;
  min-width: 120px;
`;

const Select = styled.select`
  padding: 8px 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
  min-width: 200px;
`;

const Input = styled.input`
  padding: 8px 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
  min-width: 200px;
`;

const ExcelTableContainer = styled.div`
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  overflow: auto;
  max-height: 600px;
`;

const ExcelTable = styled.table`
  border-collapse: collapse;
  width: 100%;
  font-size: 12px;
`;

const ExcelTh = styled.th`
  background: #f8f9fa;
  border: 1px solid #dee2e6;
  padding: 8px;
  text-align: left;
  font-weight: 600;
  position: sticky;
  top: 0;
  z-index: 10;
  white-space: nowrap;
`;

const ExcelTd = styled.td`
  border: 1px solid #dee2e6;
  padding: 6px 8px;
  white-space: nowrap;
`;

const ExcelTr = styled.tr`
  &:nth-child(even) {
    background: #f8f9fa;
  }
  
  &:hover {
    background: #e9ecef;
  }
`;

const Message = styled.div`
  padding: 15px;
  border-radius: 5px;
  margin-bottom: 20px;
  background: ${props => props.type === 'success' ? '#d4edda' : props.type === 'error' ? '#f8d7da' : '#d1ecf1'};
  color: ${props => props.type === 'success' ? '#155724' : props.type === 'error' ? '#721c24' : '#0c5460'};
  border: 1px solid ${props => props.type === 'success' ? '#c3e6cb' : props.type === 'error' ? '#f5c6cb' : '#bee5eb'};
`;

const LoadingSpinner = styled.div`
  text-align: center;
  padding: 40px;
  color: #666;
`;

const ValidationBadge = styled.span`
  display: inline-flex;
  align-items: center;
  padding: 2px 6px;
  border-radius: 12px;
  font-size: 10px;
  font-weight: 500;
  background: ${props => props.valid ? '#d4edda' : '#f8d7da'};
  color: ${props => props.valid ? '#155724' : '#721c24'};
`;

// Add export button styling
const ExportButton = styled.button`
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 600;
  margin-left: 10px;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  gap: 8px;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 25px rgba(102, 126, 234, 0.3);
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    transform: none;
  }
`;

const T03Data = () => {
  const [selectedUploadBatch, setSelectedUploadBatch] = useState('');
  const [availableUploadBatches, setAvailableUploadBatches] = useState([]);
  const [message, setMessage] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [recordsPerPage, setRecordsPerPage] = useState(100);
  const [showFormulas, setShowFormulas] = useState(true); // Toggle for formula view
  const queryClient = useQueryClient();

  // Force set upload batch on mount if needed
  useEffect(() => {
    if (!selectedUploadBatch && availableUploadBatches.length === 0) {
      // Directly set the known upload batch
      const knownBatch = 'c2f9b2df-7b5e-47aa-a6e2-cb4852c488d7';
      console.log('Force setting upload batch:', knownBatch);
      setAvailableUploadBatches([knownBatch]);
      setSelectedUploadBatch(knownBatch);
    }
  }, [selectedUploadBatch, availableUploadBatches]);

  // Get T03 statistics
  const { data: stats, isLoading: statsLoading } = useQuery(
    't03Stats',
    () => api.get('/t03/summary'),
    { 
      refetchInterval: 30000,
      cacheTime: 0, // Don't cache the data
      staleTime: 0  // Always consider data stale
    }
  );

  // Get T03 data with pagination
  const { data: t03Data, isLoading: dataLoading, refetch: refetchData } = useQuery(
    ['t03Data', selectedUploadBatch, currentPage, recordsPerPage],
    () => api.get('/t03', { 
      params: { 
        upload_batch_id: selectedUploadBatch,
        page: currentPage,
        limit: recordsPerPage,
        _t: Date.now() // Cache buster
      } 
    }),
    { 
      enabled: !!selectedUploadBatch, 
      refetchInterval: 10000, // More frequent refresh
      cacheTime: 0, // Don't cache the data
      staleTime: 0,  // Always consider data stale
      refetchOnWindowFocus: true, // Refetch when window gets focus
      refetchOnMount: true // Always refetch on mount
    }
  );

  // Get available upload batches from T03 data
  const { data: uploadBatchesData } = useQuery(
    'uploadBatches',
    () => api.get('/t03/upload-batches'), // Get from T03 instead of cursor
    {
      onSuccess: (data) => {
        if (data && data.data && data.data.length > 0) {
          const batches = data.data.map(batch => batch.upload_batch_id);
          setAvailableUploadBatches(batches);
          // Auto-select the first batch if none is currently selected
          if (!selectedUploadBatch && batches.length > 0) {
            console.log('Auto-selecting upload batch:', batches[0]);
            setSelectedUploadBatch(batches[0]);
          }
        } else {
          console.log('No upload batches found');
          setAvailableUploadBatches([]);
          // Fallback: set known upload batch
          const fallbackBatch = 'c2f9b2df-7b5e-47aa-a6e2-cb4852c488d7';
          setAvailableUploadBatches([fallbackBatch]);
          setSelectedUploadBatch(fallbackBatch);
        }
      },
      onError: (error) => { 
        console.error('Error fetching upload batches:', error); 
        // Fallback: set known upload batch
        const fallbackBatch = 'c2f9b2df-7b5e-47aa-a6e2-cb4852c488d7';
        setAvailableUploadBatches([fallbackBatch]);
        setSelectedUploadBatch(fallbackBatch);
      }
    }
  );

  // Mutations
  const processMutation = useMutation(
    (uploadBatchId) => api.post('/t03/process', { uploadBatchId }),
    {
      onSuccess: (data) => {
        setMessage({ type: 'success', text: data.message || 'T03 data processed successfully!' });
        // Invalidate all related queries and force immediate refetch
        queryClient.invalidateQueries(['t03Data']);
        queryClient.invalidateQueries('t03Stats');
        queryClient.refetchQueries(['t03Data', selectedUploadBatch, currentPage, recordsPerPage]);
        refetchData(); // Force immediate refetch
      },
      onError: (error) => {
        setMessage({ 
          type: 'error', 
          text: error.response?.data?.error || 'Failed to process T03 data' 
        });
      }
    }
  );

  const recalculateMutation = useMutation(
    () => api.post('/t03/recalculate'),
    {
      onSuccess: (data) => {
        setMessage({ type: 'success', text: 'T03 data recalculated successfully!' });
        // Invalidate all related queries and force immediate refetch
        queryClient.invalidateQueries(['t03Data']);
        queryClient.invalidateQueries('t03Stats');
        queryClient.refetchQueries(['t03Data', selectedUploadBatch, currentPage, recordsPerPage]);
        refetchData(); // Force immediate refetch
      },
      onError: (error) => {
        setMessage({ 
          type: 'error', 
          text: error.response?.data?.error || 'Failed to recalculate T03 data' 
        });
      }
    }
  );

  const formatNumber = (num) => {
    if (num === null || num === undefined) return '0';
    return parseFloat(num).toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  };

  // Function to generate Excel formula for each row
  const getExcelFormula = (columnType, rowIndex) => {
    // Calculate actual Excel row: current page offset + row index + 2 (for header)
    const actualRowIndex = (currentPage - 1) * recordsPerPage + rowIndex;
    const excelRow = actualRowIndex + 2;
    
    switch (columnType) {
      case 'wt':
        return `=I${excelRow}*H${excelRow}`; // Qty × FGWtPerUnit
      case 'custom_duty':
        return `=I${excelRow}*F${excelRow}`; // Qty × Custom Cost/Unit
      case 'poscheck':
        return `=@WB(I${excelRow},">=",0)`; // Qty >= 0
      case 'qty_lte_max':
        return `=@WB(I${excelRow},"<=",G${excelRow})`; // Qty <= MaxQty
      case 'row_cost':
        return `=I${excelRow}*E${excelRow}`; // Qty × CostPerUnit
      default:
        return '';
    }
  };

  const handleProcessT03 = () => {
    if (!selectedUploadBatch) {
      setMessage({
        type: 'error',
        text: 'Please select an upload batch first.'
      });
      return;
    }
    
    processMutation.mutate(selectedUploadBatch);
  };

  const handleRecalculate = () => {
    recalculateMutation.mutate();
  };

  const handleRefresh = () => {
    // Clear all cache and force fresh data fetch
    queryClient.invalidateQueries(['t03Data']);
    queryClient.invalidateQueries('t03Stats');
    refetchData();
    setMessage({ type: 'success', text: 'Data refreshed!' });
  };

  const handleUploadBatchChange = (batchId) => {
    setSelectedUploadBatch(batchId);
    setCurrentPage(1); // Reset to first page when changing batch
  };

  const handlePageChange = (newPage) => {
    setCurrentPage(newPage);
  };

  const handleRecordsPerPageChange = (newLimit) => {
    setRecordsPerPage(newLimit);
    setCurrentPage(1); // Reset to first page when changing limit
  };

  const formatBoolean = (value) => {
    return value ? '✓' : '✗';
  };



  // Function to download Excel
  const handleDownloadExcel = async () => {
    try {
      console.log('📊 Starting Excel download...');
      
      const response = await api.get('/t03/export', {
        params: {
          uploadBatchId: selectedUploadBatch
        },
        responseType: 'blob'
      });

      console.log('📊 Excel file received, creating download...');
      
      // Create blob URL - response is already the data due to interceptor
      const blob = new Blob([response], { 
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
      });
      const url = window.URL.createObjectURL(blob);
      
      // Create download link
      const link = document.createElement('a');
      link.href = url;
      link.download = `T03_Export_${new Date().toISOString().split('T')[0]}.xlsx`;
      
      // Trigger download
      document.body.appendChild(link);
      link.click();
      
      // Cleanup
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      console.log('✅ Excel download completed');
      
    } catch (error) {
      console.error('❌ Error downloading T03 data:', error);
      alert('Error downloading data. Please try again.');
    }
  };

  // Function to download CSV
  const handleDownloadCSV = async () => {
    try {
      console.log('📊 Starting CSV download...');
      
      const response = await api.get('/t03/export-csv', {
        params: {
          uploadBatchId: selectedUploadBatch
        },
        responseType: 'blob'
      });

      console.log('📊 CSV file received, creating download...');
      
      // Create blob URL - response is already the data due to interceptor
      const blob = new Blob([response], { 
        type: 'text/csv' 
      });
      const url = window.URL.createObjectURL(blob);
      
      // Create download link
      const link = document.createElement('a');
      link.href = url;
      link.download = `T03_Export_${new Date().toISOString().split('T')[0]}.csv`;
      
      // Trigger download
      document.body.appendChild(link);
      link.click();
      
      // Cleanup
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      console.log('✅ CSV download completed');
      
    } catch (error) {
      console.error('❌ Error downloading T03 CSV:', error);
      alert('Error downloading CSV. Please try again.');
    }
  };

  return (
    <Container>
      <Header>
        <Title>T03 - Primary Distribution</Title>
        <div style={{ display: 'flex', gap: '10px' }}>
          <Button onClick={handleRecalculate} disabled={recalculateMutation.isLoading || !selectedUploadBatch}>
            <RefreshCw size={16} /> {recalculateMutation.isLoading ? 'Recalculating...' : 'Recalculate'}
          </Button>
          <Button variant="success" onClick={handleProcessT03} disabled={processMutation.isLoading || !selectedUploadBatch}>
            <Plus size={16} /> {processMutation.isLoading ? 'Processing...' : 'Process T03'}
          </Button>
          <Button onClick={handleRefresh} disabled={dataLoading}>
            <RefreshCw size={16} /> {dataLoading ? 'Refreshing...' : 'Refresh Data'}
          </Button>
          <Button onClick={() => setShowFormulas(!showFormulas)} style={{ backgroundColor: showFormulas ? '#28a745' : '#6c757d' }}>
            {showFormulas ? '📊 Formulas' : '🔢 Values'}
          </Button>
          <ExportButton onClick={handleDownloadExcel} disabled={!selectedUploadBatch}>
            📊 Download Excel
          </ExportButton>
          <ExportButton onClick={handleDownloadCSV} disabled={!selectedUploadBatch}>
            📊 Download CSV
          </ExportButton>
        </div>
      </Header>

      {message && (<Message type={message.type}>{message.text}</Message>)}

      {/* Statistics */}
      <StatsContainer>
        <StatCard><StatTitle>Total Records</StatTitle><StatValue>{statsLoading ? '...' : (stats?.data?.total_records || 0)}</StatValue></StatCard>
        <StatCard><StatTitle>Unique SKUs</StatTitle><StatValue>{statsLoading ? '...' : (stats?.data?.unique_skus || 0)}</StatValue></StatCard>
        <StatCard><StatTitle>Factories</StatTitle><StatValue>{statsLoading ? '...' : (stats?.data?.unique_factories || 0)}</StatValue></StatCard>
        <StatCard><StatTitle>Warehouses</StatTitle><StatValue>{statsLoading ? '...' : (stats?.data?.unique_warehouses || 0)}</StatValue></StatCard>
        <StatCard><StatTitle>Total Quantity</StatTitle><StatValue>{statsLoading ? '...' : formatNumber(stats?.data?.total_quantity || 0)}</StatValue></StatCard>
      </StatsContainer>

      {/* Control Panel */}
      <ControlPanel>
        <ControlRow>
          <Label>Upload Batch:</Label>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <Select value={selectedUploadBatch} onChange={(e) => handleUploadBatchChange(e.target.value)}>
              <option value="">Select Upload Batch</option>
              {availableUploadBatches.map(batchId => (<option key={batchId} value={batchId}>{batchId.substring(0, 8)}...</option>))}
            </Select>
            {availableUploadBatches.length === 0 && (
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                <span style={{ fontSize: '12px', color: '#666' }}>or enter manually:</span>
                <Input type="text" placeholder="Upload Batch ID" value={selectedUploadBatch} onChange={(e) => handleUploadBatchChange(e.target.value)} />
          </div>
            )}
          </div>
        </ControlRow>
        
        {/* Pagination Controls */}
        <ControlRow>
          <Label>Records per page:</Label>
          <Select 
            value={recordsPerPage} 
            onChange={(e) => handleRecordsPerPageChange(parseInt(e.target.value))}
            style={{ width: '100px' }}
          >
            <option value={50}>50</option>
            <option value={100}>100</option>
            <option value={500}>500</option>
            <option value={1000}>1000</option>
          </Select>
        </ControlRow>
      </ControlPanel>

      {/* Data Table */}
      {dataLoading ? (
        <LoadingSpinner>Loading T03 data...</LoadingSpinner>
      ) : (
        <>
          {showFormulas && (
            <div style={{ 
              backgroundColor: '#e7f3ff', 
              border: '1px solid #b3d9ff', 
              borderRadius: '4px', 
              padding: '10px', 
              marginBottom: '10px',
              fontSize: '14px',
              color: '#0066cc'
            }}>
              <strong>📊 Formula View Active:</strong> Showing Excel formulas for calculated columns. 
              Export to Excel to get working formulas.
              <br />
              <strong>Column References:</strong> WH(A), PLT(B), FGSKUCode(C), MthNum(D), CostPerUnit(E), Custom Cost/Unit(F), MaxQty(G), FGWtPerUnit(H), Qty(I)
            </div>
          )}
          <ExcelTableContainer>
            <ExcelTable>
              <thead>
                <tr>
                  <ExcelTh>WH</ExcelTh>
                  <ExcelTh>PLT</ExcelTh>
                  <ExcelTh>FGSKUCode</ExcelTh>
                  <ExcelTh>MthNum</ExcelTh>
                  <ExcelTh>CostPerUnit</ExcelTh>
                  <ExcelTh>Custom Cost/Unit</ExcelTh>
                  <ExcelTh>MaxQty</ExcelTh>
                  <ExcelTh>FGWtPerUnit</ExcelTh>
                  <ExcelTh>Qty</ExcelTh>
                  <ExcelTh>Wt</ExcelTh>
                  <ExcelTh>Custom Duty</ExcelTh>
                  <ExcelTh>Poscheck</ExcelTh>
                  <ExcelTh>Qty≤Max</ExcelTh>
                  <ExcelTh>RowCost</ExcelTh>
                </tr>
              </thead>
              <tbody>
                {t03Data?.data?.map((item, index) => (
                  <ExcelTr key={item.id}>
                    <ExcelTd>{item.wh}</ExcelTd>
                    <ExcelTd>{item.plt}</ExcelTd>
                    <ExcelTd>{item.fgsku_code}</ExcelTd>
                    <ExcelTd>{item.mth_num}</ExcelTd>
                    <ExcelTd>{formatNumber(item.cost_per_unit)}</ExcelTd>
                    <ExcelTd>{formatNumber(item.custom_cost_per_unit)}</ExcelTd>
                    <ExcelTd>{formatNumber(item.max_qty)}</ExcelTd>
                    <ExcelTd>{formatNumber(item.fg_wt_per_unit)}</ExcelTd>
                    <ExcelTd>
                          <span>{formatNumber(item.qty)}</span>
                    </ExcelTd>
                    <ExcelTd>{showFormulas ? getExcelFormula('wt', index) : formatNumber(item.wt)}</ExcelTd>
                    <ExcelTd>{showFormulas ? getExcelFormula('custom_duty', index) : formatNumber(item.custom_duty)}</ExcelTd>
                    <ExcelTd>{showFormulas ? getExcelFormula('poscheck', index) : (item.poscheck ? '✓' : '✗')}</ExcelTd>
                    <ExcelTd>{showFormulas ? getExcelFormula('qty_lte_max', index) : (item.qty_lte_max ? '✓' : '✗')}</ExcelTd>
                    <ExcelTd>{showFormulas ? getExcelFormula('row_cost', index) : formatNumber(item.row_cost)}</ExcelTd>
                  </ExcelTr>
                ))}
              </tbody>
            </ExcelTable>
            {(!t03Data?.data || t03Data.data.length === 0) && (
              <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>No T03 distribution data found</div>
            )}
          </ExcelTableContainer>
        </>
      )}
      
      {/* Pagination Info */}
      {t03Data?.pagination && (
        <div style={{ marginTop: '15px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px', color: '#666' }}>
          <div>
            Showing {t03Data.pagination.startRecord} to {t03Data.pagination.endRecord} of {t03Data.pagination.totalRecords} records
          </div>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <button 
              onClick={() => handlePageChange(currentPage - 1)} 
              disabled={!t03Data.pagination.hasPrevPage}
              style={{ 
                padding: '5px 10px', 
                border: '1px solid #ddd', 
                background: t03Data.pagination.hasPrevPage ? 'white' : '#f5f5f5',
                cursor: t03Data.pagination.hasPrevPage ? 'pointer' : 'not-allowed',
                borderRadius: '3px'
              }}
            >
              Previous
            </button>
            <span>Page {t03Data.pagination.currentPage} of {t03Data.pagination.totalPages}</span>
            <button 
              onClick={() => handlePageChange(currentPage + 1)} 
              disabled={!t03Data.pagination.hasNextPage}
              style={{ 
                padding: '5px 10px', 
                border: '1px solid #ddd', 
                background: t03Data.pagination.hasNextPage ? 'white' : '#f5f5f5',
                cursor: t03Data.pagination.hasNextPage ? 'pointer' : 'not-allowed',
                borderRadius: '3px'
              }}
            >
              Next
            </button>
      </div>
    </div>
      )}
    </Container>
  );
};

export default T03Data; 