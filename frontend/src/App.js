import React from 'react';
import { Routes, Route } from 'react-router-dom';
import styled from 'styled-components';
import Header from './components/Layout/Header';
import Sidebar from './components/Layout/Sidebar';
import Dashboard from './pages/Dashboard';
import Upload from './pages/Upload';
import Workbooks from './pages/Workbooks';
import WorkbookDetail from './pages/WorkbookDetail';
import WorksheetDetail from './pages/WorksheetDetail';
import DatabasePage from './pages/Database';
import MonthlyView from './pages/MonthlyView';
import DemandTemplate from './pages/DemandTemplate';

const AppContainer = styled.div`
  display: flex;
  min-height: 100vh;
  background-color: #f8fafc;
`;

const MainContent = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
`;

const ContentArea = styled.main`
  flex: 1;
  padding: 1.5rem;
  overflow-y: auto;
`;

function App() {
  return (
    <AppContainer>
      <Sidebar />
      <MainContent>
        <Header />
        <ContentArea>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/upload" element={<Upload />} />
            <Route path="/workbooks" element={<Workbooks />} />
            <Route path="/workbooks/:workbookId" element={<WorkbookDetail />} />
            <Route path="/worksheets/:worksheetId" element={<WorksheetDetail />} />
            <Route path="/database" element={<DatabasePage />} />
            <Route path="/monthly" element={<MonthlyView />} />
            <Route path="/demand" element={<DemandTemplate />} />
          </Routes>
        </ContentArea>
      </MainContent>
    </AppContainer>
  );
}

export default App; 