import React, { useState } from 'react';
import { useQuery, useMutation } from 'react-query';
import styled from 'styled-components';
import { Download, Database, BarChart3, FileSpreadsheet } from 'lucide-react';
import { itemMasterAPI, downloadFile } from '../services/api';
import { toast } from 'react-hot-toast';

// Styled components
const Container = styled.div`
  padding: 20px;
  max-width: 1200px;
  margin: 0 auto;
`;

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 30px;
  flex-wrap: wrap;
  gap: 20px;
`;

const Title = styled.h1`
  color: #333;
  margin: 0;
  display: flex;
  align-items: center;
  gap: 10px;
`;

const Button = styled.button`
  background: ${props => props.variant === 'secondary' ? '#6c757d' : '#007bff'};
  color: white;
  border: none;
  padding: 12px 24px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  display: flex;
  align-items: center;
  gap: 8px;
  transition: all 0.3s ease;

  &:hover {
    background: ${props => props.variant === 'secondary' ? '#5a6268' : '#0056b3'};
    transform: translateY(-1px);
  }

  &:disabled {
    background: #6c757d;
    cursor: not-allowed;
    transform: none;
  }
`;

const StatsContainer = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 20px;
  margin-bottom: 30px;
`;

const StatCard = styled.div`
  background: white;
  padding: 20px;
  border-radius: 10px;
  box-shadow: 0 2px 10px rgba(0,0,0,0.1);
  border-left: 4px solid #007bff;
`;

const StatTitle = styled.div`
  font-size: 14px;
  color: #666;
  text-transform: uppercase;
  font-weight: 600;
  margin-bottom: 8px;
  display: flex;
  align-items: center;
  gap: 8px;
`;

const StatValue = styled.div`
  font-size: 28px;
  font-weight: bold;
  color: #333;
`;

const StatSubtitle = styled.div`
  font-size: 12px;
  color: #888;
  margin-top: 5px;
`;

const DataContainer = styled.div`
  background: white;
  border-radius: 10px;
  box-shadow: 0 2px 10px rgba(0,0,0,0.1);
  overflow: hidden;
`;

const DataHeader = styled.div`
  padding: 20px;
  border-bottom: 1px solid #eee;
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const DataTitle = styled.h3`
  margin: 0;
  color: #333;
  display: flex;
  align-items: center;
  gap: 8px;
`;

const TableContainer = styled.div`
  overflow-x: auto;
  max-height: 600px;
`;

const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
  font-size: 14px;
`;

const Th = styled.th`
  background: #f8f9fa;
  padding: 12px 16px;
  text-align: left;
  font-weight: 600;
  color: #333;
  border-bottom: 2px solid #dee2e6;
  position: sticky;
  top: 0;
  z-index: 10;
`;

const Td = styled.td`
  padding: 12px 16px;
  border-bottom: 1px solid #eee;
  color: #333;
`;

const Tr = styled.tr`
  &:hover {
    background: #f8f9fa;
  }
`;

const LoadingSpinner = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 40px;
  color: #666;
  font-size: 16px;
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 40px;
  color: #666;
`;

const FactoryBadge = styled.span`
  background: ${props => {
    switch(props.factory) {
      case 'GFC': return '#28a745';
      case 'KFC': return '#ffc107';
      case 'NFC': return '#dc3545';
      default: return '#6c757d';
    }
  }};
  color: white;
  padding: 4px 8px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 500;
