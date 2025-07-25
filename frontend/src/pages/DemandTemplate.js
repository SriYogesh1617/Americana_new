import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import styled from 'styled-components';
import { 
  FileSpreadsheet, 
  Download, 
  Plus,
  Calendar,
  Database,
  Settings,
  Play
} from 'lucide-react';
import { demandAPI, downloadFile } from '../services/api';
import toast from 'react-hot-toast';

const Container = styled.div`
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem;
`;

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
`;

const Title = styled.h1`
  font-size: 2rem;
  font-weight: bold;
  color: #1e293b;
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const ActionButtons = styled.div`
  display: flex;
  gap: 1rem;
`;

const Button = styled.button`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 0.5rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  
  &:hover {
    transform: translateY(-1px);
  }
`;

const PrimaryButton = styled(Button)`
  background: #3b82f6;
  color: white;
  
  &:hover {
    background: #2563eb;
  }
`;

const SecondaryButton = styled(Button)`
  background: #f3f4f6;
  color: #374151;
  border: 1px solid #d1d5db;
  
  &:hover {
    background: #e5e7eb;
  }
`;

const TemplatesGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
  gap: 1.5rem;
  margin-bottom: 2rem;
`;

const TemplateCard = styled.div`
  background: white;
  border-radius: 0.75rem;
  box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1);
  border: 1px solid #e5e7eb;
  overflow: hidden;
  transition: all 0.2s ease-in-out;
  
  &:hover {
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
    transform: translateY(-2px);
  }
`;

const CardHeader = styled.div`
  padding: 1.5rem;
  border-bottom: 1px solid #e5e7eb;
`;

const TemplateName = styled.h3`
  font-size: 1.25rem;
  font-weight: 600;
  color: #1e293b;
  margin: 0;
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const TemplateMeta = styled.div`
  margin-top: 0.5rem;
  color: #6b7280;
  font-size: 0.875rem;
`;

const CardBody = styled.div`
  padding: 1.5rem;
`;

const SheetList = styled.div`
  margin-bottom: 1rem;
`;

const SheetItem = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem;
  background: #f9fafb;
  border-radius: 0.375rem;
  margin-bottom: 0.5rem;
  font-size: 0.875rem;
  color: #374151;
`;

const CardActions = styled.div`
  display: flex;
  gap: 0.5rem;
  padding: 1.5rem;
  border-top: 1px solid #e5e7eb;
`;

const ExecuteButton = styled(Button)`
  background: #059669;
  color: white;
  
  &:hover {
    background: #047857;
  }
`;

const ExportHistory = styled.div`
  background: white;
  border-radius: 0.75rem;
  box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1);
  border: 1px solid #e5e7eb;
  padding: 1.5rem;
`;

const HistoryTitle = styled.h2`
  font-size: 1.5rem;
  font-weight: 600;
  color: #1e293b;
  margin-bottom: 1rem;
`;

const HistoryList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`;

const HistoryItem = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem;
  background: #f9fafb;
  border-radius: 0.375rem;
  font-size: 0.875rem;
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

