import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import styled from 'styled-components';
import { t02API, cursorAPI, downloadFile } from '../services/api';

const Container = styled.div`
  padding: 20px;
  max-width: 1400px;
  margin: 0 auto;
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

const Controls = styled.div`
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
`;

const Button = styled.button`
  padding: 10px 20px;
  border: none;
  border-radius: 5px;
  cursor: pointer;
  font-weight: 500;
  transition: all 0.2s;

  &.primary {
    background-color: #007bff;
    color: white;
    &:hover {
      background-color: #0056b3;
    }
  }

  &.danger {
    background-color: #dc3545;
    color: white;
    &:hover {
      background-color: #c82333;
    }
  }

  &.success {
    background-color: #28a745;
    color: white;
    &:hover {
      background-color: #218838;
    }
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`;

const Select = styled.select`
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 5px;
  background-color: white;
  min-width: 200px;
`;

const Stats = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 15px;
  margin-bottom: 20px;
`;

const StatCard = styled.div`
  background: white;
  padding: 20px;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  text-align: center;
`;

const StatValue = styled.div`
  font-size: 24px;
  font-weight: bold;
  color: #007bff;
  margin-bottom: 5px;
`;

const StatLabel = styled.div`
  color: #666;
  font-size: 14px;
`;

const TableContainer = styled.div`
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  overflow: hidden;
  overflow-x: auto;
`;

const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
  min-width: 1200px;
`;

const Th = styled.th`
  background-color: #f8f9fa;
  padding: 12px;
  text-align: left;
  border-bottom: 1px solid #dee2e6;
  font-weight: 600;
  color: #495057;
  position: sticky;
  top: 0;
  z-index: 10;
  white-space: nowrap;
`;

const Td = styled.td`
  padding: 12px;
  border-bottom: 1px solid #dee2e6;
  color: #495057;
  white-space: nowrap;
`;

const Tr = styled.tr`
  &:hover {
    background-color: #f8f9fa;
  }
`;

const Loading = styled.div`
  text-align: center;
  padding: 40px;
  color: #666;
`;

const Error = styled.div`
  background-color: #f8d7da;
  color: #721c24;
  padding: 15px;
  border-radius: 5px;
  margin-bottom: 20px;
`;

const Success = styled.div`
  background-color: #d4edda;
  color: #155724;
  padding: 15px;
  border-radius: 5px;
  margin-bottom: 20px;
`;

const Pagination = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 10px;
  margin-top: 20px;
  padding: 20px;
`;

const PaginationButton = styled.button`
  padding: 8px 12px;
  border: 1px solid #ddd;
  background: white;
  cursor: pointer;
  border-radius: 4px;

  &:hover {
    background-color: #f8f9fa;
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const T02Data = () => {
  const [selectedUploadBatch, setSelectedUploadBatch] = useState(null);
  const [availableUploadBatches, setAvailableUploadBatches] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(100); // Reasonable page size for performance
  const [message, setMessage] = useState(null);
  const [isPageLoading, setIsPageLoading] = useState(false);
  const [loadTimeout, setLoadTimeout] = useState(null);
  const [initialLoad, setInitialLoad] = useState(true);

  const queryClient = useQueryClient();

  // Fetch upload batches
  const { data: uploadBatchesData, error: uploadBatchesError } = useQuery(
    'uploadBatches',
    cursorAPI.getUploadBatches,
    {
      onSuccess: (data) => {
        console.log('Upload batches API response:', data);
        if (data.success && data.data) {
          const batches = data.data.map(batch => batch.upload_batch_id);
          console.log('Available batches:', batches);
          setAvailableUploadBatches(batches);
          if (!selectedUploadBatch && batches.length > 0) {
            setSelectedUploadBatch(batches[0]);
          }
        } else {
          console.log('No upload batches found or invalid response format');
        }
      },
      onError: (error) => {
        console.error('Error fetching upload batches:', error);
        setMessage({
          type: 'error',
          text: `Failed to fetch upload batches: ${error.message}`
        });
      }
    }
  );

  // Fetch T02 stats
  const { data: statsData, refetch: refetchStats } = useQuery(
    't02Stats',
    t02API.getT02Stats,
    {
      enabled: !!selectedUploadBatch
    }
  );

  // Fetch T02 data
  const { data: t02Data, isLoading, error, refetch: refetchT02Data } = useQuery(
    ['t02Data', selectedUploadBatch, currentPage, pageSize],
    () => {
      console.log('Fetching T02 data with pagination:', {
        uploadBatchId: selectedUploadBatch,
        page: currentPage,
        limit: pageSize
      });
      return t02API.getT02Data({
        uploadBatchId: selectedUploadBatch,
        page: currentPage,
        limit: pageSize,
        _t: Date.now() // Cache busting parameter
      });
    },
    {
      enabled: !!selectedUploadBatch,
      onSuccess: (data) => {
        console.log('T02 data loaded successfully:', data?.count, 'records');
        setIsPageLoading(false);
        setInitialLoad(false);
        if (loadTimeout) {
          clearTimeout(loadTimeout);
          setLoadTimeout(null);
        }
      },
      onError: (error) => {
        console.error('Error fetching T02 data:', error);
        setIsPageLoading(false);
        setInitialLoad(false);
        if (loadTimeout) {
          clearTimeout(loadTimeout);
          setLoadTimeout(null);
        }
        
        // Show specific error message for rate limiting
        if (error.response?.data?.includes('Too many requests')) {
          setMessage({
            type: 'error',
            text: 'Rate limit exceeded. Please wait a moment before navigating to another page.'
          });
        }
      },
      refetchOnWindowFocus: false,
      staleTime: 0, // Always fetch fresh data
      retry: 2, // Retry failed requests up to 2 times
      retryDelay: 1000 // Wait 1 second between retries
    }
  );

  // Calculate T02 data mutation
  const calculateMutation = useMutation(
    t02API.calculateT02Data,
    {
      onSuccess: (data) => {
        if (data.success) {
          setMessage({
            type: 'success',
            text: `T02 calculation completed successfully! Created ${data.recordCount} records.`
          });
          queryClient.invalidateQueries('t02Stats');
          queryClient.invalidateQueries('t02Data');
        }
      },
      onError: (error) => {
        setMessage({
          type: 'error',
          text: `Failed to calculate T02 data: ${error.response?.data?.details || error.message}`
        });
      }
    }
  );

  // Clear T02 data mutation
  const clearMutation = useMutation(
    t02API.clearT02Data,
    {
      onSuccess: (data) => {
        if (data.success) {
          setMessage({
            type: 'success',
            text: 'T02 data cleared successfully!'
          });
          queryClient.invalidateQueries('t02Stats');
          queryClient.invalidateQueries('t02Data');
        }
      },
      onError: (error) => {
        setMessage({
          type: 'error',
          text: `Failed to clear T02 data: ${error.response?.data?.details || error.message}`
        });
      }
    }
  );

  // Export T02 data to Excel mutation
  const exportMutation = useMutation(
    t02API.exportT02ToExcel,
    {
      onSuccess: (blob) => {
        const filename = `T02_Data_${selectedUploadBatch}_${Date.now()}.xlsx`;
        downloadFile(blob, filename);
        setMessage({
          type: 'success',
          text: 'T02 data exported to Excel successfully!'
        });
      },
      onError: (error) => {
        setMessage({
          type: 'error',
          text: `Failed to export T02 data: ${error.response?.data?.details || error.message}`
        });
      }
    }
  );

  const handleCalculate = () => {
    if (!selectedUploadBatch) {
      setMessage({
        type: 'error',
        text: 'Please select an upload batch first.'
      });
      return;
    }
    calculateMutation.mutate(selectedUploadBatch);
  };

  const handleClear = () => {
    if (window.confirm('Are you sure you want to clear all T02 data? This action cannot be undone.')) {
      clearMutation.mutate();
    }
  };

  const handleExport = () => {
    if (!selectedUploadBatch) {
      setMessage({
        type: 'error',
        text: 'Please select an upload batch first.'
      });
      return;
    }
    exportMutation.mutate(selectedUploadBatch);
  };

  const handleUploadBatchChange = (batchId) => {
    setSelectedUploadBatch(batchId);
    setCurrentPage(1); // Reset to first page when changing batch
    setIsPageLoading(false);
  };

  const handlePageChange = (newPage) => {
    setIsPageLoading(true);
    setCurrentPage(newPage);
  };

  const clearMessage = () => {
    setMessage(null);
  };

  useEffect(() => {
    if (message) {
      const timer = setTimeout(clearMessage, 5000);
      return () => clearTimeout(timer);
    }
  }, [message]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (loadTimeout) {
        clearTimeout(loadTimeout);
      }
    };
  }, [loadTimeout]);

  return (
    <Container>
      <Header>
        <Title>T_02 Data Management</Title>
        <Controls>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <Select
              value={selectedUploadBatch || ''}
              onChange={(e) => handleUploadBatchChange(e.target.value)}
              style={{ minWidth: '200px' }}
            >
              <option value="">Select Upload Batch</option>
              {availableUploadBatches.map(batch => (
                <option key={batch} value={batch}>
                  {batch.substring(0, 8)}...
                </option>
              ))}
            </Select>
            {availableUploadBatches.length === 0 && (
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                <span style={{ fontSize: '12px', color: '#666' }}>or enter manually:</span>
                <input
                  type="text"
                  placeholder="Upload Batch ID"
                  value={selectedUploadBatch || ''}
                  onChange={(e) => handleUploadBatchChange(e.target.value)}
                  style={{ 
                    padding: '8px 12px', 
                    border: '1px solid #ddd', 
                    borderRadius: '4px',
                    fontSize: '12px',
                    width: '200px'
                  }}
                />
              </div>
            )}
          </div>
          <Button
            className="primary"
            onClick={handleCalculate}
            disabled={!selectedUploadBatch || calculateMutation.isLoading}
          >
            {calculateMutation.isLoading ? 'Calculating...' : 'Calculate T_02'}
          </Button>
          <Button
            className="success"
            onClick={handleExport}
            disabled={!selectedUploadBatch || exportMutation.isLoading}
          >
            {exportMutation.isLoading ? 'Exporting...' : 'Export to Excel'}
          </Button>
          <Button
            className="danger"
            onClick={handleClear}
            disabled={clearMutation.isLoading}
          >
            {clearMutation.isLoading ? 'Clearing...' : 'Clear All T_02 Data'}
          </Button>
        </Controls>
      </Header>

      {message && (
        <div style={{ marginBottom: '20px' }}>
          {message.type === 'error' ? (
            <Error>{message.text}</Error>
          ) : (
            <Success>{message.text}</Success>
          )}
        </div>
      )}

      {/* Debug information */}
      {uploadBatchesError && (
        <div style={{ 
          background: '#fff3cd', 
          border: '1px solid #ffeaa7', 
          padding: '10px', 
          borderRadius: '5px', 
          marginBottom: '20px',
          fontSize: '12px'
        }}>
          <strong>Debug Info:</strong> Upload batches error: {uploadBatchesError.message}
        </div>
      )}
      
      {uploadBatchesData && (
        <div style={{ 
          background: '#d1ecf1', 
          border: '1px solid #bee5eb', 
          padding: '10px', 
          borderRadius: '5px', 
          marginBottom: '20px',
          fontSize: '12px'
        }}>
          <strong>Debug Info:</strong> Upload batches response: {JSON.stringify(uploadBatchesData)}
        </div>
      )}

      {statsData?.success && (
        <>
          <Stats>
            <StatCard>
              <StatValue>{statsData.stats.total_records}</StatValue>
              <StatLabel>Total Records</StatLabel>
            </StatCard>
            <StatCard>
              <StatValue>{statsData.stats.unique_cty_values}</StatValue>
              <StatLabel>Unique CTY Values</StatLabel>
            </StatCard>
            <StatCard>
              <StatValue>{statsData.stats.unique_fgsku_codes}</StatValue>
              <StatLabel>Unique FGSKU Codes</StatLabel>
            </StatCard>
            <StatCard>
              <StatValue>{statsData.stats.total_upload_batches}</StatValue>
              <StatLabel>Upload Batches</StatLabel>
            </StatCard>
          </Stats>
          <div style={{ 
            background: '#e3f2fd', 
            padding: '10px', 
            borderRadius: '5px', 
            marginBottom: '20px',
            fontSize: '14px',
            color: '#1976d2'
          }}>
            📊 <strong>Performance Note:</strong> Showing 10 records per page for optimal performance. 
            Use pagination controls below to navigate through all {statsData.stats.total_records.toLocaleString()} records.
          </div>
        </>
      )}

      {error && (
        <Error>
          Error loading T02 data: {error.response?.data?.details || error.message}
        </Error>
      )}

      {initialLoad ? (
        <Loading>
          Initializing T02 Data Management...
          <br />
          <small>Loading with optimized pagination (10 records per page)</small>
        </Loading>
      ) : isLoading || isPageLoading ? (
        <Loading>
                        Loading T02 data... (Page {currentPage})
          <br />
          <small>Please wait, this may take a moment...</small>
        </Loading>
      ) : t02Data?.success && t02Data.data && t02Data.data.length > 0 ? (
        <>
          <TableContainer>
            <Table>
              <thead>
                <tr>
                  <Th>CTY</Th>
                  <Th>WH</Th>
                  <Th>Default WH Restrictions</Th>
                  <Th>SKU specific Restrictions</Th>
                  <Th>FGSKUCode</Th>
                  <Th>TrimSKU</Th>
                  <Th>RMSKU</Th>
                  <Th>MthNum</Th>
                  <Th>Market</Th>
                  <Th>Customs?</Th>
                  <Th>TransportCostPerCase</Th>
                  <Th>Max_GFC</Th>
                  <Th>Max_KFC</Th>
                  <Th>Max_NFC</Th>
                  <Th>FGWtPerUnit</Th>
                  <Th>Custom Cost/Unit - GFC</Th>
                  <Th>Custom Cost/Unit - KFC</Th>
                  <Th>Custom Cost/Unit - NFC</Th>
                  <Th>Max_Arbit</Th>
                  <Th>D10</Th>
                  <Th>Qty_GFC</Th>
                  <Th>Qty_KFC</Th>
                  <Th>Qty_NFC</Th>
                  <Th>Qty_X</Th>
                  <Th>V05</Th>
                  <Th>V06</Th>
                  <Th>Qty_Total</Th>
                  <Th>Wt_GFC</Th>
                  <Th>Wt_KFC</Th>
                  <Th>Wt_NFC</Th>
                  <Th>Custom Duty</Th>
                  <Th>F06</Th>
                  <Th>F07</Th>
                  <Th>F08</Th>
                  <Th>F09</Th>
                  <Th>F10</Th>
                  <Th>Max_GFC</Th>
                  <Th>Max_KFC</Th>
                  <Th>Max_NFC</Th>
                  <Th>Pos_GFC</Th>
                  <Th>Pos_KFC</Th>
                  <Th>Pos_NFC</Th>
                  <Th>Pos_X</Th>
                  <Th>Max_X</Th>
                  <Th>C09</Th>
                  <Th>C10</Th>
                  <Th>OF01</Th>
                  <Th>OF02</Th>
                  <Th>OF03</Th>
                  <Th>OF04</Th>
                  <Th>OF05</Th>
                  <Th>RowCost</Th>
                </tr>
              </thead>
              <tbody>
                {t02Data.data.map((record) => (
                  <Tr key={record.id}>
                    <Td>{record.cty}</Td>
                    <Td>{record.wh}</Td>
                    <Td>{record.default_wh_restrictions}</Td>
                    <Td>{record.sku_specific_restrictions}</Td>
                    <Td>{record.fgsku_code}</Td>
                    <Td>{record.trim_sku}</Td>
                    <Td>{record.rm_sku}</Td>
                    <Td>{record.month}</Td>
                    <Td>{record.market}</Td>
                    <Td>{record.customs}</Td>
                    <Td>{record.transport_cost_per_case}</Td>
                    <Td>{record.max_gfc}</Td>
                    <Td>{record.max_kfc}</Td>
                    <Td>{record.max_nfc}</Td>
                    <Td>{record.fgwt_per_unit}</Td>
                    <Td>{record.custom_cost_per_unit_gfc}</Td>
                    <Td>{record.custom_cost_per_unit_kfc}</Td>
                    <Td>{record.custom_cost_per_unit_nfc}</Td>
                    <Td>{record.max_arbit}</Td>
                    <Td>{record.d10}</Td>
                    <Td>{record.qty_gfc}</Td>
                    <Td>{record.qty_kfc}</Td>
                    <Td>{record.qty_nfc}</Td>
                    <Td>{record.qty_x}</Td>
                    <Td>{record.v05}</Td>
                    <Td>{record.v06}</Td>
                    <Td>{record.qty_total}</Td>
                    <Td>{record.wt_gfc}</Td>
                    <Td>{record.wt_kfc}</Td>
                    <Td>{record.wt_nfc}</Td>
                    <Td>{record.custom_duty}</Td>
                    <Td>{record.f06}</Td>
                    <Td>{record.f07}</Td>
                    <Td>{record.f08}</Td>
                    <Td>{record.f09}</Td>
                    <Td>{record.f10}</Td>
                    <Td>{record.max_gfc_2}</Td>
                    <Td>{record.max_kfc_2}</Td>
                    <Td>{record.max_nfc_2}</Td>
                    <Td>{record.pos_gfc}</Td>
                    <Td>{record.pos_kfc}</Td>
                    <Td>{record.pos_nfc}</Td>
                    <Td>{record.pos_x}</Td>
                    <Td>{record.max_x}</Td>
                    <Td>{record.c09}</Td>
                    <Td>{record.c10}</Td>
                    <Td>{record.of01}</Td>
                    <Td>{record.of02}</Td>
                    <Td>{record.of03}</Td>
                    <Td>{record.of04}</Td>
                    <Td>{record.of05}</Td>
                    <Td>{record.row_cost}</Td>
                  </Tr>
                ))}
              </tbody>
            </Table>
          </TableContainer>

          <Pagination>
            <PaginationButton
              onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1 || isPageLoading}
            >
              {isPageLoading ? 'Loading...' : 'Previous'}
            </PaginationButton>
            <span>
              Page {currentPage} of {t02Data.totalPages || 1}
              (Showing {t02Data.count} of {t02Data.totalCount || 0} records)
            </span>
            <PaginationButton
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage >= (t02Data.totalPages || 1) || isPageLoading}
            >
              {isPageLoading ? 'Loading...' : 'Next'}
            </PaginationButton>
          </Pagination>
        </>
      ) : error ? (
        <div style={{ textAlign: 'center', padding: '40px' }}>
          <Error>
            Error loading T02 data: {error.response?.data?.details || error.message}
            <br />
            <small>Please try refreshing the page or wait a moment before trying again.</small>
          </Error>
          <div style={{ marginTop: '20px' }}>
            <Button 
              className="primary" 
              onClick={() => refetchT02Data()}
              style={{ marginRight: '10px' }}
            >
              Retry
            </Button>
            <Button 
              onClick={() => window.location.reload()}
            >
              Go to First Page
            </Button>
          </div>
        </div>
      ) : (
        <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
          {selectedUploadBatch ? 'No T02 data found for the selected upload batch.' : 'Please select an upload batch to view T02 data.'}
          <br />
          <small style={{ marginTop: '10px', display: 'block' }}>
            Available upload batch: <code>c2f9b2df-7b5e-47aa-a6e2-cb4852c488d7</code>
          </small>
        </div>
      )}
    </Container>
  );
};

export default T02Data; 