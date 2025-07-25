import React, { useState } from 'react';
import { useQuery } from 'react-query';
import styled from 'styled-components';
import { 
  Database, 
  Table, 
  FileText, 
  Calendar,
  Download,
  Eye,
  Edit,
  Trash2,
  ChevronRight,
  ChevronDown
} from 'lucide-react';
import { dataAPI, uploadAPI } from '../services/api';

const DatabaseContainer = styled.div`
  max-width: 1200px;
  margin: 0 auto;
`;

const PageTitle = styled.h1`
  font-size: 2rem;
  font-weight: bold;
  color: #1e293b;
  margin-bottom: 2rem;
`;

const StatsGrid = styled.div`
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
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 1rem;
`;

const StatIcon = styled.div`
  padding: 0.5rem;
  border-radius: 0.5rem;
  background-color: ${props => props.bgColor || '#f3f4f6'};
`;

const StatContent = styled.div`
  flex: 1;
`;

const StatTitle = styled.h3`
  font-size: 0.875rem;
  font-weight: 500;
  color: #6b7280;
  text-transform: uppercase;
  letter-spacing: 0.05em;
`;

const StatValue = styled.div`
  font-size: 1.5rem;
  font-weight: bold;
  color: #1e293b;
`;

const TablesSection = styled.div`
  background: white;
  border-radius: 0.75rem;
  box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1);
  border: 1px solid #e5e7eb;
  margin-bottom: 2rem;
`;

const SectionHeader = styled.div`
  padding: 1.5rem;
  border-bottom: 1px solid #e5e7eb;
`;

const SectionTitle = styled.h2`
  font-size: 1.25rem;
  font-weight: 600;
  color: #1e293b;
  margin-bottom: 0.5rem;
`;

const SectionSubtitle = styled.p`
  color: #6b7280;
  font-size: 0.875rem;
`;

const TableList = styled.div`
  padding: 1.5rem;
`;

const TableItem = styled.div`
  border: 1px solid #e5e7eb;
  border-radius: 0.5rem;
  margin-bottom: 1rem;
  overflow: hidden;
`;

const TableHeader = styled.div`
  background: #f9fafb;
  padding: 1rem 1.5rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
  cursor: pointer;
  transition: background-color 0.2s;
  
  &:hover {
    background: #f3f4f6;
  }
`;

const TableInfo = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
`;

const TableName = styled.div`
  font-weight: 600;
  color: #1e293b;
`;

const TableDescription = styled.div`
  font-size: 0.875rem;
  color: #6b7280;
`;

const TableStats = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
  font-size: 0.875rem;
  color: #6b7280;
`;

const TableContent = styled.div`
  padding: 1.5rem;
  border-top: 1px solid #e5e7eb;
  display: ${props => props.isExpanded ? 'block' : 'none'};
`;

const DataTable = styled.div`
  overflow-x: auto;
`;

const DataTableElement = styled.table`
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

const ActionButtons = styled.div`
  display: flex;
  gap: 0.5rem;
  margin-top: 1rem;
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
  
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const SearchBar = styled.div`
  display: flex;
  gap: 1rem;
  margin-bottom: 1rem;
`;