const DemandTemplate = () => {
  const queryClient = useQueryClient();
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [monthData, setMonthData] = useState(null);

  // Fetch demand templates
  const { data: templates, isLoading: templatesLoading } = useQuery(
    'demand-templates',
    () => demandAPI.getDemandTemplates()
  );

  // Fetch export history
  const { data: exportHistory, isLoading: historyLoading } = useQuery(
    'demand-export-history',
    () => demandAPI.getDemandExportHistory()
  );

  // Check month data
  const checkMonthData = useMutation(
    ({ month, year }) => demandAPI.checkMonthData(month, year),
    {
      onSuccess: (data) => {
        setMonthData(data);
        if (data.exists) {
          toast.success(data.message);
        } else {
          toast.error(data.message);
        }
      },
      onError: (error) => {
        toast.error('Failed to check month data');
        console.error('Error checking month data:', error);
      }
    }
  );



  // Execute template mutation
  const executeTemplate = useMutation(
    ({ templateId, month, year }) => demandAPI.executeDemandTemplate(templateId, month, year),
    {
      onSuccess: (blob, variables) => {
        // Download the file using utility function
        const filename = `Demand_Template_${variables.month}_${variables.year}.xlsm`;
        downloadFile(blob, filename);
        
        toast.success('Demand template downloaded successfully!');
        queryClient.invalidateQueries('demand-export-history');
      },
      onError: (error) => {
        toast.error('Failed to download demand template');
        console.error('Error downloading template:', error);
      }
    }
  );



  const handleExecuteTemplate = (templateId) => {
    console.log('Executing template:', templateId, 'for month:', selectedMonth, 'year:', selectedYear);
    
    // Check if this template matches the selected month/year
    const template = templates.find(t => t.id === templateId);
    const selectedMonthNum = selectedMonth.split('-')[1];
    const selectedYearNum = parseInt(selectedYear);
    
    if (template.upload_month && template.upload_year) {
      if (template.upload_month === selectedMonthNum && template.upload_year === selectedYearNum) {
        // Data exists for this month - proceed with download
        executeTemplate.mutate({
          templateId,
          month: selectedMonth,
          year: selectedYear
        });
      } else {
        // No data for this month - show error
        toast.error(`No data available for ${selectedMonthNum}/${selectedYearNum}. Please upload ZIP file for this month.`);
      }
    } else {
      // Template doesn't have month/year data - show error
      toast.error('This template does not have month/year data. Please upload a ZIP file.');
    }
  };

  const handleCheckMonthData = () => {
    const month = selectedMonth.split('-')[1];
    const year = parseInt(selectedYear);
    checkMonthData.mutate({ month, year });
  };

  const isTemplateForSelectedMonth = (template) => {
    if (!template.upload_month || !template.upload_year) return false;
    const selectedMonthNum = selectedMonth.split('-')[1];
    const selectedYearNum = parseInt(selectedYear);
    return template.upload_month === selectedMonthNum && template.upload_year === selectedYearNum;
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

  if (templatesLoading || historyLoading) {
    return (
      <Container>
        <LoadingState>
          <div className="spinner" />
          <span style={{ marginLeft: '1rem' }}>Loading demand templates...</span>
        </LoadingState>
      </Container>
    );
  }

  return (
    <Container>
      <Header>
        <Title>
          <FileSpreadsheet size={32} color="#3b82f6" />
          Download Final ETL Model File
        </Title>

      </Header>

      {templates && templates.length > 0 ? (
        <TemplatesGrid>
            {templates.map((template) => (
            <TemplateCard key={template.id}>
              <CardHeader>
                <TemplateName>
                  <Database size={20} />
                  Download Final XLSM File
                </TemplateName>

              </CardHeader>

              <CardBody>
                <SheetList>
                  <h4>Template Sheets:</h4>
                  <SheetItem>
                    <FileSpreadsheet size={16} />
                    T_01
                  </SheetItem>
                  <SheetItem>
                    <FileSpreadsheet size={16} />
                    T_02
                  </SheetItem>
                  <SheetItem>
                    <FileSpreadsheet size={16} />
                    T_03
                  </SheetItem>
                  <SheetItem>
                    <FileSpreadsheet size={16} />
                    T_04
                  </SheetItem>
                </SheetList>

                <div style={{ marginBottom: '1rem' }}>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem' }}>
                    Month:
                  </label>
                  <input
                    type="month"
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(e.target.value)}
                    style={{
                      padding: '0.5rem',
                      border: '1px solid #d1d5db',
                      borderRadius: '0.375rem',
                      width: '100%'
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem' }}>
                    Year:
                  </label>
                  <input
                    type="number"
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(e.target.value)}
                    style={{
                      padding: '0.5rem',
                      border: '1px solid #d1d5db',
                      borderRadius: '0.375rem',
                      width: '100%'
                    }}
                  />
                </div>



                {template.export_count > 0 && (
                  <div style={{ 
                    marginTop: '0.5rem', 
                    padding: '0.5rem', 
                    background: '#f0fdf4', 
                    borderRadius: '0.375rem',
                    fontSize: '0.875rem',
                    color: '#059669'
                  }}>
                    <strong>Exports:</strong> {template.export_count} times
                  </div>
                )}
              </CardBody>

              <CardActions>
                <ExecuteButton
                  onClick={() => handleExecuteTemplate(template.id)}
                  disabled={executeTemplate.isLoading || !isTemplateForSelectedMonth(template)}
                  style={{ 
                    width: '100%',
                    opacity: isTemplateForSelectedMonth(template) ? 1 : 0.5
                  }}
                >
                  <Download size={16} />
                  {executeTemplate.isLoading ? 'Downloading...' : 
                   isTemplateForSelectedMonth(template) ? 'Download XLSM' : 'No Data for Selected Month'}
                </ExecuteButton>
              </CardActions>
            </TemplateCard>
          ))}
        </TemplatesGrid>
      ) : (
        <EmptyState>
          <FileSpreadsheet size={64} color="#9ca3af" style={{ marginBottom: '1rem' }} />
          <h3>No demand templates found</h3>
          <p>Upload a ZIP file to automatically create demand templates.</p>
          <div style={{ marginTop: '1rem', textAlign: 'center' }}>
            <p style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '1rem' }}>
              Select month and year, then click "Check Month Data" to see if data exists.
            </p>
            <SecondaryButton onClick={handleCheckMonthData}>
              <Calendar size={16} />
              Check Month Data
            </SecondaryButton>
          </div>
        </EmptyState>
      )}

      <ExportHistory>
        <HistoryTitle>
          <Download size={24} style={{ marginRight: '0.5rem' }} />
          Export History
        </HistoryTitle>
        
        {exportHistory && exportHistory.length > 0 ? (
          <HistoryList>
            {exportHistory.map((exportJob) => (
              <HistoryItem key={exportJob.id}>
                <div>
                  <strong>{exportJob.template_name}</strong>
                  <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                    {exportJob.month} {exportJob.year} • {formatDate(exportJob.created_at)}
                  </div>
                </div>
                <div style={{ color: exportJob.status === 'completed' ? '#059669' : '#dc2626' }}>
                  {exportJob.status}
                </div>
              </HistoryItem>
            ))}
          </HistoryList>
        ) : (
          <EmptyState>
            <p>No export history found</p>
          </EmptyState>
        )}
      </ExportHistory>
    </Container>
  );
};

export default DemandTemplate; 