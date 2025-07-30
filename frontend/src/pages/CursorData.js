import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { useQuery } from 'react-query';
import { 
  Database, 
  FileText, 
  BarChart3, 
  Trash2, 
  RefreshCw,
  Download,
  Eye,
  Grid
} from 'lucide-react';
import { cursorAPI } from '../services/api';
import toast from 'react-hot-toast';

const CursorDataContainer = styled.div`
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem;
`;

const PageTitle = styled.h1`
  font-size: 2rem;
  font-weight: bold;
  color: #1e293b;
  margin-bottom: 1rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const PageSubtitle = styled.p`
  color: #64748b;
  margin-bottom: 2rem;
`;

const StatsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 1.5rem;
  margin-bottom: 2rem;
`;

const StatCard = styled.div`
  background: white;
  border-radius: 0.75rem;
  padding: 1.5rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  border: 1px solid #e2e8f0;
`;

const StatTitle = styled.h3`
  font-size: 1rem;
  font-weight: 600;
  color: #374151;
  margin-bottom: 0.5rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const StatValue = styled.div`
  font-size: 2rem;
  font-weight: bold;
  color: #1e293b;
`;

const StatDescription = styled.p`
  font-size: 0.875rem;
  color: #6b7280;
  margin-top: 0.5rem;
`;

const ActionsBar = styled.div`
  display: flex;
  gap: 1rem;
  margin-bottom: 2rem;
  flex-wrap: wrap;
`;

const Button = styled.button`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1.5rem;
  border-radius: 0.5rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  border: none;
  
  ${props => props.variant === 'primary' && `
    background: #3b82f6;
    color: white;
    
    &:hover {
      background: #2563eb;
    }
  `}
  
  ${props => props.variant === 'secondary' && `
    background: #f3f4f6;
    color: #374151;
    
    &:hover {
      background: #e5e7eb;
    }
  `}
  
  ${props => props.variant === 'danger' && `
    background: #ef4444;
    color: white;
    
    &:hover {
      background: #dc2626;
    }
  `}
  
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const DataSection = styled.div`
  background: white;
  border-radius: 0.75rem;
  padding: 1.5rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  border: 1px solid #e2e8f0;
  margin-bottom: 2rem;
`;

const SectionTitle = styled.h2`
  font-size: 1.5rem;
  font-weight: 600;
  color: #1e293b;
  margin-bottom: 1rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const ExcelTableContainer = styled.div`
  overflow-x: auto;
  border: 1px solid #e2e8f0;
  border-radius: 0.5rem;
  max-height: 600px;
  overflow-y: auto;
`;

const ExcelTable = styled.table`
  width: 100%;
  border-collapse: collapse;
  font-family: 'Courier New', monospace;
  font-size: 0.875rem;
`;

const ExcelTh = styled.th`
  background: #f8fafc;
  padding: 0.5rem;
  text-align: center;
  font-weight: 600;
  color: #374151;
  border: 1px solid #e2e8f0;
  position: sticky;
  top: 0;
  z-index: 10;
  min-width: 80px;
`;

const ExcelTd = styled.td`
  padding: 0.5rem;
  border: 1px solid #e2e8f0;
  color: #374151;
  text-align: center;
  min-width: 80px;
  max-width: 200px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const ExcelTr = styled.tr`
  &:hover {
    background: #f8fafc;
  }
  
  &:nth-child(even) {
    background: #fafafa;
  }
  
  &:nth-child(even):hover {
    background: #f1f5f9;
  }
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 3rem;
  color: #6b7280;
`;

const LoadingSpinner = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 2rem;
  color: #6b7280;
`;

const ViewModeToggle = styled.div`
  display: flex;
  gap: 0.5rem;
  margin-bottom: 1rem;
`;

const ViewModeButton = styled.button`
  padding: 0.5rem 1rem;
  border: 1px solid #e2e8f0;
  background: ${props => props.active ? '#3b82f6' : 'white'};
  color: ${props => props.active ? 'white' : '#374151'};
  border-radius: 0.375rem;
  cursor: pointer;
  font-size: 0.875rem;
  
  &:hover {
    background: ${props => props.active ? '#2563eb' : '#f8fafc'};
  }