`;

const ItemMaster = () => {
  const [showData, setShowData] = useState(false);

  // Get Item Master statistics
  const { data: stats, isLoading: statsLoading } = useQuery(
    'itemMasterStats',
    itemMasterAPI.getStats,
    {
      onError: (error) => {
        toast.error('Failed to load Item Master statistics');
        console.error('Error loading stats:', error);
      }
    }
  );

  // Get Item Master data
  const { data: itemMasterData, isLoading: dataLoading } = useQuery(
    'itemMasterData',
    itemMasterAPI.getData,
    {
      enabled: showData,
      onError: (error) => {
        toast.error('Failed to load Item Master data');
        console.error('Error loading data:', error);
      }
    }
  );

  // Export to CSV mutation
  const exportMutation = useMutation(
    itemMasterAPI.exportToCSV,
    {
      onSuccess: (blob) => {
        const filename = `Combined_Item_Master_${Date.now()}.csv`;
        downloadFile(blob, filename);
        toast.success('Item Master data exported to CSV successfully!');
      },
      onError: (error) => {
        toast.error('Failed to export Item Master data');
        console.error('Export error:', error);
      }
    }
  );

  const handleExport = () => {
    exportMutation.mutate();
  };

  const toggleDataView = () => {
    setShowData(!showData);
  };

  return (
    <Container>
      <Header>
        <Title>
          <Database size={32} color="#007bff" />
          Combined Item Master Data
        </Title>
        <div style={{ display: 'flex', gap: '12px' }}>
          <Button
            variant="secondary"
            onClick={toggleDataView}
            disabled={dataLoading}
          >
            <FileSpreadsheet size={16} />
            {showData ? 'Hide Data' : 'Show Data'}
          </Button>
          <Button
            onClick={handleExport}
            disabled={exportMutation.isLoading}
          >
            <Download size={16} />
            {exportMutation.isLoading ? 'Exporting...' : 'Export CSV'}
          </Button>
        </div>
      </Header>

      {/* Statistics */}
      <StatsContainer>
        <StatCard>
          <StatTitle>
            <Database size={16} />
            Total Records
          </StatTitle>
          <StatValue>
            {statsLoading ? '...' : (stats?.stats?.totalRecords || 0).toLocaleString()}
          </StatValue>
        </StatCard>

        <StatCard>
          <StatTitle>
            <BarChart3 size={16} />
            Valid Weights
          </StatTitle>
          <StatValue>
            {statsLoading ? '...' : (stats?.stats?.validWeightCount || 0).toLocaleString()}
          </StatValue>
          <StatSubtitle>
            Records with valid unit weights
          </StatSubtitle>
        </StatCard>

        <StatCard>
          <StatTitle>
            <BarChart3 size={16} />
            Average Weight
          </StatTitle>
          <StatValue>
            {statsLoading ? '...' : (stats?.stats?.averageWeight || 0).toFixed(2)}
          </StatValue>
          <StatSubtitle>
            Average unit weight across all items
          </StatSubtitle>
        </StatCard>

        <StatCard>
          <StatTitle>
            <BarChart3 size={16} />
            Factory Breakdown
          </StatTitle>
          <StatValue>
            {statsLoading ? '...' : `${stats?.stats?.factoryBreakdown?.GFC || 0} | ${stats?.stats?.factoryBreakdown?.KFC || 0} | ${stats?.stats?.factoryBreakdown?.NFC || 0}`}
          </StatValue>
          <StatSubtitle>
            GFC | KFC | NFC
          </StatSubtitle>
        </StatCard>
      </StatsContainer>

      {/* Data Table */}
      {showData && (
        <DataContainer>
          <DataHeader>
            <DataTitle>
              <FileSpreadsheet size={20} />
              Item Master Data ({itemMasterData?.count || 0} records)
            </DataTitle>
          </DataHeader>

          <TableContainer>
            {dataLoading ? (
              <LoadingSpinner>Loading Item Master data...</LoadingSpinner>
            ) : itemMasterData?.data?.length > 0 ? (
              <Table>
                <thead>
                  <tr>
                    <Th>Item Code</Th>
                    <Th>Unit Weight</Th>
                    <Th>Description</Th>
                    <Th>Item Status</Th>
                    <Th>Factory</Th>
                  </tr>
                </thead>
                <tbody>
                  {itemMasterData.data.slice(0, 100).map((item, index) => (
                    <Tr key={index}>
                      <Td>{item.item_code}</Td>
                      <Td>{item.unit_weight || 0}</Td>
                      <Td style={{ maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {item.description}
                      </Td>
                      <Td>{item.item_status}</Td>
                      <Td>
                        <FactoryBadge factory={item.factory}>
                          {item.factory}
                        </FactoryBadge>
                      </Td>
                    </Tr>
                  ))}
                </tbody>
              </Table>
            ) : (
              <EmptyState>
                <Database size={48} color="#ccc" />
                <p>No Item Master data found</p>
              </EmptyState>
            )}
          </TableContainer>
          
          {itemMasterData?.data?.length > 100 && (
            <div style={{ padding: '16px', textAlign: 'center', color: '#666', fontSize: '14px' }}>
              Showing first 100 records. Use CSV export to download all {itemMasterData.data.length} records.
            </div>
          )}
        </DataContainer>
      )}
    </Container>
  );
};

export default ItemMaster; 