const SearchInput = styled.input`
  flex: 1;
  padding: 0.75rem;
  border: 1px solid #e5e7eb;
  border-radius: 0.375rem;
  font-size: 0.875rem;
  
  &:focus {
    outline: none;
    border-color: #3b82f6;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  }
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

const DatabasePage = () => {
  const [expandedTables, setExpandedTables] = useState({});
  const [searchTerm, setSearchTerm] = useState('');

  // Fetch database statistics
  const { data: dashboardStats, isLoading: statsLoading } = useQuery(
    'dashboard-stats',
    () => dataAPI.getDashboardStats()
  );

  // Fetch recent uploads
  const { data: recentUploads, isLoading: uploadsLoading } = useQuery(
    'recent-uploads',
    () => uploadAPI.getUploads(1, 10)
  );

  // Fetch workbooks
  const { data: workbooks, isLoading: workbooksLoading } = useQuery(
    'workbooks',
    () => dataAPI.getWorkbooks(1, 20)
  );

  // Fetch worksheets
  const { data: worksheets, isLoading: worksheetsLoading } = useQuery(
    'worksheets',
    () => dataAPI.getAllWorksheets(1, 20)
  );

  // Fetch database schema
  const { data: schema, isLoading: schemaLoading } = useQuery(
    'database-schema',
    () => dataAPI.getDatabaseSchema()
  );

  const toggleTable = (tableName) => {
    setExpandedTables(prev => ({
      ...prev,
      [tableName]: !prev[tableName]
    }));
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString();
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  if (statsLoading || uploadsLoading || workbooksLoading || worksheetsLoading || schemaLoading) {
    return (
      <DatabaseContainer>
        <LoadingSpinner>
          <div className="spinner"></div>
          <span style={{ marginLeft: '1rem' }}>Loading database...</span>
        </LoadingSpinner>
      </DatabaseContainer>
    );
  }

  const databaseTables = [
    {
      name: 'uploaded_files',
      title: 'Uploaded Files',
      description: 'Files uploaded by users',
      icon: <FileText size={20} color="#3b82f6" />,
      data: recentUploads?.files || [],
      columns: [
        { key: 'original_name', label: 'File Name' },
        { key: 'file_type', label: 'Type' },
        { key: 'file_size', label: 'Size', formatter: formatFileSize },
        { key: 'status', label: 'Status' },
        { key: 'upload_date', label: 'Upload Date', formatter: formatDate }
      ]
    },
    {
      name: 'workbooks',
      title: 'Workbooks',
      description: 'Excel workbooks processed from uploaded files',
      icon: <Table size={20} color="#10b981" />,
      data: workbooks?.workbooks || [],
      columns: [
        { key: 'workbook_name', label: 'Workbook Name' },
        { key: 'sheet_count', label: 'Sheets' },
        { key: 'total_rows', label: 'Total Rows' },
        { key: 'total_columns', label: 'Total Columns' },
        { key: 'created_at', label: 'Created', formatter: formatDate }
      ]
    },
    {
      name: 'worksheets',
      title: 'Worksheets',
      description: 'Individual sheets within workbooks',
      icon: <FileText size={20} color="#f59e0b" />,
      data: worksheets?.worksheets || [],
      columns: [
        { key: 'sheet_name', label: 'Sheet Name' },
        { key: 'sheet_index', label: 'Index' },
        { key: 'row_count', label: 'Rows' },
        { key: 'column_count', label: 'Columns' },
        { key: 'created_at', label: 'Created', formatter: formatDate }
      ]
    }
  ];

  const filteredTables = databaseTables.filter(table =>
    table.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    table.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <DatabaseContainer>
      <PageTitle>Database</PageTitle>
      
      <StatsGrid>
        <StatCard>
          <StatHeader>
            <StatIcon bgColor="rgba(59, 130, 246, 0.1)">
              <Database size={24} color="#3b82f6" />
            </StatIcon>
            <StatContent>
              <StatTitle>Total Files</StatTitle>
              <StatValue>{dashboardStats?.totalFiles || 0}</StatValue>
            </StatContent>
          </StatHeader>
        </StatCard>
        
        <StatCard>
          <StatHeader>
            <StatIcon bgColor="rgba(16, 185, 129, 0.1)">
              <Table size={24} color="#10b981" />
            </StatIcon>
            <StatContent>
              <StatTitle>Total Workbooks</StatTitle>
              <StatValue>{dashboardStats?.totalWorkbooks || 0}</StatValue>
            </StatContent>
          </StatHeader>
        </StatCard>
        
        <StatCard>
          <StatHeader>
            <StatIcon bgColor="rgba(245, 158, 11, 0.1)">
              <FileText size={24} color="#f59e0b" />
            </StatIcon>
            <StatContent>
              <StatTitle>Data Records</StatTitle>
              <StatValue>{dashboardStats?.totalRecords ? `${(dashboardStats.totalRecords / 1000).toFixed(1)}K` : '0'}</StatValue>
            </StatContent>
          </StatHeader>
        </StatCard>
        
        <StatCard>
          <StatHeader>
            <StatIcon bgColor="rgba(139, 92, 246, 0.1)">
              <Calendar size={24} color="#8b5cf6" />
            </StatIcon>
            <StatContent>
              <StatTitle>Processing Rate</StatTitle>
              <StatValue>{dashboardStats?.processingRate || 0}%</StatValue>
            </StatContent>
          </StatHeader>
        </StatCard>
      </StatsGrid>

      <TablesSection>
        <SectionHeader>
          <SectionTitle>Database Tables</SectionTitle>
          <SectionSubtitle>
            Explore the data stored in your database tables
          </SectionSubtitle>
        </SectionHeader>
        
        <TableList>
          <SearchBar>
            <SearchInput
              type="text"
              placeholder="Search tables..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </SearchBar>
          
          {filteredTables.length === 0 ? (
            <EmptyState>
              <Database size={48} color="#9ca3af" />
              <p>No tables found matching your search.</p>
            </EmptyState>
          ) : (
            filteredTables.map((table) => (
              <TableItem key={table.name}>
                <TableHeader onClick={() => toggleTable(table.name)}>
                  <TableInfo>
                    {table.icon}
                    <div>
                      <TableName>{table.title}</TableName>
                      <TableDescription>{table.description}</TableDescription>
                    </div>
                  </TableInfo>
                  <TableStats>
                    <span>{table.data.length} records</span>
                    {expandedTables[table.name] ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                  </TableStats>
                </TableHeader>
                
                <TableContent isExpanded={expandedTables[table.name]}>
                  {table.data.length === 0 ? (
                    <EmptyState>
                      <p>No data available in this table.</p>
                    </EmptyState>
                  ) : (
                    <>
                                             <DataTable>
                         <DataTableElement>
                           <thead>
                             <tr>
                               {table.columns.map((column) => (
                                 <Th key={column.key}>{column.label}</Th>
                               ))}
                             </tr>
                           </thead>
                           <tbody>
                             {table.data.map((row, index) => (
                               <tr key={row.id || index}>
                                 {table.columns.map((column) => (
                                   <Td key={column.key}>
                                     {column.formatter 
                                       ? column.formatter(row[column.key])
                                       : row[column.key] || '-'
                                     }
                                   </Td>
                                 ))}
                               </tr>
                             ))}
                           </tbody>
                         </DataTableElement>
                       </DataTable>
                      
                      <ActionButtons>
                        <ActionButton>
                          <Eye size={16} />
                          View Details
                        </ActionButton>
                        <ActionButton>
                          <Download size={16} />
                          Export
                        </ActionButton>
                        <ActionButton>
                          <Edit size={16} />
                          Edit
                        </ActionButton>
                        <ActionButton>
                          <Trash2 size={16} />
                          Delete
                        </ActionButton>
                      </ActionButtons>
                    </>
                  )}
                </TableContent>
              </TableItem>
            ))
          )}
        </TableList>
      </TablesSection>

      {/* Database Schema Section */}
      {schema && (
        <TablesSection>
          <SectionHeader>
            <SectionTitle>Database Schema</SectionTitle>
            <SectionSubtitle>
              Structure and relationships of database tables
            </SectionSubtitle>
          </SectionHeader>
          
          <TableList>
            {schema.map((table) => (
              <TableItem key={table.table}>
                <TableHeader onClick={() => toggleTable(`schema_${table.table}`)}>
                  <TableInfo>
                    <Database size={20} color="#8b5cf6" />
                    <div>
                      <TableName>{table.table}</TableName>
                      <TableDescription>{table.description}</TableDescription>
                    </div>
                  </TableInfo>
                  <TableStats>
                    <span>{table.columns.length} columns</span>
                    {expandedTables[`schema_${table.table}`] ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                  </TableStats>
                </TableHeader>
                
                <TableContent isExpanded={expandedTables[`schema_${table.table}`]}>
                                     <DataTable>
                     <DataTableElement>
                       <thead>
                         <tr>
                           <Th>Column Name</Th>
                           <Th>Type</Th>
                           <Th>Description</Th>
                         </tr>
                       </thead>
                       <tbody>
                         {table.columns.map((column, index) => (
                           <tr key={index}>
                             <Td>
                               <strong>{column.name}</strong>
                             </Td>
                             <Td>
                               <code>{column.type}</code>
                             </Td>
                             <Td>{column.description}</Td>
                           </tr>
                         ))}
                       </tbody>
                     </DataTableElement>
                   </DataTable>
                </TableContent>
              </TableItem>
            ))}
          </TableList>
        </TablesSection>
      )}
    </DatabaseContainer>
  );
};

export default DatabasePage; 