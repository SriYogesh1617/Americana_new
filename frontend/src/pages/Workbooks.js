import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from 'react-query';
import styled from 'styled-components';
import { 
  FileSpreadsheet, 
  Search, 
  Filter, 
  Download, 
  Eye, 
  Calendar,
  Database,
  Layers
} from 'lucide-react';
import { dataAPI, exportAPI, downloadFile } from '../services/api';
import toast from 'react-hot-toast';

const WorkbooksContainer = styled.div`
  max-width: 1200px;
  margin: 0 auto;
`;

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
`;

const PageTitle = styled.h1`
  font-size: 2rem;
  font-weight: bold;
  color: #1e293b;
`;

const Controls = styled.div`
  display: flex;
  gap: 1rem;
  align-items: center;
`;

const SearchBox = styled.div`
  position: relative;
  width: 300px;
`;

const SearchInput = styled.input`
  width: 100%;
  padding: 0.75rem 1rem 0.75rem 2.5rem;
  border: 1px solid #d1d5db;
  border-radius: 0.5rem;
  font-size: 0.875rem;
  
  &:focus {
    outline: none;
    border-color: #3b82f6;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  }
`;

const SearchIcon = styled(Search)`
  position: absolute;
  left: 0.75rem;
  top: 50%;
  transform: translateY(-50%);
  width: 1rem;
  height: 1rem;
  color: #6b7280;
`;

const FilterButton = styled.button`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1rem;
  border: 1px solid #d1d5db;
  background: white;
  border-radius: 0.5rem;
  color: #374151;
  cursor: pointer;
  
  &:hover {
    background: #f9fafb;
  }
`;

const WorkbooksGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
  gap: 1.5rem;
  margin-bottom: 2rem;
`;

const WorkbookCard = styled.div`
  background: white;
  border-radius: 0.75rem;
  box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1);
  border: 1px solid #e5e7eb;
  overflow: hidden;
  transition: all 0.2s ease-in-out;
  
  &:hover {
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
    transform: translateY(-1px);
  }
`;

const CardHeader = styled.div`
  padding: 1.5rem 1.5rem 1rem;
  border-bottom: 1px solid #f3f4f6;
`;

const WorkbookName = styled.h3`
  font-size: 1.125rem;
  font-weight: 600;
  color: #1e293b;
  margin-bottom: 0.5rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const WorkbookMeta = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
  font-size: 0.875rem;
  color: #6b7280;
`;

const MetaItem = styled.div`
  display: flex;
  align-items: center;
  gap: 0.25rem;
`;

const CardBody = styled.div`
  padding: 1rem 1.5rem;
`;

const StatsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1rem;
  margin-bottom: 1rem;
`;

const StatItem = styled.div`
  text-align: center;
`;

const StatValue = styled.div`
  font-size: 1.25rem;
  font-weight: 600;
  color: #1e293b;
`;

const StatLabel = styled.div`
  font-size: 0.75rem;
  color: #6b7280;
  text-transform: uppercase;
  letter-spacing: 0.05em;
`;

const CardActions = styled.div`
  display: flex;
  gap: 0.5rem;
  padding: 1rem 1.5rem;
  background: #f9fafb;
  border-top: 1px solid #f3f4f6;
`;

const ActionButton = styled.button`
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  border: 1px solid #d1d5db;
  background: white;
  border-radius: 0.375rem;
  color: #374151;
  font-size: 0.875rem;
  cursor: pointer;
  transition: all 0.2s;
  
  &:hover {
    background: #f3f4f6;
    border-color: #3b82f6;
    color: #3b82f6;
  }
`;

const ViewButton = styled(Link)`
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  background: #3b82f6;
  color: white;
  border-radius: 0.375rem;
  font-size: 0.875rem;
  text-decoration: none;
  transition: all 0.2s;
  
  &:hover {
    background: #2563eb;
  }
`;

const LoadingState = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  height: 200px;
  color: #6b7280;
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 3rem 1rem;
  color: #6b7280;
`;

const EmptyIcon = styled.div`
  display: flex;
  justify-content: center;
  margin-bottom: 1rem;
`;

const EmptyTitle = styled.h3`
  font-size: 1.125rem;
  font-weight: 500;
  color: #374151;
  margin-bottom: 0.5rem;
`;

const EmptyText = styled.p`
  color: #6b7280;
`;

const Pagination = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 1rem;
  margin-top: 2rem;
`;

const PageButton = styled.button`
  padding: 0.5rem 1rem;
  border: 1px solid #d1d5db;
  background: ${props => props.active ? '#3b82f6' : 'white'};
  color: ${props => props.active ? 'white' : '#374151'};
  border-radius: 0.375rem;
  cursor: pointer;
  
  &:hover:not(:disabled) {
    background: ${props => props.active ? '#2563eb' : '#f9fafb'};
  }
  
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const Workbooks = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 12;

  const { data: workbooksData, isLoading, error } = useQuery(
    ['workbooks', currentPage, searchTerm],
    () => dataAPI.getWorkbooks(currentPage, pageSize),
    {
      keepPreviousData: true
    }
  );

  const handleExport = async (workbookId, workbookName, format = 'xlsx') => {
    try {
      toast.loading('Preparing export...');
      const blob = await exportAPI.exportWorkbook(workbookId, format);
      downloadFile(blob, `${workbookName}.${format}`);
      toast.dismiss();
      toast.success('Export completed!');
    } catch (error) {
      toast.dismiss();
      toast.error('Export failed');
      console.error('Export error:', error);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const filteredWorkbooks = workbooksData?.workbooks?.filter(workbook =>
    workbook.workbook_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    workbook.file_name.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  if (isLoading) {
    return (
      <WorkbooksContainer>
        <LoadingState>
          <div className="spinner" />
          <span style={{ marginLeft: '1rem' }}>Loading workbooks...</span>
        </LoadingState>
      </WorkbooksContainer>
    );
  }

  if (error) {
    return (
      <WorkbooksContainer>
        <EmptyState>
          <EmptyTitle>Error loading workbooks</EmptyTitle>
          <EmptyText>Please try again later.</EmptyText>
        </EmptyState>
      </WorkbooksContainer>
    );
  }

  return (
    <WorkbooksContainer>
      <Header>
        <PageTitle>Workbooks</PageTitle>
        <Controls>
          <SearchBox>
            <SearchIcon />
            <SearchInput
              type="text"
              placeholder="Search workbooks..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </SearchBox>
          <FilterButton>
            <Filter size={16} />
            Filter
          </FilterButton>
        </Controls>
      </Header>

      {filteredWorkbooks.length === 0 ? (
        <EmptyState>
          <EmptyIcon>
            <FileSpreadsheet size={48} color="#d1d5db" />
          </EmptyIcon>
          <EmptyTitle>No workbooks found</EmptyTitle>
          <EmptyText>
            {searchTerm 
              ? `No workbooks match "${searchTerm}"`
              : 'Upload some Excel files to get started'
            }
          </EmptyText>
        </EmptyState>
      ) : (
        <>
          <WorkbooksGrid>
            {filteredWorkbooks.map((workbook) => (
              <WorkbookCard key={workbook.id}>
                <CardHeader>
                  <WorkbookName>
                    <FileSpreadsheet size={18} color="#3b82f6" />
                    {workbook.workbook_name}
                  </WorkbookName>
                  <WorkbookMeta>
                    <MetaItem>
                      <Calendar size={14} />
                      {formatDate(workbook.created_at)}
                    </MetaItem>
                    <MetaItem>
                      <Database size={14} />
                      {workbook.file_name}
                    </MetaItem>
                  </WorkbookMeta>
                </CardHeader>

                <CardBody>
                  <StatsGrid>
                    <StatItem>
                      <StatValue>{workbook.sheet_count}</StatValue>
                      <StatLabel>Sheets</StatLabel>
                    </StatItem>
                    <StatItem>
                      <StatValue>{workbook.total_rows?.toLocaleString() || '0'}</StatValue>
                      <StatLabel>Rows</StatLabel>
                    </StatItem>
                    <StatItem>
                      <StatValue>{workbook.total_columns}</StatValue>
                      <StatLabel>Columns</StatLabel>
                    </StatItem>
                  </StatsGrid>
                </CardBody>

                <CardActions>
                  <ViewButton to={`/workbooks/${workbook.id}`}>
                    <Eye size={16} />
                    View
                  </ViewButton>
                  <ActionButton
                    onClick={() => handleExport(workbook.id, workbook.workbook_name, 'xlsx')}
                  >
                    <Download size={16} />
                    Export
                  </ActionButton>
                </CardActions>
              </WorkbookCard>
            ))}
          </WorkbooksGrid>

          {workbooksData?.pagination && (
            <Pagination>
              <PageButton
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
              >
                Previous
              </PageButton>
              
              <PageButton active>
                Page {currentPage}
              </PageButton>
              
              <PageButton
                onClick={() => setCurrentPage(prev => prev + 1)}
                disabled={filteredWorkbooks.length < pageSize}
              >
                Next
              </PageButton>
            </Pagination>
          )}
        </>
      )}
    </WorkbooksContainer>
  );
};

export default Workbooks; 