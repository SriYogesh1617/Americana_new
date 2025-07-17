import React, { useState } from 'react';
import { useDropzone } from 'react-dropzone';
import styled from 'styled-components';
import { Upload as UploadIcon, File, CheckCircle, AlertCircle, X } from 'lucide-react';
import { useMutation, useQuery } from 'react-query';
import toast from 'react-hot-toast';
import { uploadAPI } from '../services/api';

const UploadContainer = styled.div`
  max-width: 800px;
  margin: 0 auto;
`;

const PageTitle = styled.h1`
  font-size: 2rem;
  font-weight: bold;
  color: #1e293b;
  margin-bottom: 2rem;
`;

const UploadCard = styled.div`
  background: white;
  border-radius: 1rem;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
  padding: 2rem;
  margin-bottom: 2rem;
`;

const DropzoneArea = styled.div`
  border: 2px dashed ${props => props.isDragActive ? '#3b82f6' : '#d1d5db'};
  border-radius: 0.75rem;
  padding: 3rem 1rem;
  text-align: center;
  background-color: ${props => props.isDragActive ? 'rgba(59, 130, 246, 0.05)' : '#fafafa'};
  transition: all 0.2s ease-in-out;
  cursor: pointer;
  
  &:hover {
    border-color: #3b82f6;
    background-color: rgba(59, 130, 246, 0.05);
  }
`;

const UploadIconWrapper = styled.div`
  display: flex;
  justify-content: center;
  margin-bottom: 1rem;
`;

const UploadText = styled.div`
  font-size: 1.125rem;
  font-weight: 500;
  color: #374151;
  margin-bottom: 0.5rem;
`;

const UploadSubtext = styled.div`
  font-size: 0.875rem;
  color: #6b7280;
  margin-bottom: 1rem;
`;

const SupportedFormats = styled.div`
  font-size: 0.75rem;
  color: #9ca3af;
`;

const SelectedFiles = styled.div`
  margin-top: 2rem;
`;

const FileList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
`;

const FileItem = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem;
  background-color: #f9fafb;
  border: 1px solid #e5e7eb;
  border-radius: 0.5rem;
`;

const FileInfo = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex: 1;
`;

const FileDetails = styled.div`
  display: flex;
  flex-direction: column;
`;

const FileName = styled.div`
  font-weight: 500;
  color: #374151;
`;

const FileSize = styled.div`
  font-size: 0.875rem;
  color: #6b7280;
`;

const FileActions = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const RemoveButton = styled.button`
  padding: 0.25rem;
  border: none;
  background: transparent;
  color: #6b7280;
  cursor: pointer;
  border-radius: 0.25rem;
  
  &:hover {
    background-color: #f3f4f6;
    color: #ef4444;
  }
`;

const UploadButton = styled.button`
  width: 100%;
  padding: 0.75rem 1.5rem;
  background-color: #3b82f6;
  color: white;
  border: none;
  border-radius: 0.5rem;
  font-weight: 500;
  cursor: pointer;
  margin-top: 1rem;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  
  &:hover:not(:disabled) {
    background-color: #2563eb;
  }
  
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const ProgressBar = styled.div`
  width: 100%;
  height: 0.5rem;
  background-color: #e5e7eb;
  border-radius: 0.25rem;
  overflow: hidden;
  margin-top: 0.5rem;
`;

const ProgressFill = styled.div`
  height: 100%;
  background-color: #3b82f6;
  width: ${props => props.progress}%;
  transition: width 0.3s ease-in-out;
`;

const RecentUploads = styled.div`
  background: white;
  border-radius: 1rem;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
  padding: 2rem;
`;

const SectionTitle = styled.h2`
  font-size: 1.25rem;
  font-weight: 600;
  color: #1e293b;
  margin-bottom: 1rem;
`;

const UploadHistoryItem = styled.div`
  display: flex;
  align-items: center;
  justify-content: between;
  padding: 1rem;
  border: 1px solid #e5e7eb;
  border-radius: 0.5rem;
  margin-bottom: 0.75rem;
  
  &:last-child {
    margin-bottom: 0;
  }
`;

const StatusIcon = styled.div`
  margin-right: 0.75rem;
`;

const UploadInfo = styled.div`
  flex: 1;
`;

const UploadName = styled.div`
  font-weight: 500;
  color: #374151;
`;

const UploadTime = styled.div`
  font-size: 0.875rem;
  color: #6b7280;
`;

const StatusBadge = styled.span`
  padding: 0.25rem 0.75rem;
  border-radius: 9999px;
  font-size: 0.75rem;
  font-weight: 500;
  background-color: ${props => {
    switch (props.status) {
      case 'completed': return '#dcfce7';
      case 'processing': return '#fef3c7';
      case 'failed': return '#fee2e2';
      default: return '#f3f4f6';
    }
  }};
  color: ${props => {
    switch (props.status) {
      case 'completed': return '#166534';
      case 'processing': return '#92400e';
      case 'failed': return '#991b1b';
      default: return '#374151';
    }
  }};
`;