`;

const CursorData = () => {
  const [selectedTable, setSelectedTable] = useState('demand');
  const [viewMode, setViewMode] = useState('excel'); // 'excel' or 'raw'
  const [selectedWorksheet, setSelectedWorksheet] = useState(null);

  // Fetch cursor statistics
  const { data: stats, isLoading: statsLoading, refetch: refetchStats } = useQuery(
    'cursor-stats',
    cursorAPI.getCursorStats,
    {
      refetchOnWindowFocus: false,
    }
  );

  // Fetch cursor data based on selected table
  const { data: cursorData, isLoading: dataLoading, refetch: refetchData } = useQuery(
    ['cursor-data', selectedTable],
    () => {
      switch (selectedTable) {
        case 'demand':
          return cursorAPI.getDemandCursorData();
        case 'demand_country_master':
          return cursorAPI.getDemandCountryMasterCursorData();
        case 'base_scenario_configuration':
          return cursorAPI.getBaseScenarioConfigurationCursorData();
        default:
          return cursorAPI.getDemandCursorData();
      }
    },
    {
      refetchOnWindowFocus: false,
    }
  );

  // Get available worksheets for the selected table
  const availableWorksheets = React.useMemo(() => {
    if (!cursorData?.data) {
      console.log('No cursor data available for worksheets');
      return [];
    }
    
    const worksheets = new Map();
    cursorData.data.forEach(cell => {
      if (!worksheets.has(cell.worksheet_id)) {
        worksheets.set(cell.worksheet_id, {
          id: cell.worksheet_id,
          workbook_id: cell.workbook_id,
          name: `Worksheet ${cell.worksheet_id.slice(0, 8)}...`
        });
      }
    });
    
    const result = Array.from(worksheets.values());
    console.log('Available worksheets:', result);
    return result;
  }, [cursorData]);

  // Set first worksheet as default when data changes
  useEffect(() => {
    if (availableWorksheets.length > 0) {
      // Reset selected worksheet when table changes or when no worksheet is selected
      setSelectedWorksheet(availableWorksheets[0].id);
    }
  }, [availableWorksheets]);

  // Convert cursor data to Excel-like 2D array
  const excelData = React.useMemo(() => {
    if (!cursorData?.data || !selectedWorksheet) {
      console.log('No cursor data or selected worksheet:', { 
        hasData: !!cursorData?.data, 
        dataLength: cursorData?.data?.length,
        selectedWorksheet 
      });
      return [];
    }

    const worksheetData = cursorData.data.filter(cell => cell.worksheet_id === selectedWorksheet);
    
    console.log('Worksheet data:', {
      totalData: cursorData.data.length,
      worksheetData: worksheetData.length,
      selectedWorksheet,
      firstFewCells: worksheetData.slice(0, 3)
    });
    
    if (worksheetData.length === 0) return [];

    // Find max row and column indices
    const maxRow = Math.max(...worksheetData.map(cell => cell.row_index));
    const maxCol = Math.max(...worksheetData.map(cell => cell.column_index));

    // Create 2D array
    const array = [];
    for (let row = 0; row <= maxRow; row++) {
      array[row] = [];
      for (let col = 0; col <= maxCol; col++) {
        array[row][col] = '';
      }
    }

    // Populate array with data
    worksheetData.forEach(cell => {
      array[cell.row_index][cell.column_index] = cell.cell_value;
    });

    console.log('Excel array created:', {
      rows: array.length,
      cols: array[0]?.length || 0,
      sampleData: array.slice(0, 2).map(row => row.slice(0, 3))
    });

    return array;
  }, [cursorData, selectedWorksheet]);

  const handleClearAllData = async () => {
    if (window.confirm('Are you sure you want to clear all cursor data? This action cannot be undone.')) {
      try {
        await cursorAPI.clearAllCursorData();
        toast.success('All cursor data cleared successfully');
        refetchStats();
        refetchData();
      } catch (error) {
        toast.error('Failed to clear cursor data');
        console.error('Error clearing cursor data:', error);
      }
    }
  };

  const getTableTitle = (table) => {
    switch (table) {
      case 'demand':
        return 'Demand';
      case 'demand_country_master':
        return 'Demand Country Master';
      case 'base_scenario_configuration':
        return 'Base Scenario Configuration';
      default:
        return 'Demand';
    }
  };

  const getTableIcon = (table) => {
    switch (table) {
      case 'demand':
        return <FileText size={20} />;
      case 'demand_country_master':
        return <Database size={20} />;
      case 'base_scenario_configuration':
        return <BarChart3 size={20} />;
      default:
        return <FileText size={20} />;
    }
  };

  if (statsLoading) {
    return (
      <CursorDataContainer>
        <LoadingSpinner>
          <RefreshCw size={24} className="animate-spin" />
          <span style={{ marginLeft: '0.5rem' }}>Loading cursor statistics...</span>
        </LoadingSpinner>
      </CursorDataContainer>
    );
  }

  return (
    <CursorDataContainer>
      <PageTitle>
        <Database size={32} />
        Cursor Data Management
      </PageTitle>
      <PageSubtitle>
        View and manage data from the three specific sheet tables: Demand, Demand Country Master, and Base Scenario Configuration
      </PageSubtitle>

      {/* Statistics */}
      <StatsGrid>
        <StatCard>
          <StatTitle>
            <FileText size={16} />
            Demand Records
          </StatTitle>
          <StatValue>{stats?.data?.demand?.total_records || 0}</StatValue>
          <StatDescription>
            {stats?.data?.demand?.total_workbooks || 0} workbooks, {stats?.data?.demand?.total_worksheets || 0} worksheets
          </StatDescription>
        </StatCard>

        <StatCard>
          <StatTitle>
            <Database size={16} />
            Country Master Records
          </StatTitle>
          <StatValue>{stats?.data?.demand_country_master?.total_records || 0}</StatValue>
          <StatDescription>
            {stats?.data?.demand_country_master?.total_workbooks || 0} workbooks, {stats?.data?.demand_country_master?.total_worksheets || 0} worksheets
          </StatDescription>
        </StatCard>

        <StatCard>
          <StatTitle>
            <BarChart3 size={16} />
            Base Scenario Records
          </StatTitle>
          <StatValue>{stats?.data?.base_scenario_configuration?.total_records || 0}</StatValue>
          <StatDescription>
            {stats?.data?.base_scenario_configuration?.total_workbooks || 0} workbooks, {stats?.data?.base_scenario_configuration?.total_worksheets || 0} worksheets
          </StatDescription>
        </StatCard>
      </StatsGrid>

      {/* Actions */}
      <ActionsBar>
        <Button
          variant={selectedTable === 'demand' ? 'primary' : 'secondary'}
          onClick={() => {
            setSelectedTable('demand');
            setSelectedWorksheet(null); // Reset worksheet selection
          }}
        >
          <FileText size={16} />
          Demand
        </Button>
        <Button
          variant={selectedTable === 'demand_country_master' ? 'primary' : 'secondary'}
          onClick={() => {
            setSelectedTable('demand_country_master');
            setSelectedWorksheet(null); // Reset worksheet selection
          }}
        >
          <Database size={16} />
          Country Master
        </Button>
        <Button
          variant={selectedTable === 'base_scenario_configuration' ? 'primary' : 'secondary'}
          onClick={() => {
            setSelectedTable('base_scenario_configuration');
            setSelectedWorksheet(null); // Reset worksheet selection
          }}
        >
          <BarChart3 size={16} />
          Base Scenario
        </Button>

        <div style={{ marginLeft: 'auto' }}>
          <Button variant="secondary" onClick={() => refetchStats()}>
            <RefreshCw size={16} />
            Refresh Stats
          </Button>
          <Button variant="danger" onClick={handleClearAllData}>
            <Trash2 size={16} />
            Clear All Data
          </Button>
        </div>
      </ActionsBar>

      {/* Data Display */}
      <DataSection>
        <SectionTitle>
          {getTableIcon(selectedTable)}
          {getTableTitle(selectedTable)} Data
        </SectionTitle>

        {/* Worksheet Selector */}
        {availableWorksheets.length > 0 && (
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ marginRight: '0.5rem', fontWeight: 500 }}>Worksheet:</label>
            <select 
              value={selectedWorksheet || ''} 
              onChange={(e) => setSelectedWorksheet(e.target.value)}
              style={{ padding: '0.5rem', border: '1px solid #e2e8f0', borderRadius: '0.375rem' }}
            >
              {availableWorksheets.map(ws => (
                <option key={ws.id} value={ws.id}>
                  {ws.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* View Mode Toggle */}
        <ViewModeToggle>
          <ViewModeButton 
            active={viewMode === 'excel'} 
            onClick={() => setViewMode('excel')}
          >
            <Grid size={16} />
            Excel View
          </ViewModeButton>
          <ViewModeButton 
            active={viewMode === 'raw'} 
            onClick={() => setViewMode('raw')}
          >
            <Database size={16} />
            Raw Data
          </ViewModeButton>
        </ViewModeToggle>

        {dataLoading ? (
          <LoadingSpinner>
            <RefreshCw size={24} className="animate-spin" />
            <span style={{ marginLeft: '0.5rem' }}>Loading data...</span>
          </LoadingSpinner>
        ) : excelData.length > 0 ? (
          <ExcelTableContainer>
            {viewMode === 'excel' ? (
              <ExcelTable>
                <thead>
                  <ExcelTr>
                    <ExcelTh style={{ minWidth: '60px' }}>Row</ExcelTh>
                    {excelData[0]?.map((_, colIndex) => (
                      <ExcelTh key={colIndex}>
                        {String.fromCharCode(65 + colIndex)} {/* A, B, C, etc. */}
                      </ExcelTh>
                    ))}
                  </ExcelTr>
                </thead>
                <tbody>
                  {excelData.map((row, rowIndex) => (
                    <ExcelTr key={rowIndex}>
                      <ExcelTh style={{ minWidth: '60px' }}>{rowIndex + 1}</ExcelTh>
                      {row.map((cell, colIndex) => (
                        <ExcelTd key={colIndex} title={cell}>
                          {cell}
                        </ExcelTd>
                      ))}
                    </ExcelTr>
                  ))}
                </tbody>
              </ExcelTable>
            ) : (
              <ExcelTable>
                <thead>
                  <ExcelTr>
                    <ExcelTh>Row</ExcelTh>
                    <ExcelTh>Column</ExcelTh>
                    <ExcelTh>Column Name</ExcelTh>
                    <ExcelTh>Value</ExcelTh>
                    <ExcelTh>Type</ExcelTh>
                    <ExcelTh>Workbook</ExcelTh>
                    <ExcelTh>Worksheet</ExcelTh>
                  </ExcelTr>
                </thead>
                <tbody>
                  {cursorData.data.slice(0, 100).map((row, index) => (
                    <ExcelTr key={row.id}>
                      <ExcelTd>{row.row_index}</ExcelTd>
                      <ExcelTd>{row.column_index}</ExcelTd>
                      <ExcelTd>{row.column_name}</ExcelTd>
                      <ExcelTd title={row.cell_value}>
                        {row.cell_value}
                      </ExcelTd>
                      <ExcelTd>{row.cell_type}</ExcelTd>
                      <ExcelTd>{row.workbook_id}</ExcelTd>
                      <ExcelTd>{row.worksheet_id}</ExcelTd>
                    </ExcelTr>
                  ))}
                </tbody>
              </ExcelTable>
            )}
            {viewMode === 'raw' && cursorData.data.length > 100 && (
              <div style={{ padding: '1rem', textAlign: 'center', color: '#6b7280' }}>
                Showing first 100 records of {cursorData.data.length} total records
              </div>
            )}
          </ExcelTableContainer>
        ) : (
          <EmptyState>
            <Database size={48} style={{ marginBottom: '1rem', opacity: 0.5 }} />
            <h3>No data found</h3>
            <p>No data available for the selected table. Upload files with the corresponding sheets to see data here.</p>
          </EmptyState>
        )}
      </DataSection>
    </CursorDataContainer>
  );
};

export default CursorData; 