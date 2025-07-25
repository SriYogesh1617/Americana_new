import React, { useState } from 'react';
import { useQuery } from 'react-query';
import styled from 'styled-components';
import { 
  Calendar, 
  FileText, 
  TrendingUp, 
  BarChart3,
  Download,
  Filter,
  ChevronLeft,
  ChevronRight,
  PieChart,
  Activity
} from 'lucide-react';
import { dataAPI } from '../services/api';

const MonthlyViewContainer = styled.div`
  max-width: 1200px;
  margin: 0 auto;
`;

const PageTitle = styled.h1`
  font-size: 2rem;
  font-weight: bold;
  color: #1e293b;
  margin-bottom: 1rem;
`;

const PageSubtitle = styled.p`
  color: #6b7280;
  margin-bottom: 2rem;
`;

const MonthNavigation = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: white;
  padding: 1.5rem;
  border-radius: 0.75rem;
  box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1);
  border: 1px solid #e5e7eb;
  margin-bottom: 2rem;
`;

const MonthDisplay = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
`;

const MonthText = styled.h2`
  font-size: 1.5rem;
  font-weight: 600;
  color: #1e293b;
`;

const NavigationButtons = styled.div`
  display: flex;
  gap: 0.5rem;
`;

const NavButton = styled.button`
  padding: 0.5rem;
  border: 1px solid #e5e7eb;
  background: white;
  border-radius: 0.375rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
  
  &:hover {
    background: #f9fafb;
    border-color: #3b82f6;
  }
  
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const StatsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1.5rem;
  margin-bottom: 2rem;
`;

const StatCard = styled.div`
  background: white;
  padding: 1.5rem;
  border-radius: 0.75rem;
  box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1);
  border: 1px solid #e5e7eb;
`;

const StatHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1rem;
`;

const StatTitle = styled.h3`
  font-size: 0.875rem;
  font-weight: 500;
  color: #6b7280;
  text-transform: uppercase;
  letter-spacing: 0.05em;
`;

const StatIcon = styled.div`
  padding: 0.5rem;
  border-radius: 0.5rem;
  background-color: ${props => props.bgColor || '#f3f4f6'};
`;

const StatValue = styled.div`
  font-size: 2rem;
  font-weight: bold;
  color: #1e293b;
  margin-bottom: 0.5rem;
`;

const StatChange = styled.div`
  font-size: 0.875rem;
  color: ${props => props.positive ? '#059669' : '#dc2626'};
  display: flex;
  align-items: center;
  gap: 0.25rem;
`;

const ContentGrid = styled.div`
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: 2rem;
  
  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
`;

const DataSection = styled.div`
  background: white;
  border-radius: 0.75rem;
  box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1);
  border: 1px solid #e5e7eb;
  margin-bottom: 2rem;
`;

const SectionHeader = styled.div`
  padding: 1.5rem;
  border-bottom: 1px solid #e5e7eb;
  display: flex;
  align-items: center;
  justify-content: space-between;
`;

const SectionTitle = styled.h2`
  font-size: 1.25rem;
  font-weight: 600;
  color: #1e293b;
`;

const SectionActions = styled.div`
  display: flex;
  gap: 0.5rem;
`;

const ActionButton = styled.button`
  padding: 0.5rem 1rem;
  border: 1px solid #e5e7eb;
  background: white;
  border-radius: 0.375rem;
  font-size: 0.875rem;
  font-weight: 500;
  color: #374151;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  transition: all 0.2s;
  
  &:hover {
    background: #f9fafb;
    border-color: #3b82f6;
    color: #3b82f6;
  }
`;

const DataTable = styled.div`
  overflow-x: auto;
`;

const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
  font-size: 0.875rem;
`;

const Th = styled.th`
  background: #f9fafb;
  padding: 0.75rem;
  text-align: left;
  font-weight: 600;
  color: #374151;
  border-bottom: 1px solid #e5e7eb;
`;

