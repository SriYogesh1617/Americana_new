import React, { useState } from 'react';
import { useQuery } from 'react-query';
import styled from 'styled-components';
import { 
  FileSpreadsheet, 
  Upload, 
  Database, 
  TrendingUp,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import { dataAPI } from '../services/api';

const DashboardContainer = styled.div`
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

const RecentActivity = styled.div`
  background: white;
  padding: 1.5rem;
  border-radius: 0.75rem;
  box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1);
  border: 1px solid #e5e7eb;
`;

const SectionTitle = styled.h2`
  font-size: 1.25rem;
  font-weight: 600;
  color: #1e293b;
  margin-bottom: 1rem;
`;

const ActivityList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1rem;
`;

const ActivityItem = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem;
  background-color: #f9fafb;
  border-radius: 0.5rem;
  border: 1px solid #e5e7eb;
`;

const ActivityIcon = styled.div`
  padding: 0.5rem;
  border-radius: 0.5rem;
  background-color: ${props => props.bgColor || '#f3f4f6'};
  display: flex;
  align-items: center;
  justify-content: center;
`;

const ActivityContent = styled.div`
  flex: 1;
`;

const ActivityTitle = styled.div`
  font-weight: 500;
  color: #1e293b;
  margin-bottom: 0.25rem;
`;

const ActivityTime = styled.div`
  font-size: 0.875rem;
  color: #6b7280;
`;

const QuickActions = styled.div`
  background: white;
  padding: 1.5rem;
  border-radius: 0.75rem;
  box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1);
  border: 1px solid #e5e7eb;
`;

const ActionButton = styled.button`
  width: 100%;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 1rem;
  margin-bottom: 0.75rem;
  background: #f9fafb;
  border: 1px solid #e5e7eb;
  border-radius: 0.5rem;
  cursor: pointer;
  transition: all 0.2s;
  
  &:hover {
    background: #f3f4f6;
    border-color: #3b82f6;
  }
  
  &:last-child {
    margin-bottom: 0;
  }
`;

const ActionText = styled.span`
  font-weight: 500;
  color: #374151;
`;

const LoadingSpinner = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  height: 200px;
  color: #6b7280;
`;

const MonthSelector = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 2rem;
  background: white;
  padding: 1rem 1.5rem;
  border-radius: 0.75rem;
  box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1);
  border: 1px solid #e5e7eb;
`;

const MonthLabel = styled.label`
  font-weight: 500;
  color: #374151;
