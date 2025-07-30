import React, { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import styled from 'styled-components';
import { t01API, cursorAPI, downloadFile } from '../services/api';

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
  background: ${props => props.variant === 'danger' ? '#dc3545' : '#007bff'};
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 5px;
  cursor: pointer;
  font-size: 14px;
  transition: background 0.3s;

  &:hover {
    background: ${props => props.variant === 'danger' ? '#c82333' : '#0056b3'};
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

const Input = styled.input`
  padding: 8px 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
  min-width: 200px;
`;

const Select = styled.select`
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

const T01Data = () => {
  const [selectedUploadBatch, setSelectedUploadBatch] = useState('');
  const [availableUploadBatches, setAvailableUploadBatches] = useState([]);
  const [viewMode, setViewMode] = useState('excel'); // 'excel' or 'raw'
  const [message, setMessage] = useState(null);
  const queryClient = useQueryClient();

  // Get T01 statistics
  const { data: stats, isLoading: statsLoading } = useQuery(
    't01Stats',
    t01API.getT01Stats,
    {
      refetchInterval: 30000, // Refetch every 30 seconds
    }
  );

  // Get T01 data
  const { data: t01Data, isLoading: dataLoading, refetch: refetchData } = useQuery(
    ['t01Data', selectedUploadBatch],
    () => t01API.getT01Data({ uploadBatchId: selectedUploadBatch }),
    {
      enabled: !!selectedUploadBatch,
      refetchInterval: 30000,
    }
  );

  // Get T01 data as array
  const { data: t01ArrayData, isLoading: arrayDataLoading } = useQuery(
    ['t01ArrayData', selectedUploadBatch],
    () => t01API.getT01DataAsArray(selectedUploadBatch),
    {
      enabled: !!selectedUploadBatch && viewMode === 'excel',
      refetchInterval: 30000,
    }
  );

  // Calculate T01 mutation
  const calculateMutation = useMutation(
    t01API.calculateT01Data,
    {
      onSuccess: (data) => {
        setMessage({
          type: 'success',
          text: `T01 calculation completed! Created ${data.data.recordsCreated} records.`
        });
        queryClient.invalidateQueries('t01Stats');
        if (selectedUploadBatch) {
          refetchData();
        }
      },
      onError: (error) => {
        setMessage({
          type: 'error',
          text: `Failed to calculate T01 data: ${error.error || error.message}`
        });
      }
    }
  );

  // Clear T01 data mutation
  const clearMutation = useMutation(
    t01API.clearAllT01Data,
    {
      onSuccess: () => {
        setMessage({
          type: 'success',
          text: 'All T01 data cleared successfully!'
        });
        queryClient.invalidateQueries('t01Stats');
        queryClient.invalidateQueries('t01Data');
        queryClient.invalidateQueries('t01ArrayData');
      },
      onError: (error) => {
        setMessage({
          type: 'error',
          text: `Failed to clear T01 data: ${error.error || error.message}`
        });
      }
    }
  );

  // Export T01 data mutation
  const exportMutation = useMutation(
    t01API.exportT01ToExcel,
    {
      onSuccess: (blob) => {
        const filename = `T_01_Export_${selectedUploadBatch}_${Date.now()}.xlsx`;
        downloadFile(blob, filename);
        setMessage({
          type: 'success',
          text: 'T01 data exported successfully!'
        });
      },
      onError: (error) => {
        setMessage({
          type: 'error',
          text: `Failed to export T01 data: ${error.error || error.message}`
        });
      }
    }
  );

  // Get available upload batches from cursor data
  const { data: uploadBatchesData } = useQuery(
    'uploadBatches',
    cursorAPI.getUploadBatches,
    {
      onSuccess: (data) => {
        if (data.success && data.data) {
          const batches = data.data.map(batch => batch.upload_batch_id);
          setAvailableUploadBatches(batches);
          
          // Set first batch as default if none selected
          if (!selectedUploadBatch && batches.length > 0) {
            setSelectedUploadBatch(batches[0]);
          }
        }
      },
      onError: (error) => {
        console.error('Error fetching upload batches:', error);
      }
    }
  );

  // Excel-like data transformation
  const excelData = useMemo(() => {
    if (!t01ArrayData?.data || !Array.isArray(t01ArrayData.data)) {
      return [];
    }
    return t01ArrayData.data;
  }, [t01ArrayData]);

  const handleCalculateT01 = () => {
    if (!selectedUploadBatch) {
      setMessage({
        type: 'error',
        text: 'Please select an upload batch first.'
      });
      return;
    }
    
    calculateMutation.mutate(selectedUploadBatch);
  };

  const handleClearT01 = () => {
    if (window.confirm('Are you sure you want to clear all T01 data? This action cannot be undone.')) {
      clearMutation.mutate();
    }
  };

  const handleExportT01 = () => {
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
    setMessage(null);
  };

  return (
    <Container>
      <Header>
        <Title>T01 Calculated Data</Title>
        <div style={{ display: 'flex', gap: '10px' }}>
          <Button
            onClick={handleCalculateT01}
            disabled={calculateMutation.isLoading || !selectedUploadBatch}
          >
            {calculateMutation.isLoading ? 'Calculating...' : 'Calculate T01'}
          </Button>
          <Button
            onClick={handleExportT01}
            disabled={exportMutation.isLoading || !selectedUploadBatch}
            style={{ background: '#28a745' }}
          >
            {exportMutation.isLoading ? 'Exporting...' : 'Export T_01 Sheet'}
          </Button>
          <Button
            variant="danger"
            onClick={handleClearT01}
            disabled={clearMutation.isLoading}
          >
            {clearMutation.isLoading ? 'Clearing...' : 'Clear All T01 Data'}
          </Button>
        </div>
      </Header>

      {message && (
        <Message type={message.type}>
          {message.text}
        </Message>
      )}

      {/* Statistics */}
      <StatsContainer>
        <StatCard>
          <StatTitle>Total T01 Records</StatTitle>
          <StatValue>{statsLoading ? '...' : (stats?.total_records || 0)}</StatValue>
        </StatCard>
        <StatCard>
          <StatTitle>Unique CTY Values</StatTitle>
          <StatValue>{statsLoading ? '...' : (stats?.unique_cty_values || 0)}</StatValue>
        </StatCard>
        <StatCard>
          <StatTitle>Unique FGSKU Codes</StatTitle>
          <StatValue>{statsLoading ? '...' : (stats?.unique_fgsku_codes || 0)}</StatValue>
        </StatCard>
        <StatCard>
          <StatTitle>Upload Batches</StatTitle>
          <StatValue>{statsLoading ? '...' : (stats?.total_upload_batches || 0)}</StatValue>
        </StatCard>
      </StatsContainer>

      {/* Control Panel */}
      <ControlPanel>
        <ControlRow>
          <Label>Upload Batch:</Label>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <Select
              value={selectedUploadBatch}
              onChange={(e) => handleUploadBatchChange(e.target.value)}
              style={{ minWidth: '200px' }}
            >
              <option value="">Select Upload Batch</option>
              {availableUploadBatches.map(batchId => (
                <option key={batchId} value={batchId}>
                  {batchId.substring(0, 8)}...
                </option>
              ))}
            </Select>
            {availableUploadBatches.length === 0 && (
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                <span style={{ fontSize: '12px', color: '#666' }}>or enter manually:</span>
                <input
                  type="text"
                  placeholder="Upload Batch ID"
                  value={selectedUploadBatch}
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
        </ControlRow>

        <ControlRow>
          <Label>View Mode:</Label>
          <div style={{ display: 'flex', gap: '10px' }}>
            <Button
              variant={viewMode === 'excel' ? 'primary' : 'secondary'}
              onClick={() => setViewMode('excel')}
              style={{ background: viewMode === 'excel' ? '#007bff' : '#6c757d' }}
            >
              Excel View
            </Button>
            <Button
              variant={viewMode === 'raw' ? 'primary' : 'secondary'}
              onClick={() => setViewMode('raw')}
              style={{ background: viewMode === 'raw' ? '#007bff' : '#6c757d' }}
            >
              Raw Data
            </Button>
          </div>
        </ControlRow>
      </ControlPanel>

      {/* Data Display */}
      {selectedUploadBatch && (
        <>
          {viewMode === 'excel' ? (
            <ExcelTableContainer>
              {arrayDataLoading ? (
                <LoadingSpinner>Loading Excel view...</LoadingSpinner>
              ) : excelData.length > 0 ? (
                <ExcelTable>
                  <thead>
                    <tr>
                      {t01ArrayData?.headers?.map((header, index) => (
                        <ExcelTh key={index}>{header}</ExcelTh>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {excelData.map((row, rowIndex) => (
                      <ExcelTr key={rowIndex}>
                        {row.map((cell, cellIndex) => (
                          <ExcelTd key={cellIndex}>{cell}</ExcelTd>
                        ))}
                      </ExcelTr>
                    ))}
                  </tbody>
                </ExcelTable>
              ) : (
                <div style={{ padding: '20px', textAlign: 'center', color: '#666' }}>
                  No T01 data found for this upload batch. Try calculating T01 data first.
                </div>
              )}
            </ExcelTableContainer>
          ) : (
            <div>
              {dataLoading ? (
                <LoadingSpinner>Loading raw data...</LoadingSpinner>
              ) : t01Data?.data?.length > 0 ? (
                <div style={{ background: 'white', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
                  <h3>Raw T01 Data ({t01Data.data.length} records)</h3>
                  <div style={{ maxHeight: '400px', overflow: 'auto' }}>
                    <pre style={{ fontSize: '12px', lineHeight: '1.4' }}>
                      {JSON.stringify(t01Data.data.slice(0, 10), null, 2)}
                      {t01Data.data.length > 10 && '\n... (showing first 10 records)'}
                    </pre>
                  </div>
                </div>
              ) : (
                <div style={{ padding: '20px', textAlign: 'center', color: '#666' }}>
                  No T01 data found for this upload batch. Try calculating T01 data first.
                </div>
              )}
            </div>
          )}
        </>
      )}

      {!selectedUploadBatch && (
        <div style={{ padding: '40px', textAlign: 'center', color: '#666' }}>
          Please select an upload batch to view T01 data.
          <br />
          <small style={{ marginTop: '10px', display: 'block' }}>
            Available upload batch: <code>c2f9b2df-7b5e-47aa-a6e2-cb4852c488d7</code>
          </small>
        </div>
      )}
    </Container>
  );
};

export default T01Data; 