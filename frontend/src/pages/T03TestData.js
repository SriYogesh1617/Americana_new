import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import styled from 'styled-components';
import { Download, RefreshCw, Plus } from 'lucide-react';
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

const ExportButton = styled(Button)`
  background: #17a2b8;
  &:hover {
    background: #138496;
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

const TableContainer = styled.div`
  background: white;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  margin-bottom: 20px;
`;

const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
  font-size: 14px;
`;

const Th = styled.th`
  background: #f8f9fa;
  border: 1px solid #ddd;
  padding: 12px 8px;
  text-align: left;
  font-weight: 600;
  position: sticky;
  top: 0;
  z-index: 1;
  cursor: pointer;
  user-select: none;
  
  &:hover {
    background: #e9ecef;
  }
`;

const Td = styled.td`
  border: 1px solid #ddd;
  padding: 8px;
  text-align: ${props => props.numeric ? 'right' : 'left'};
  font-family: ${props => props.numeric ? 'Monaco, Consolas, monospace' : 'inherit'};
`;

const Tr = styled.tr`
  &:nth-child(even) {
    background: #f8f9fa;
  }
  
  &:hover {
    background: #e3f2fd;
  }
`;

const PaginationContainer = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 20px;
  padding: 15px;
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
`;

const PaginationButton = styled.button`
  background: ${props => props.disabled ? '#6c757d' : '#007bff'};
  color: white;
  border: none;
  padding: 8px 12px;
  border-radius: 4px;
  cursor: ${props => props.disabled ? 'not-allowed' : 'pointer'};
  margin: 0 5px;
`;

const Select = styled.select`
  padding: 8px 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
`;

const Message = styled.div`
  padding: 12px 16px;
  border-radius: 6px;
  margin-bottom: 20px;
  background: ${props => props.type === 'error' ? '#f8d7da' : '#d1edff'};
  color: ${props => props.type === 'error' ? '#721c24' : '#0c5460'};
  border: 1px solid ${props => props.type === 'error' ? '#f5c6cb' : '#bee5eb'};
`;

const ValidationCard = styled.div`
  background: white;
  padding: 20px;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  margin-bottom: 20px;
  border-left: 4px solid #17a2b8;
`;

const ValidationTitle = styled.h3`
  margin-top: 0;
  color: #333;
`;

const ValidationRow = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
  margin: 10px 0;
`;

const ValidationLabel = styled.span`
  font-weight: 500;
  color: #666;
`;

const ValidationValue = styled.span`
  font-family: Monaco, Consolas, monospace;
  color: #333;
`;