const Td = styled.td`
  padding: 0.75rem;
  border-bottom: 1px solid #e5e7eb;
  color: #374151;
`;

const ChartPlaceholder = styled.div`
  height: 300px;
  background: #f9fafb;
  border: 2px dashed #e5e7eb;
  border-radius: 0.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #6b7280;
  font-size: 0.875rem;
`;

const LoadingSpinner = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  height: 200px;
  color: #6b7280;
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 3rem;
  color: #6b7280;
`;

const MonthlyView = () => {
  const [currentMonth, setCurrentMonth] = useState(new Date().toISOString().slice(0, 7));
  
  const { data: monthlyStats, isLoading: statsLoading } = useQuery(
    ['monthly-stats', currentMonth],
    () => dataAPI.getMonthlyStats(currentMonth)
  );

  const { data: monthlyUploads, isLoading: uploadsLoading } = useQuery(
    ['monthly-uploads', currentMonth],
    () => dataAPI.getMonthlyUploads(currentMonth)
  );

  const { data: monthlyWorkbooks, isLoading: workbooksLoading } = useQuery(
    ['monthly-workbooks', currentMonth],
    () => dataAPI.getMonthlyWorkbooks(currentMonth)
  );

  const navigateMonth = (direction) => {
    const [year, month] = currentMonth.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1 + direction, 1);
    setCurrentMonth(date.toISOString().slice(0, 7));
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString();
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getMonthName = (monthString) => {
    const [year, month] = monthString.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long' });
  };

  if (statsLoading || uploadsLoading || workbooksLoading) {
    return (
      <MonthlyViewContainer>
        <LoadingSpinner>
          <div className="spinner"></div>
          <span style={{ marginLeft: '1rem' }}>Loading monthly data...</span>
        </LoadingSpinner>
      </MonthlyViewContainer>
    );
  }

  const stats = [
    {
      title: 'Files Uploaded',
      value: monthlyStats?.totalFiles || 0,
      icon: <FileText size={24} color="#3b82f6" />,
      bgColor: 'rgba(59, 130, 246, 0.1)',
      change: 'This month',
      positive: true
    },
    {
      title: 'Workbooks Processed',
      value: monthlyStats?.totalWorkbooks || 0,
      icon: <BarChart3 size={24} color="#10b981" />,
      bgColor: 'rgba(16, 185, 129, 0.1)',
      change: 'This month',
      positive: true
    },
    {
      title: 'Data Records',
      value: monthlyStats?.totalRecords ? `${(monthlyStats.totalRecords / 1000).toFixed(1)}K` : '0',
      icon: <Activity size={24} color="#f59e0b" />,
      bgColor: 'rgba(245, 158, 11, 0.1)',
      change: 'This month',
      positive: true
    },
    {
      title: 'Processing Rate',
      value: '100%',
      icon: <TrendingUp size={24} color="#8b5cf6" />,
      bgColor: 'rgba(139, 92, 246, 0.1)',
      change: 'This month',
      positive: true
    }
  ];

  return (
    <MonthlyViewContainer>
      <PageTitle>Monthly Data View</PageTitle>
      <PageSubtitle>
        Comprehensive view of data uploaded and processed for {getMonthName(currentMonth)}
      </PageSubtitle>
      
      <MonthNavigation>
        <MonthDisplay>
          <Calendar size={24} color="#3b82f6" />
          <MonthText>{getMonthName(currentMonth)}</MonthText>
        </MonthDisplay>
        
        <NavigationButtons>
          <NavButton onClick={() => navigateMonth(-1)}>
            <ChevronLeft size={16} />
          </NavButton>
          <NavButton onClick={() => navigateMonth(1)}>
            <ChevronRight size={16} />
          </NavButton>
        </NavigationButtons>
      </MonthNavigation>
      
      <StatsGrid>
        {stats.map((stat, index) => (
          <StatCard key={index}>
            <StatHeader>
              <StatTitle>{stat.title}</StatTitle>
              <StatIcon bgColor={stat.bgColor}>
                {stat.icon}
              </StatIcon>
            </StatHeader>
            <StatValue>{stat.value}</StatValue>
            <StatChange positive={stat.positive}>
              {stat.change}
            </StatChange>
          </StatCard>
        ))}
      </StatsGrid>

      <ContentGrid>
        <DataSection>
          <SectionHeader>
            <SectionTitle>Uploaded Files</SectionTitle>
            <SectionActions>
              <ActionButton>
                <Filter size={16} />
                Filter
              </ActionButton>
              <ActionButton>
                <Download size={16} />
                Export
              </ActionButton>
            </SectionActions>
          </SectionHeader>
          
          <DataTable>
            {monthlyUploads?.length === 0 ? (
              <EmptyState>
                <FileText size={48} color="#9ca3af" />
                <p>No files uploaded in {getMonthName(currentMonth)}</p>
              </EmptyState>
            ) : (
              <Table>
                <thead>
                  <tr>
                    <Th>File Name</Th>
                    <Th>Type</Th>
                    <Th>Size</Th>
                    <Th>Status</Th>
                    <Th>Upload Date</Th>
                  </tr>
                </thead>
                <tbody>
                  {monthlyUploads?.map((upload) => (
                    <tr key={upload.id}>
                      <Td>{upload.original_name}</Td>
                      <Td>{upload.file_type}</Td>
                      <Td>{formatFileSize(upload.file_size)}</Td>
                      <Td>
                        <span style={{
                          padding: '0.25rem 0.5rem',
                          borderRadius: '0.25rem',
                          fontSize: '0.75rem',
                          fontWeight: '500',
                          backgroundColor: upload.status === 'completed' ? '#dcfce7' : '#fef3c7',
                          color: upload.status === 'completed' ? '#166534' : '#92400e'
                        }}>
                          {upload.status}
                        </span>
                      </Td>
                      <Td>{formatDate(upload.upload_date)}</Td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            )}
          </DataTable>
        </DataSection>

        <DataSection>
          <SectionHeader>
            <SectionTitle>Data Analytics</SectionTitle>
          </SectionHeader>
          
          <div style={{ padding: '1.5rem' }}>
            <ChartPlaceholder>
              <div style={{ textAlign: 'center' }}>
                <PieChart size={48} color="#9ca3af" />
                <p>Monthly Data Distribution</p>
                <p style={{ fontSize: '0.75rem', marginTop: '0.5rem' }}>
                  Chart visualization coming soon
                </p>
              </div>
            </ChartPlaceholder>
          </div>
        </DataSection>
      </ContentGrid>

      <DataSection>
        <SectionHeader>
          <SectionTitle>Processed Workbooks</SectionTitle>
          <SectionActions>
            <ActionButton>
              <Download size={16} />
              Export All
            </ActionButton>
          </SectionActions>
        </SectionHeader>
        
        <DataTable>
          {monthlyWorkbooks?.length === 0 ? (
            <EmptyState>
              <BarChart3 size={48} color="#9ca3af" />
              <p>No workbooks processed in {getMonthName(currentMonth)}</p>
            </EmptyState>
          ) : (
            <Table>
              <thead>
                <tr>
                  <Th>Workbook Name</Th>
                  <Th>Sheets</Th>
                  <Th>Total Rows</Th>
                  <Th>Total Columns</Th>
                  <Th>Created</Th>
                </tr>
              </thead>
              <tbody>
                {monthlyWorkbooks?.map((workbook) => (
                  <tr key={workbook.id}>
                    <Td>{workbook.workbook_name}</Td>
                    <Td>{workbook.sheet_count}</Td>
                    <Td>{workbook.total_rows?.toLocaleString()}</Td>
                    <Td>{workbook.total_columns}</Td>
                    <Td>{formatDate(workbook.created_at)}</Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </DataTable>
      </DataSection>
    </MonthlyViewContainer>
  );
};

export default MonthlyView; 