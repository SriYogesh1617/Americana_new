import React, { useState, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from 'react-query';
import styled from 'styled-components';
import { FixedSizeGrid as Grid } from 'react-window';
import { 
  ArrowLeft,
  FileSpreadsheet, 
  Download,
  Search,
  Filter,
  RefreshCw,
  MoreVertical,
  Eye,
  Edit
} from 'lucide-react';
import { dataAPI, exportAPI, downloadFile } from '../services/api';
import toast from 'react-hot-toast';

const Container = styled.div`
  max-width: 100%;
  margin: 0 auto;
  height: 100vh;
  display: flex;
  flex-direction: column;
`;

const Header = styled.div`
  padding: 1rem 1.5rem;
  border-bottom: 1px solid #e5e7eb;
  background: white;
  flex-shrink: 0;
`;

const HeaderTop = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
`;

const BackButton = styled(Link)`
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  color: #6b7280;
  text-decoration: none;
  
  &:hover {
    color: #3b82f6;
  }
`;

const TitleGroup = styled.div`
  flex: 1;
  margin-left: 2rem;
`;

const WorksheetTitle = styled.h1`
  font-size: 1.5rem;
  font-weight: bold;
  color: #1e293b;
  margin: 0;
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const Actions = styled.div`
  display: flex;
  gap: 1rem;
`;

const ActionButton = styled.button`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  border: 1px solid #d1d5db;
  background: white;
  border-radius: 0.375rem;
  color: #374151;
  cursor: pointer;
  transition: all 0.2s;
  
  &:hover {
    background: #f9fafb;
    border-color: #3b82f6;
    color: #3b82f6;
  }
`;

const Controls = styled.div`
  display: flex;
  gap: 1rem;
  align-items: center;
`;

const SearchBox = styled.div`
  position: relative;
  width: 250px;
`;

const SearchInput = styled.input`
  width: 100%;
  padding: 0.5rem 1rem 0.5rem 2.25rem;
  border: 1px solid #d1d5db;
  border-radius: 0.375rem;
  font-size: 0.875rem;
  
  &:focus {
    outline: none;
    border-color: #3b82f6;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  }
`;

const SearchIcon = styled(Search)`
  position: absolute;
  left: 0.5rem;
  top: 50%;
  transform: translateY(-50%);
  width: 1rem;
  height: 1rem;
  color: #6b7280;
`;

const Stats = styled.div`
  display: flex;
  gap: 2rem;
  font-size: 0.875rem;
  color: #6b7280;
`;

const StatItem = styled.div`
  display: flex;
  align-items: center;
  gap: 0.25rem;
`;

const DataContainer = styled.div`
  flex: 1;
  background: white;
  overflow: hidden;
  position: relative;
`;

const TableHeader = styled.div`
  display: flex;
  background: #f9fafb;
  border-bottom: 2px solid #e5e7eb;
  position: sticky;
  top: 0;
  z-index: 10;
`;

const RowIndexHeader = styled.div`
  width: 60px;
  padding: 0.75rem 0.5rem;
  border-right: 1px solid #e5e7eb;
  font-weight: 600;
  text-align: center;
  background: #f3f4f6;
  color: #6b7280;
  font-size: 0.875rem;
`;

const ColumnHeader = styled.div`
  min-width: 120px;
  width: 120px;
  padding: 0.75rem 0.5rem;
  border-right: 1px solid #e5e7eb;
  font-weight: 600;
  background: #f9fafb;
  color: #374151;
  font-size: 0.875rem;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const Cell = styled.div`
  padding: 0.5rem;
  border-right: 1px solid #f3f4f6;
  border-bottom: 1px solid #f3f4f6;
  font-size: 0.875rem;
  color: #374151;
  background: ${props => props.isHeader ? '#f9fafb' : 'white'};
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  
  &:hover {
    background: #f0f9ff;
  }
`;

const RowIndexCell = styled.div`
  width: 60px;
  padding: 0.5rem;
  border-right: 1px solid #e5e7eb;
  border-bottom: 1px solid #f3f4f6;
  background: #f9fafb;
  color: #6b7280;
  font-size: 0.875rem;
  text-align: center;
  font-weight: 500;
`;

const LoadingState = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  height: 200px;
  color: #6b7280;
`;

const ErrorState = styled.div`
  text-align: center;
  padding: 3rem 1rem;
  color: #6b7280;
`;

const NoDataState = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 300px;
  color: #6b7280;
`;

const COLUMN_WIDTH = 120;
const ROW_HEIGHT = 40;
const HEADER_HEIGHT = 45;

const WorksheetDetail = () => {
  const { worksheetId } = useParams();
  const [searchTerm, setSearchTerm] = useState('');

  const { data: worksheet, isLoading, error } = useQuery(
    ['worksheet', worksheetId],
    () => dataAPI.getWorksheet(worksheetId),
    {
      enabled: !!worksheetId
    }
  );

  // Transform data into grid format
  const { gridData, headers, totalRows, totalCols } = useMemo(() => {
    if (!worksheet?.data) {
      return { gridData: [], headers: [], totalRows: 0, totalCols: 0 };
    }

    // Group data by row and column
    const dataByPosition = {};
    let maxRow = 0;
    let maxCol = 0;

    worksheet.data.forEach(cell => {
      const key = `${cell.row_index}-${cell.column_index}`;
      dataByPosition[key] = cell;
      maxRow = Math.max(maxRow, cell.row_index);
      maxCol = Math.max(maxCol, cell.column_index);
    });

    // Create headers array
    const headers = [];
    for (let col = 0; col <= maxCol; col++) {
      const headerCell = dataByPosition[`0-${col}`];
      headers.push(headerCell?.cell_value || `Column ${col + 1}`);
    }

    // Create grid data
    const gridData = [];
    for (let row = 0; row <= maxRow; row++) {
      const rowData = [];
      for (let col = 0; col <= maxCol; col++) {
        const cell = dataByPosition[`${row}-${col}`];
        rowData.push(cell?.cell_value || '');
      }
      gridData.push(rowData);
    }

    return {
      gridData,
      headers,
      totalRows: maxRow + 1,
      totalCols: maxCol + 1
    };
  }, [worksheet?.data]);

  const handleExport = async (format = 'xlsx') => {
    try {
      toast.loading('Preparing export...');
      const blob = await exportAPI.exportWorksheet(worksheetId, format);
      downloadFile(blob, `${worksheet.sheet_name}.${format}`);
      toast.dismiss();
      toast.success('Export completed!');
    } catch (error) {
      toast.dismiss();
      toast.error('Export failed');
      console.error('Export error:', error);
    }
  };

  const Cell = ({ columnIndex, rowIndex, style }) => {
    const cellValue = gridData[rowIndex]?.[columnIndex] || '';
    const isHeader = rowIndex === 0;
    
    return (
      <div style={style}>
        <div
          style={{
            padding: '0.5rem',
            borderRight: '1px solid #f3f4f6',
            borderBottom: '1px solid #f3f4f6',
            fontSize: '0.875rem',
            color: '#374151',
            background: isHeader ? '#f9fafb' : 'white',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            fontWeight: isHeader ? '600' : '400'
          }}
          title={cellValue}
        >
          {cellValue}
        </div>
      </div>
    );
  };

  if (isLoading) {
    return (
      <Container>
        <LoadingState>
          <div className="spinner" />
          <span style={{ marginLeft: '1rem' }}>Loading worksheet data...</span>
        </LoadingState>
      </Container>
    );
  }

  if (error || !worksheet) {
    return (
      <Container>
        <ErrorState>
          <h3>Worksheet not found</h3>
          <p>The requested worksheet could not be loaded.</p>
          <Link to="/workbooks" style={{ color: '#3b82f6', marginTop: '1rem', display: 'inline-block' }}>
            ← Back to Workbooks
          </Link>
        </ErrorState>
      </Container>
    );
  }

  if (totalRows === 0 || totalCols === 0) {
    return (
      <Container>
        <Header>
          <HeaderTop>
            <BackButton to={`/workbooks/${worksheet.workbook_id || ''}`}>
              <ArrowLeft size={16} />
              Back to Workbook
            </BackButton>
            <TitleGroup>
              <WorksheetTitle>
                <FileSpreadsheet size={20} color="#3b82f6" />
                {worksheet.sheet_name}
              </WorksheetTitle>
            </TitleGroup>
          </HeaderTop>
        </Header>
        <NoDataState>
          <FileSpreadsheet size={48} color="#d1d5db" style={{ marginBottom: '1rem' }} />
          <h3 style={{ color: '#374151', marginBottom: '0.5rem' }}>No data available</h3>
          <p>This worksheet appears to be empty.</p>
        </NoDataState>
      </Container>
    );
  }

  return (
    <Container>
      <Header>
        <HeaderTop>
          <BackButton to={`/workbooks/${worksheet.workbook_id || ''}`}>
            <ArrowLeft size={16} />
            Back to Workbook
          </BackButton>
          
          <TitleGroup>
            <WorksheetTitle>
              <FileSpreadsheet size={20} color="#3b82f6" />
              {worksheet.sheet_name}
            </WorksheetTitle>
          </TitleGroup>

          <Actions>
            <ActionButton onClick={() => handleExport('csv')}>
              <Download size={14} />
              CSV
            </ActionButton>
            <ActionButton onClick={() => handleExport('xlsx')}>
              <Download size={14} />
              Excel
            </ActionButton>
            <ActionButton>
              <RefreshCw size={14} />
              Refresh
            </ActionButton>
          </Actions>
        </HeaderTop>

        <Controls>
          <SearchBox>
            <SearchIcon />
            <SearchInput
              type="text"
              placeholder="Search data..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </SearchBox>
          
          <ActionButton>
            <Filter size={14} />
            Filter
          </ActionButton>

          <Stats>
            <StatItem>
              <span>{totalRows.toLocaleString()} rows</span>
            </StatItem>
            <StatItem>
              <span>{totalCols} columns</span>
            </StatItem>
            <StatItem>
              <span>{(totalRows * totalCols).toLocaleString()} cells</span>
            </StatItem>
          </Stats>
        </Controls>
      </Header>

      <DataContainer>
        <div style={{ display: 'flex', height: '100%' }}>
          {/* Row indices column */}
          <div style={{ width: '60px', background: '#f9fafb', borderRight: '2px solid #e5e7eb' }}>
            <div
              style={{
                height: HEADER_HEIGHT,
                padding: '0.75rem 0.5rem',
                borderBottom: '2px solid #e5e7eb',
                fontWeight: 600,
                textAlign: 'center',
                background: '#f3f4f6',
                color: '#6b7280',
                fontSize: '0.875rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              #
            </div>
            {Array.from({ length: totalRows }, (_, index) => (
              <div
                key={index}
                style={{
                  height: ROW_HEIGHT,
                  padding: '0.5rem',
                  borderBottom: '1px solid #f3f4f6',
                  background: '#f9fafb',
                  color: '#6b7280',
                  fontSize: '0.875rem',
                  textAlign: 'center',
                  fontWeight: 500,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                {index + 1}
              </div>
            ))}
          </div>

          {/* Data grid */}
          <div style={{ flex: 1 }}>
            {/* Column headers */}
            <div style={{ display: 'flex', height: HEADER_HEIGHT, background: '#f9fafb', borderBottom: '2px solid #e5e7eb' }}>
              {headers.map((header, index) => (
                <div
                  key={index}
                  style={{
                    minWidth: COLUMN_WIDTH,
                    width: COLUMN_WIDTH,
                    padding: '0.75rem 0.5rem',
                    borderRight: '1px solid #e5e7eb',
                    fontWeight: 600,
                    background: '#f9fafb',
                    color: '#374151',
                    fontSize: '0.875rem',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    display: 'flex',
                    alignItems: 'center'
                  }}
                  title={header}
                >
                  {header}
                </div>
              ))}
            </div>

            {/* Data rows */}
            <Grid
              columnCount={totalCols}
              columnWidth={COLUMN_WIDTH}
              height={window.innerHeight - 200}
              rowCount={totalRows}
              rowHeight={ROW_HEIGHT}
              width={totalCols * COLUMN_WIDTH}
            >
              {Cell}
            </Grid>
          </div>
        </div>
      </DataContainer>
    </Container>
  );
};

export default WorksheetDetail; 