function T03TestData() {
  const [currentPage, setCurrentPage] = useState(1);
  const [recordsPerPage, setRecordsPerPage] = useState(100);
  const [sortBy, setSortBy] = useState('id');
  const [sortOrder, setSortOrder] = useState('asc');
  const [message, setMessage] = useState(null);

  const queryClient = useQueryClient();

  // Fetch T03 Test data
  const { data: tableData, isLoading: dataLoading, refetch: refetchData } = useQuery(
    ['t03TestData', currentPage, recordsPerPage, sortBy, sortOrder],
    async () => {
      const response = await api.get('/t03-test/', {
        params: {
          page: currentPage,
          limit: recordsPerPage,
          sort_by: sortBy,
          sort_order: sortOrder
        }
      });
      return response.data;
    },
    {
      keepPreviousData: true,
      staleTime: 30000
    }
  );

  // Fetch summary statistics
  const { data: stats, isLoading: statsLoading } = useQuery(
    't03TestStats',
    async () => {
      const response = await api.get('/t03-test/summary');
      return response.data;
    },
    {
      refetchInterval: 30000
    }
  );

  // Fetch validation report
  const { data: validation, isLoading: validationLoading } = useQuery(
    't03TestValidation',
    async () => {
      const response = await api.get('/t03-test/validation');
      return response.data;
    },
    {
      refetchInterval: 30000
    }
  );

  // Generate data mutation
  const generateMutation = useMutation(
    async () => {
      const response = await api.post('/t03-test/generate');
      return response.data;
    },
    {
      onSuccess: (data) => {
        setMessage({ type: 'success', text: `Successfully generated T03 Test data! ${JSON.stringify(data.data)}` });
        queryClient.invalidateQueries(['t03TestData']);
        queryClient.invalidateQueries('t03TestStats');
        queryClient.invalidateQueries('t03TestValidation');
      },
      onError: (error) => {
        setMessage({ type: 'error', text: `Error generating data: ${error.response?.data?.details || error.message}` });
      }
    }
  );

  // Clear data mutation
  const clearMutation = useMutation(
    async () => {
      const response = await api.delete('/t03-test/');
      return response.data;
    },
    {
      onSuccess: (data) => {
        setMessage({ type: 'success', text: data.message });
        queryClient.invalidateQueries(['t03TestData']);
        queryClient.invalidateQueries('t03TestStats');
        queryClient.invalidateQueries('t03TestValidation');
      },
      onError: (error) => {
        setMessage({ type: 'error', text: `Error clearing data: ${error.response?.data?.details || error.message}` });
      }
    }
  );

  const handleSort = (column) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortOrder('asc');
    }
    setCurrentPage(1);
  };

  const handleGenerate = () => {
    if (window.confirm('This will regenerate all T03 Test data. Continue?')) {
      generateMutation.mutate();
    }
  };

  const handleClear = () => {
    if (window.confirm('This will delete all T03 Test data. Continue?')) {
      clearMutation.mutate();
    }
  };

  const handleRefresh = () => {
    queryClient.invalidateQueries(['t03TestData']);
    queryClient.invalidateQueries('t03TestStats');
    queryClient.invalidateQueries('t03TestValidation');
    setMessage({ type: 'success', text: 'Data refreshed!' });
  };

  const handlePageChange = (newPage) => {
    setCurrentPage(newPage);
  };

  const handleRecordsPerPageChange = (newLimit) => {
    setRecordsPerPage(newLimit);
    setCurrentPage(1);
  };

  const formatNumber = (value) => {
    if (value === null || value === undefined) return '0';
    return new Intl.NumberFormat().format(value);
  };

  // Function to download Excel
  const handleDownloadExcel = async () => {
    try {
      console.log('📊 Starting Excel download...');
      
      const response = await api.get('/t03-test/export', {
        responseType: 'blob'
      });

      console.log('📊 Excel file received, creating download...');
      
      const blob = new Blob([response], { 
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
      });
      const url = window.URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = `T03_Test_Export_${new Date().toISOString().split('T')[0]}.xlsx`;
      
      document.body.appendChild(link);
      link.click();
      
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      console.log('✅ Excel download completed');
      setMessage({ type: 'success', text: 'Excel file downloaded successfully!' });
      
    } catch (error) {
      console.error('❌ Error downloading T03 Test data:', error);
      setMessage({ type: 'error', text: `Error downloading Excel: ${error.message}` });
    }
  };

  // Function to download CSV
  const handleDownloadCSV = async () => {
    try {
      console.log('📊 Starting CSV download...');
      
      const response = await api.get('/t03-test/export-csv', {
        responseType: 'blob'
      });

      console.log('📊 CSV file received, creating download...');
      
      const blob = new Blob([response], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = `T03_Test_Export_${new Date().toISOString().split('T')[0]}.csv`;
      
      document.body.appendChild(link);
      link.click();
      
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      console.log('✅ CSV download completed');
      setMessage({ type: 'success', text: 'CSV file downloaded successfully!' });
      
    } catch (error) {
      console.error('❌ Error downloading T03 Test CSV:', error);
      setMessage({ type: 'error', text: `Error downloading CSV: ${error.message}` });
    }
  };

  return (
    <Container>
      <Header>
        <Title>T03 Test Data (SQL Generated)</Title>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <Button variant="success" onClick={handleGenerate} disabled={generateMutation.isLoading}>
            <Plus size={16} /> {generateMutation.isLoading ? 'Generating...' : 'Generate Data'}
          </Button>
          <Button onClick={handleRefresh} disabled={dataLoading}>
            <RefreshCw size={16} /> {dataLoading ? 'Refreshing...' : 'Refresh Data'}
          </Button>
          <Button variant="danger" onClick={handleClear} disabled={clearMutation.isLoading}>
            🗑️ {clearMutation.isLoading ? 'Clearing...' : 'Clear Data'}
          </Button>
          <ExportButton onClick={handleDownloadExcel} disabled={!stats?.data?.total_records}>
            📊 Download Excel
          </ExportButton>
          <ExportButton onClick={handleDownloadCSV} disabled={!stats?.data?.total_records}>
            📊 Download CSV
          </ExportButton>
        </div>
      </Header>

      {message && (<Message type={message.type}>{message.text}</Message>)}

      {/* Statistics */}
      <StatsContainer>
        <StatCard><StatTitle>Total Records</StatTitle><StatValue>{statsLoading ? '...' : formatNumber(stats?.data?.total_records || 0)}</StatValue></StatCard>
        <StatCard><StatTitle>Unique SKUs</StatTitle><StatValue>{statsLoading ? '...' : formatNumber(stats?.data?.unique_skus || 0)}</StatValue></StatCard>
        <StatCard><StatTitle>Warehouses</StatTitle><StatValue>{statsLoading ? '...' : formatNumber(stats?.data?.unique_warehouses || 0)}</StatValue></StatCard>
        <StatCard><StatTitle>Plants</StatTitle><StatValue>{statsLoading ? '...' : formatNumber(stats?.data?.unique_plants || 0)}</StatValue></StatCard>
        <StatCard><StatTitle>Countries</StatTitle><StatValue>{statsLoading ? '...' : formatNumber(stats?.data?.unique_countries || 0)}</StatValue></StatCard>
        <StatCard><StatTitle>Rows with Cost > 0</StatTitle><StatValue>{statsLoading ? '...' : formatNumber(stats?.data?.rows_with_positive_cost || 0)}</StatValue></StatCard>
      </StatsContainer>

      {/* Validation Report */}
      {validation?.data && (
        <ValidationCard>
          <ValidationTitle>Data Validation Report</ValidationTitle>
          <ValidationRow>
            <ValidationLabel>Expected Records:</ValidationLabel>
            <ValidationValue>{formatNumber(validation.data.expected_rows)}</ValidationValue>
          </ValidationRow>
          <ValidationRow>
            <ValidationLabel>Actual Records:</ValidationLabel>
            <ValidationValue>{formatNumber(validation.data.actual_rows)}</ValidationValue>
          </ValidationRow>
          <ValidationRow>
            <ValidationLabel>Distinct SKUs:</ValidationLabel>
            <ValidationValue>{formatNumber(validation.data.distinct_skus)}</ValidationValue>
          </ValidationRow>
          <ValidationRow>
            <ValidationLabel>Distinct Warehouses:</ValidationLabel>
            <ValidationValue>{formatNumber(validation.data.distinct_warehouses)}</ValidationValue>
          </ValidationRow>
          <ValidationRow>
            <ValidationLabel>Distinct Plants:</ValidationLabel>
            <ValidationValue>{formatNumber(validation.data.distinct_plants)}</ValidationValue>
          </ValidationRow>
        </ValidationCard>
      )}

      {/* Data Table */}
      <TableContainer>
        <Table>
          <thead>
            <tr>
              <Th onClick={() => handleSort('id')}>ID {sortBy === 'id' && (sortOrder === 'asc' ? '↑' : '↓')}</Th>
              <Th onClick={() => handleSort('WH')}>WH {sortBy === 'WH' && (sortOrder === 'asc' ? '↑' : '↓')}</Th>
              <Th onClick={() => handleSort('PLT')}>PLT {sortBy === 'PLT' && (sortOrder === 'asc' ? '↑' : '↓')}</Th>
              <Th onClick={() => handleSort('FGSKUCode')}>FGSKU Code {sortBy === 'FGSKUCode' && (sortOrder === 'asc' ? '↑' : '↓')}</Th>
              <Th onClick={() => handleSort('mth_number')}>Month {sortBy === 'mth_number' && (sortOrder === 'asc' ? '↑' : '↓')}</Th>
              <Th onClick={() => handleSort('country')}>Country {sortBy === 'country' && (sortOrder === 'asc' ? '↑' : '↓')}</Th>
              <Th onClick={() => handleSort('cost_per_unit')}>Cost Per Unit {sortBy === 'cost_per_unit' && (sortOrder === 'asc' ? '↑' : '↓')}</Th>
              <Th onClick={() => handleSort('factcountry')}>Factory Country {sortBy === 'factcountry' && (sortOrder === 'asc' ? '↑' : '↓')}</Th>
            </tr>
          </thead>
          <tbody>
            {dataLoading ? (
              <tr><td colSpan="8" style={{ textAlign: 'center', padding: '20px' }}>Loading...</td></tr>
            ) : tableData?.data?.length > 0 ? (
              tableData.data.map((record) => (
                <Tr key={record.id}>
                  <Td numeric>{record.id}</Td>
                  <Td>{record.WH || ''}</Td>
                  <Td>{record.PLT || ''}</Td>
                  <Td>{record.FGSKUCode || ''}</Td>
                  <Td numeric>{record.mth_number || ''}</Td>
                  <Td>{record.country || ''}</Td>
                  <Td numeric>{record.cost_per_unit ? parseFloat(record.cost_per_unit).toFixed(4) : '0.0000'}</Td>
                  <Td>{record.factcountry || ''}</Td>
                </Tr>
              ))
            ) : (
              <tr><td colSpan="8" style={{ textAlign: 'center', padding: '20px' }}>No data available</td></tr>
            )}
          </tbody>
        </Table>
      </TableContainer>

      {/* Pagination */}
      {tableData?.pagination && (
        <PaginationContainer>
          <div>
            <span>Records per page: </span>
            <Select value={recordsPerPage} onChange={(e) => handleRecordsPerPageChange(parseInt(e.target.value))}>
              <option value={50}>50</option>
              <option value={100}>100</option>
              <option value={200}>200</option>
              <option value={500}>500</option>
            </Select>
          </div>
          
          <div>
            Showing {tableData.pagination.startRecord} to {tableData.pagination.endRecord} of {formatNumber(tableData.pagination.totalRecords)} records
          </div>
          
          <div>
            <PaginationButton 
              disabled={!tableData.pagination.hasPrevPage} 
              onClick={() => handlePageChange(currentPage - 1)}
            >
              Previous
            </PaginationButton>
            <span style={{ margin: '0 10px' }}>
              Page {tableData.pagination.currentPage} of {tableData.pagination.totalPages}
            </span>
            <PaginationButton 
              disabled={!tableData.pagination.hasNextPage} 
              onClick={() => handlePageChange(currentPage + 1)}
            >
              Next
            </PaginationButton>
          </div>
        </PaginationContainer>
      )}
    </Container>
  );
}

export default T03TestData;