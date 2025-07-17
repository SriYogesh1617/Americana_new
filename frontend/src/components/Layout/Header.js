import React from 'react';
import styled from 'styled-components';
import { Search, Bell, User } from 'lucide-react';

const HeaderContainer = styled.header`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem 1.5rem;
  background-color: white;
  border-bottom: 1px solid #e5e7eb;
  box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1);
`;

const SearchContainer = styled.div`
  display: flex;
  align-items: center;
  flex: 1;
  max-width: 500px;
  margin: 0 2rem;
`;

const SearchInput = styled.input`
  width: 100%;
  padding: 0.5rem 1rem 0.5rem 2.5rem;
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
  width: 1rem;
  height: 1rem;
  color: #6b7280;
`;

const SearchInputWrapper = styled.div`
  position: relative;
  flex: 1;
`;

const ActionButtons = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
`;

const ActionButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0.5rem;
  border: none;
  background-color: transparent;
  border-radius: 0.375rem;
  cursor: pointer;
  transition: background-color 0.2s;
  
  &:hover {
    background-color: #f3f4f6;
  }
`;

const UserInfo = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem;
  border-radius: 0.375rem;
  cursor: pointer;
  transition: background-color 0.2s;
  
  &:hover {
    background-color: #f3f4f6;
  }
`;

const UserName = styled.span`
  font-size: 0.875rem;
  font-weight: 500;
  color: #374151;
`;

const Header = () => {
  return (
    <HeaderContainer>
      <SearchContainer>
        <SearchInputWrapper>
          <SearchIcon />
          <SearchInput 
            type="text" 
            placeholder="Search workbooks, worksheets, or data..." 
          />
        </SearchInputWrapper>
      </SearchContainer>
      
      <ActionButtons>
        <ActionButton title="Notifications">
          <Bell size={20} color="#6b7280" />
        </ActionButton>
        
        <UserInfo>
          <User size={20} color="#6b7280" />
          <UserName>Admin User</UserName>
        </UserInfo>
      </ActionButtons>
    </HeaderContainer>
  );
};

export default Header; 