const Upload = () => {
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [uploadProgress, setUploadProgress] = useState({});

  const { data: recentUploads, refetch } = useQuery(
    'recent-uploads',
    () => uploadAPI.getUploads(1, 10)
  );

  const uploadMutation = useMutation(
    (file) => uploadAPI.uploadFile(file, (progress) => {
      setUploadProgress(prev => ({ ...prev, [file.name]: progress }));
    }),
    {
      onSuccess: (data) => {
        toast.success('File uploaded successfully!');
        setSelectedFiles([]);
        setUploadProgress({});
        refetch();
      },
      onError: (error) => {
        toast.error(error.message || 'Upload failed');
        setUploadProgress({});
      }
    }
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: {
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel.sheet.macroEnabled.12': ['.xlsm'],
      'application/vnd.ms-excel': ['.xls'],
      'application/zip': ['.zip']
    },
    maxSize: 100 * 1024 * 1024, // 100MB
    onDrop: (acceptedFiles) => {
      setSelectedFiles(prev => [...prev, ...acceptedFiles]);
    }
  });

  const removeFile = (index) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleUpload = async () => {
    for (const file of selectedFiles) {
      try {
        await uploadMutation.mutateAsync(file);
      } catch (error) {
        console.error(`Upload failed for ${file.name}:`, error);
      }
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed':
        return <CheckCircle size={16} color="#10b981" />;
      case 'processing':
        return <div className="spinner" />;
      case 'failed':
        return <AlertCircle size={16} color="#ef4444" />;
      default:
        return <File size={16} color="#6b7280" />;
    }
  };

  return (
    <UploadContainer>
      <PageTitle>Upload Files</PageTitle>
      
      <UploadCard>
        <div {...getRootProps()}>
          <input {...getInputProps()} />
          <DropzoneArea isDragActive={isDragActive}>
            <UploadIconWrapper>
              <UploadIcon size={48} color={isDragActive ? '#3b82f6' : '#6b7280'} />
            </UploadIconWrapper>
            <UploadText>
              {isDragActive ? 'Drop files here' : 'Drag & drop files here, or click to select'}
            </UploadText>
            <UploadSubtext>
              Upload Excel files or ZIP archives containing multiple Excel files
            </UploadSubtext>
            <SupportedFormats>
              Supported formats: .xlsx, .xlsm, .xls, .zip (Max size: 100MB)
            </SupportedFormats>
          </DropzoneArea>
        </div>

        {selectedFiles.length > 0 && (
          <SelectedFiles>
            <SectionTitle>Selected Files ({selectedFiles.length})</SectionTitle>
            <FileList>
              {selectedFiles.map((file, index) => (
                <FileItem key={index}>
                  <FileInfo>
                    <File size={20} color="#6b7280" />
                    <FileDetails>
                      <FileName>{file.name}</FileName>
                      <FileSize>{formatFileSize(file.size)}</FileSize>
                    </FileDetails>
                  </FileInfo>
                  <FileActions>
                    {uploadProgress[file.name] && (
                      <div style={{ width: '100px', marginRight: '0.5rem' }}>
                        <ProgressBar>
                          <ProgressFill progress={uploadProgress[file.name]} />
                        </ProgressBar>
                      </div>
                    )}
                    <RemoveButton onClick={() => removeFile(index)}>
                      <X size={16} />
                    </RemoveButton>
                  </FileActions>
                </FileItem>
              ))}
            </FileList>
            
            <UploadButton 
              onClick={handleUpload}
              disabled={uploadMutation.isLoading || selectedFiles.length === 0}
            >
              {uploadMutation.isLoading ? (
                <>
                  <div className="spinner" />
                  Uploading...
                </>
              ) : (
                <>
                  <UploadIcon size={18} />
                  Upload {selectedFiles.length} file{selectedFiles.length !== 1 ? 's' : ''}
                </>
              )}
            </UploadButton>
          </SelectedFiles>
        )}
      </UploadCard>

      <RecentUploads>
        <SectionTitle>Recent Uploads</SectionTitle>
        {recentUploads?.files?.map((upload) => (
          <UploadHistoryItem key={upload.id}>
            <StatusIcon>
              {getStatusIcon(upload.status)}
            </StatusIcon>
            <UploadInfo>
              <UploadName>{upload.original_name}</UploadName>
              <UploadTime>
                {new Date(upload.upload_date).toLocaleString()} • {formatFileSize(upload.file_size)}
              </UploadTime>
            </UploadInfo>
            <StatusBadge status={upload.status}>
              {upload.status}
            </StatusBadge>
          </UploadHistoryItem>
        ))}
      </RecentUploads>
    </UploadContainer>
  );
};

export default Upload; 