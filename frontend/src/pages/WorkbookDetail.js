import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from 'react-query';
import styled from 'styled-components';
import { 
  ArrowLeft,
  FileSpreadsheet, 
  Download, 
  Calendar,
  Database,
  Layers,
  BarChart3,
  Eye,
  Settings
} from 'lucide-react';
import { dataAPI, exportAPI, downloadFile } from '../services/api';
import toast from 'react-hot-toast';

const Container = styled.div`
  max-width: 1200px;
  margin: 0 auto;
`;

const Header = styled.div`
  margin-bottom: 2rem;
`;

const BackButton = styled(Link)`
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  color: #6b7280;
  text-decoration: none;
  margin-bottom: 1rem;
  
  &:hover {
    color: #3b82f6;
  }
`;

const TitleSection = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 1.5rem;
`;

const TitleGroup = styled.div`
  flex: 1;
`;

const WorkbookTitle = styled.h1`
  font-size: 2rem;
  font-weight: bold;
  color: #1e293b;
  margin-bottom: 0.5rem;
  display: flex;
  align-items: center;
  gap: 0.75rem;
`;

const Subtitle = styled.div`
  color: #6b7280;
  font-size: 1rem;
  margin-bottom: 1rem;
`;

const MetaInfo = styled.div`
  display: flex;
  gap: 2rem;
  font-size: 0.875rem;
  color: #6b7280;
`;

const MetaItem = styled.div`
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
  padding: 0.75rem 1.5rem;
  border: 1px solid #d1d5db;
  background: white;
  border-radius: 0.5rem;
  color: #374151;
  cursor: pointer;
  transition: all 0.2s;
  
  &:hover {
    background: #f9fafb;
    border-color: #3b82f6;
    color: #3b82f6;
  }
`;

const PrimaryButton = styled.button`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1.5rem;
  background: #3b82f6;
  color: white;
  border: none;
  border-radius: 0.5rem;
  cursor: pointer;
  transition: all 0.2s;
  
  &:hover {
    background: #2563eb;
  }
`;

const StatsSection = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
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
  items-center;
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
  font-size: 1.875rem;
  font-weight: bold;
  color: #1e293b;
`;

const WorksheetsSection = styled.div`
  background: white;
  border-radius: 0.75rem;
  box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1);
  border: 1px solid #e5e7eb;
  overflow: hidden;
`;

const SectionHeader = styled.div`
  padding: 1.5rem;
  border-bottom: 1px solid #f3f4f6;
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const SectionTitle = styled.h2`
  font-size: 1.25rem;
  font-weight: 600;
  color: #1e293b;
`;

const WorksheetsList = styled.div`
  padding: 1.5rem;
`;

const WorksheetItem = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem;
  border: 1px solid #e5e7eb;
  border-radius: 0.5rem;
  margin-bottom: 1rem;
  transition: all 0.2s;
  
  &:hover {
    border-color: #3b82f6;
    box-shadow: 0 1px 3px 0 rgba(59, 130, 246, 0.1);
  }
  
  &:last-child {
    margin-bottom: 0;
  }
`;

const WorksheetInfo = styled.div`
  flex: 1;
`;

const WorksheetName = styled.h4`
  font-size: 1rem;
  font-weight: 500;
  color: #1e293b;
  margin-bottom: 0.25rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const WorksheetMeta = styled.div`
  font-size: 0.875rem;
  color: #6b7280;
  display: flex;
  gap: 1rem;
`;

const WorksheetActions = styled.div`
  display: flex;
  gap: 0.5rem;
`;

const SmallButton = styled.button`
  display: flex;
  align-items: center;
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

const ViewWorksheetButton = styled(Link)`
  display: flex;
  align-items: center;
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

const ErrorState = styled.div`
  text-align: center;
  padding: 3rem 1rem;
  color: #6b7280;
