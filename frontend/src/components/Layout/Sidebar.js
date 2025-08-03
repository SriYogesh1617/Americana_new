import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import styled from 'styled-components';
import { 
  Home, 
  Upload, 
  FileSpreadsheet, 
  BarChart3, 
  Settings,
  Database,
  Calendar,
  Download,
  Search,
  Grid,
  Package
} from 'lucide-react';

const SidebarContainer = styled.aside`
  width: 250px;
  background-color: #1e293b;
  color: white;
  display: flex;
  flex-direction: column;
  min-height: 100vh;
`;

const Logo = styled.div`
  padding: 1.5rem 1rem;
  border-bottom: 1px solid #334155;
`;

const LogoText = styled.h1`
  font-size: 1.5rem;
  font-weight: bold;
  color: #3b82f6;
  margin: 0;
`;

const Navigation = styled.nav`
  flex: 1;
  padding: 1rem 0;
`;

const NavItem = styled(Link)`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem 1rem;
  color: ${props => props.$isActive ? '#3b82f6' : '#cbd5e1'};
  background-color: ${props => props.$isActive ? 'rgba(59, 130, 246, 0.1)' : 'transparent'};
  text-decoration: none;
  transition: all 0.2s ease-in-out;
  border-right: ${props => props.$isActive ? '3px solid #3b82f6' : '3px solid transparent'};
  
  &:hover {
    background-color: rgba(59, 130, 246, 0.1);
    color: #3b82f6;
  }
`;

const NavText = styled.span`
  font-size: 0.875rem;
  font-weight: 500;
`;

const NavSection = styled.div`
  margin-bottom: 1.5rem;
`;

const SectionTitle = styled.h3`
  font-size: 0.75rem;
  font-weight: 600;
  color: #64748b;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  padding: 0 1rem;
  margin-bottom: 0.5rem;
`;

const Footer = styled.div`
  padding: 1rem;
  border-top: 1px solid #334155;
  margin-top: auto;
`;

const Version = styled.div`
  font-size: 0.75rem;
  color: #64748b;
  text-align: center;
`;

const Sidebar = () => {
  const location = useLocation();
  
  const isActive = (path) => {
    if (path === '/' && location.pathname === '/') return true;
    if (path !== '/' && location.pathname.startsWith(path)) return true;
    return false;
  };

  return (
    <SidebarContainer>
      <Logo>
        <LogoText>Americana</LogoText>
      </Logo>
      
      <Navigation>
        <NavSection>
          <SectionTitle>Main</SectionTitle>
          <NavItem 
            to="/" 
            $isActive={isActive('/')}
          >
            <Home size={18} />
            <NavText>Dashboard</NavText>
          </NavItem>
          
          <NavItem 
            to="/upload" 
            $isActive={isActive('/upload')}
          >
            <Upload size={18} />
            <NavText>Upload Files</NavText>
          </NavItem>
        </NavSection>
        
        <NavSection>
          <SectionTitle>Data</SectionTitle>
          <NavItem 
            to="/workbooks" 
            $isActive={isActive('/workbooks')}
          >
            <FileSpreadsheet size={18} />
            <NavText>Workbooks</NavText>
          </NavItem>
          
          <NavItem 
            to="/analytics" 
            $isActive={isActive('/analytics')}
          >
            <BarChart3 size={18} />
            <NavText>Analytics</NavText>
          </NavItem>
          
          <NavItem 
            to="/database" 
            $isActive={isActive('/database')}
          >
            <Database size={18} />
            <NavText>Database</NavText>
          </NavItem>
          
          <NavItem 
            to="/monthly" 
            $isActive={isActive('/monthly')}
          >
            <Calendar size={18} />
            <NavText>Monthly View</NavText>
          </NavItem>
          
          <NavItem 
            to="/demand" 
            $isActive={isActive('/demand')}
          >
            <Download size={18} />
            <NavText>Demand Templates</NavText>
          </NavItem>
          
          <NavItem 
            to="/demand-cursor" 
            $isActive={isActive('/demand-cursor')}
          >
            <Search size={18} />
            <NavText>Filtered Demand</NavText>
          </NavItem>
          
          <NavItem 
            to="/cursor-data" 
            $isActive={isActive('/cursor-data')}
          >
            <Grid size={18} />
            <NavText>Cursor Data</NavText>
          </NavItem>
          
          <NavItem 
            to="/t01-data" 
            $isActive={isActive('/t01-data')}
          >
            <BarChart3 size={18} />
            <NavText>T01 Data</NavText>
          </NavItem>
          <NavItem 
            to="/t02-data" 
            $isActive={isActive('/t02-data')}
          >
            <BarChart3 size={18} />
            <NavText>T02 Data</NavText>
          </NavItem>
          <NavItem 
            to="/t03-data" 
            $isActive={isActive('/t03-data')}
          >
            <BarChart3 size={18} />
            <NavText>T03 Data</NavText>
          </NavItem>
          <NavItem 
            to="/t04-data" 
            $isActive={isActive('/t04-data')}
          >
            <BarChart3 size={18} />
            <NavText>T04 WHBal</NavText>
          </NavItem>
          
          <NavItem 
            to="/item-master" 
            $isActive={isActive('/item-master')}
          >
            <Package size={18} />
            <NavText>Item Master</NavText>
          </NavItem>
        </NavSection>
        
        <NavSection>
          <SectionTitle>System</SectionTitle>
          <NavItem 
            to="/settings" 
            $isActive={isActive('/settings')}
          >
            <Settings size={18} />
            <NavText>Settings</NavText>
          </NavItem>
        </NavSection>
      </Navigation>
      
      <Footer>
        <Version>v1.0.0</Version>
      </Footer>
    </SidebarContainer>
  );
};

export default Sidebar; 