`;

const MonthInput = styled.input`
  padding: 0.5rem;
  border: 1px solid #e5e7eb;
  border-radius: 0.375rem;
  font-size: 0.875rem;
  
  &:focus {
    outline: none;
    border-color: #3b82f6;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  }
`;

const MonthlyComparison = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 1.5rem;
  margin-bottom: 2rem;
`;

const ComparisonCard = styled.div`
  background: white;
  padding: 1.5rem;
  border-radius: 0.75rem;
  box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1);
  border: 1px solid #e5e7eb;
`;

const ComparisonHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1rem;
`;

const ComparisonTitle = styled.h3`
  font-size: 1rem;
  font-weight: 600;
  color: #1e293b;
`;

const ComparisonValue = styled.div`
  font-size: 2rem;
  font-weight: bold;
  color: #1e293b;
  margin-bottom: 0.5rem;
`;

const ComparisonChange = styled.div`
  font-size: 0.875rem;
  color: ${props => props.positive ? '#059669' : '#dc2626'};
  display: flex;
  align-items: center;
  gap: 0.25rem;
`;

const Dashboard = () => {
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM format
  
  const { data: dashboardStats, isLoading: statsLoading } = useQuery(
    'dashboard-stats',
    () => dataAPI.getDashboardStats()
  );

  const { data: monthlyStats, isLoading: monthlyStatsLoading } = useQuery(
    ['monthly-stats', selectedMonth],
    () => dataAPI.getMonthlyStats(selectedMonth)
  );

  const { data: recentActivities, isLoading: activitiesLoading } = useQuery(
    'recent-activities',
    () => dataAPI.getRecentActivities(5)
  );

  const stats = [
    {
      title: 'Total Workbooks',
      value: dashboardStats?.totalWorkbooks || 0,
      icon: <FileSpreadsheet size={24} color="#3b82f6" />,
      bgColor: 'rgba(59, 130, 246, 0.1)',
      change: '+12%',
      positive: true
    },
    {
      title: 'Files Uploaded',
      value: dashboardStats?.totalFiles || 0,
      icon: <Upload size={24} color="#10b981" />,
      bgColor: 'rgba(16, 185, 129, 0.1)',
      change: '+8%',
      positive: true
    },
    {
      title: 'Data Records',
      value: dashboardStats?.totalRecords ? `${(dashboardStats.totalRecords / 1000).toFixed(1)}K` : '0',
      icon: <Database size={24} color="#f59e0b" />,
      bgColor: 'rgba(245, 158, 11, 0.1)',
      change: '+24%',
      positive: true
    },
    {
      title: 'Processing Rate',
      value: `${dashboardStats?.processingRate || 0}%`,
      icon: <TrendingUp size={24} color="#8b5cf6" />,
      bgColor: 'rgba(139, 92, 246, 0.1)',
      change: '+2.1%',
      positive: true
    }
  ];

  // Transform recent activities data
  const transformedActivities = recentActivities?.map(activity => ({
    title: activity.title,
    time: new Date(activity.time).toLocaleString(),
    icon: activity.status === 'completed' || activity.status === 'completed' ? 
      <CheckCircle size={16} color="#10b981" /> : 
      <AlertCircle size={16} color="#ef4444" />,
    bgColor: activity.status === 'completed' || activity.status === 'completed' ? 
      'rgba(16, 185, 129, 0.1)' : 
      'rgba(239, 68, 68, 0.1)'
  })) || [];

  if (statsLoading || activitiesLoading || monthlyStatsLoading) {
    return (
      <DashboardContainer>
        <LoadingSpinner>
          <div className="spinner"></div>
          <span style={{ marginLeft: '1rem' }}>Loading dashboard...</span>
        </LoadingSpinner>
      </DashboardContainer>
    );
  }

  return (
    <DashboardContainer>
      <PageTitle>Dashboard</PageTitle>
      
      <MonthSelector>
        <MonthLabel htmlFor="month-selector">Select Month:</MonthLabel>
        <MonthInput
          id="month-selector"
          type="month"
          value={selectedMonth}
          onChange={(e) => setSelectedMonth(e.target.value)}
        />
      </MonthSelector>
      
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
              {stat.change} from last month
            </StatChange>
          </StatCard>
        ))}
      </StatsGrid>

      {monthlyStats && (
        <MonthlyComparison>
          <ComparisonCard>
            <ComparisonHeader>
              <ComparisonTitle>This Month's Data</ComparisonTitle>
            </ComparisonHeader>
            <ComparisonValue>{monthlyStats.totalFiles || 0}</ComparisonValue>
            <ComparisonChange positive={true}>
              Files uploaded this month
            </ComparisonChange>
          </ComparisonCard>
          
          <ComparisonCard>
            <ComparisonHeader>
              <ComparisonTitle>Monthly Workbooks</ComparisonTitle>
            </ComparisonHeader>
            <ComparisonValue>{monthlyStats.totalWorkbooks || 0}</ComparisonValue>
            <ComparisonChange positive={true}>
              Workbooks processed this month
            </ComparisonChange>
          </ComparisonCard>
          
          <ComparisonCard>
            <ComparisonHeader>
              <ComparisonTitle>Monthly Records</ComparisonTitle>
            </ComparisonHeader>
            <ComparisonValue>{monthlyStats.totalRecords ? `${(monthlyStats.totalRecords / 1000).toFixed(1)}K` : '0'}</ComparisonValue>
            <ComparisonChange positive={true}>
              Data records this month
            </ComparisonChange>
          </ComparisonCard>
        </MonthlyComparison>
      )}

      <ContentGrid>
        <RecentActivity>
          <SectionTitle>Recent Activity</SectionTitle>
          <ActivityList>
            {transformedActivities.map((activity, index) => (
              <ActivityItem key={index}>
                <ActivityIcon bgColor={activity.bgColor}>
                  {activity.icon}
                </ActivityIcon>
                <ActivityContent>
                  <ActivityTitle>{activity.title}</ActivityTitle>
                  <ActivityTime>{activity.time}</ActivityTime>
                </ActivityContent>
              </ActivityItem>
            ))}
          </ActivityList>
        </RecentActivity>

        <QuickActions>
          <SectionTitle>Quick Actions</SectionTitle>
          <ActionButton>
            <Upload size={20} color="#3b82f6" />
            <ActionText>Upload New File</ActionText>
          </ActionButton>
          <ActionButton>
            <FileSpreadsheet size={20} color="#3b82f6" />
            <ActionText>View All Workbooks</ActionText>
          </ActionButton>
          <ActionButton>
            <Database size={20} color="#3b82f6" />
            <ActionText>Export Data</ActionText>
          </ActionButton>
          <ActionButton>
            <TrendingUp size={20} color="#3b82f6" />
            <ActionText>View Analytics</ActionText>
          </ActionButton>
        </QuickActions>
      </ContentGrid>
    </DashboardContainer>
  );
};

export default Dashboard; 