`;

const WorkbookDetail = () => {
  const { workbookId } = useParams();

  const { data: workbook, isLoading, error } = useQuery(
    ['workbook', workbookId],
    () => dataAPI.getWorkbook(workbookId),
    {
      enabled: !!workbookId
    }
  );

  const handleExport = async (format = 'xlsx') => {
    try {
      toast.loading('Preparing export...');
      const blob = await exportAPI.exportWorkbook(workbookId, format);
      downloadFile(blob, `${workbook.workbook_name}.${format}`);
      toast.dismiss();
      toast.success('Export completed!');
    } catch (error) {
      toast.dismiss();
      toast.error('Export failed');
      console.error('Export error:', error);
    }
  };

  const handleWorksheetExport = async (worksheetId, worksheetName, format = 'xlsx') => {
    try {
      toast.loading('Preparing worksheet export...');
      const blob = await exportAPI.exportWorksheet(worksheetId, format);
      downloadFile(blob, `${worksheetName}.${format}`);
      toast.dismiss();
      toast.success('Worksheet exported!');
    } catch (error) {
      toast.dismiss();
      toast.error('Export failed');
      console.error('Export error:', error);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (isLoading) {
    return (
      <Container>
        <LoadingState>
          <div className="spinner" />
          <span style={{ marginLeft: '1rem' }}>Loading workbook...</span>
        </LoadingState>
      </Container>
    );
  }

  if (error || !workbook) {
    return (
      <Container>
        <ErrorState>
          <h3>Workbook not found</h3>
          <p>The requested workbook could not be loaded.</p>
          <Link to="/workbooks" style={{ color: '#3b82f6', marginTop: '1rem', display: 'inline-block' }}>
            ← Back to Workbooks
          </Link>
        </ErrorState>
      </Container>
    );
  }

  const stats = [
    {
      title: 'Total Sheets',
      value: workbook.sheet_count || 0,
      icon: <Layers size={24} color="#3b82f6" />,
      bgColor: 'rgba(59, 130, 246, 0.1)'
    },
    {
      title: 'Total Rows',
      value: (workbook.total_rows || 0).toLocaleString(),
      icon: <Database size={24} color="#10b981" />,
      bgColor: 'rgba(16, 185, 129, 0.1)'
    },
    {
      title: 'Total Columns',
      value: workbook.total_columns || 0,
      icon: <BarChart3 size={24} color="#f59e0b" />,
      bgColor: 'rgba(245, 158, 11, 0.1)'
    }
  ];

  return (
    <Container>
      <Header>
        <BackButton to="/workbooks">
          <ArrowLeft size={16} />
          Back to Workbooks
        </BackButton>

        <TitleSection>
          <TitleGroup>
            <WorkbookTitle>
              <FileSpreadsheet size={32} color="#3b82f6" />
              {workbook.workbook_name}
            </WorkbookTitle>
            <Subtitle>From file: {workbook.file_name}</Subtitle>
            <MetaInfo>
              <MetaItem>
                <Calendar size={16} />
                Created: {formatDate(workbook.upload_date)}
              </MetaItem>
              <MetaItem>
                <Database size={16} />
                File ID: {workbook.file_id}
              </MetaItem>
            </MetaInfo>
          </TitleGroup>

          <Actions>
            <ActionButton onClick={() => handleExport('csv')}>
              <Download size={16} />
              Export CSV
            </ActionButton>
            <ActionButton onClick={() => handleExport('xlsm')}>
              <Download size={16} />
              Export XLSM
            </ActionButton>
            <PrimaryButton onClick={() => handleExport('xlsx')}>
              <Download size={16} />
              Export XLSX
            </PrimaryButton>
          </Actions>
        </TitleSection>
      </Header>

      <StatsSection>
        {stats.map((stat, index) => (
          <StatCard key={index}>
            <StatHeader>
              <StatTitle>{stat.title}</StatTitle>
              <StatIcon bgColor={stat.bgColor}>
                {stat.icon}
              </StatIcon>
            </StatHeader>
            <StatValue>{stat.value}</StatValue>
          </StatCard>
        ))}
      </StatsSection>

      <WorksheetsSection>
        <SectionHeader>
          <SectionTitle>Worksheets ({workbook.worksheets?.length || 0})</SectionTitle>
          <ActionButton>
            <Settings size={16} />
            Manage
          </ActionButton>
        </SectionHeader>

        <WorksheetsList>
          {workbook.worksheets?.map((worksheet) => (
            <WorksheetItem key={worksheet.id}>
              <WorksheetInfo>
                <WorksheetName>
                  <FileSpreadsheet size={16} color="#6b7280" />
                  {worksheet.sheet_name}
                </WorksheetName>
                <WorksheetMeta>
                  <span>{worksheet.row_count?.toLocaleString() || 0} rows</span>
                  <span>{worksheet.column_count || 0} columns</span>
                  <span>Sheet {worksheet.sheet_index + 1}</span>
                </WorksheetMeta>
              </WorksheetInfo>

              <WorksheetActions>
                <SmallButton
                  onClick={() => handleWorksheetExport(worksheet.id, worksheet.sheet_name, 'csv')}
                >
                  <Download size={14} />
                  CSV
                </SmallButton>
                <SmallButton
                  onClick={() => handleWorksheetExport(worksheet.id, worksheet.sheet_name, 'xlsx')}
                >
                  <Download size={14} />
                  Excel
                </SmallButton>
                <ViewWorksheetButton to={`/worksheets/${worksheet.id}`}>
                  <Eye size={14} />
                  View Data
                </ViewWorksheetButton>
              </WorksheetActions>
            </WorksheetItem>
          ))}
        </WorksheetsList>
      </WorksheetsSection>
    </Container>
  );
};

export default WorkbookDetail; 