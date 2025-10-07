import React, { useState, useEffect, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import {
  Box,
  Typography,
  Button,
  LinearProgress,
  IconButton,
  Paper,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
  Fab,
  Stepper,
  Step,
  StepLabel,
  StepContent,
} from '@mui/material';
import {
  CloudUpload as UploadIcon,
  Delete as DeleteIcon,
  InsertDriveFile as FileIcon,
  CheckCircle as SuccessIcon,
  Error as ErrorIcon,
  Close as CloseIcon,
  Refresh as ProcessingIcon,
  HourglassEmpty as QueuedIcon,
  Add as AddIcon,
  Check as CheckIcon,
} from '@mui/icons-material';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-hot-toast';
import { projectsAPI } from '../../services/api/projects';

const FileUploadComponent = ({ 
  projectId, 
  onUploadComplete
}) => {
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [currentJob, setCurrentJob] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [selectedFile, setSelectedFile] = useState(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [stepStatuses, setStepStatuses] = useState({
    upload: 'pending',
    queue: 'pending', 
    processing: 'pending',
    complete: 'pending'
  });
  const [errorMessage, setErrorMessage] = useState(null);
  const [errorTimeout, setErrorTimeout] = useState(null);

  // Reset dialog state to initial values
  const resetDialogState = () => {
    setSelectedFile(null);
    setCurrentJob(null);
    setUploading(false);
    setCurrentStep(0);
    setStepStatuses({
      upload: 'pending',
      queue: 'pending',
      processing: 'pending',
      complete: 'pending'
    });
    setErrorMessage(null);
    if (errorTimeout) {
      clearTimeout(errorTimeout);
      setErrorTimeout(null);
    }
  };

  // Show error message with auto-clear
  const showError = (message) => {
    setErrorMessage(message);
    // Clear any existing timeout
    if (errorTimeout) {
      clearTimeout(errorTimeout);
    }
    // Set new timeout to clear error after 5 seconds
    const timeout = setTimeout(() => {
      setErrorMessage(null);
      setErrorTimeout(null);
    }, 5000);
    setErrorTimeout(timeout);
  };

  // Handle dialog close
  const handleDialogClose = () => {
    if (!uploading) {
      resetDialogState();
      setUploadModalOpen(false);
    }
  };

  // Poll for job status when modal is open and job is active
  useEffect(() => {
    let interval;
    if (uploadModalOpen && currentJob && ['queued', 'processing'].includes(currentJob.status)) {
      interval = setInterval(() => {
        pollJobStatus();
      }, 2000); // Poll every 2 seconds
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [uploadModalOpen, currentJob]);



  const pollJobStatus = async () => {
    if (!currentJob || !currentJob.file_id) return;
    
    try {
      const updatedJob = await projectsAPI.getFileAIJob(currentJob.file_id);
      console.log('Polling job status:', updatedJob);
      setCurrentJob(updatedJob);
      
      // Update steps based on job status
      updateStepsFromJob(updatedJob);
      
      // Handle completion
      if (updatedJob.status === 'done') {
        setStepStatuses(prev => ({ ...prev, complete: 'completed' }));
        setCurrentStep(3);
        toast.success('🎉 AI processing completed! Work items have been generated.');
        
        setTimeout(() => {
          resetDialogState();
          setUploadModalOpen(false);
          if (onUploadComplete) {
            onUploadComplete(updatedJob);
          }
        }, 3000);
      } else if (updatedJob.status === 'failed') {
        setStepStatuses(prev => ({ 
          ...prev, 
          processing: 'error',
          complete: 'error'
        }));
        toast.error('❌ AI processing failed. Please try again.');
      }
    } catch (error) {
      console.error('Failed to poll job status:', error);
      // If job doesn't exist yet, keep trying
      if (error.response?.status === 404) {
        console.log('Job not found yet, will continue polling...');
      }
    }
  };

  const updateStepsFromJob = (job) => {
    const progress = job.progress || 0;
    console.log('Updating steps from job:', job.status, progress);
    
    setStepStatuses(prev => ({
      ...prev,
      upload: 'completed',
      queue: job.status === 'queued' ? 'active' : 
             job.status === 'processing' || job.status === 'done' ? 'completed' : 'pending',
      processing: job.status === 'processing' ? 'active' : 
                 job.status === 'done' ? 'completed' : 
                 job.status === 'failed' ? 'error' : 'pending',
      complete: job.status === 'done' ? 'completed' : 
                job.status === 'failed' ? 'error' : 'pending'
    }));

    if (job.status === 'queued') {
      setCurrentStep(1);
    } else if (job.status === 'processing') {
      setCurrentStep(2);
    } else if (job.status === 'done') {
      setCurrentStep(3);
    }
  };

  const onDrop = useCallback((acceptedFiles, rejectedFiles) => {
    if (rejectedFiles.length > 0) {
      const rejection = rejectedFiles[0];
      if (rejection.errors.some(e => e.code === 'file-too-large')) {
        showError('File size exceeds 10MB limit. Please choose a smaller file.');
      } else if (rejection.errors.some(e => e.code === 'file-invalid-type')) {
        showError('Only PDF, DOC, and DOCX files are supported. Please choose a different file type.');
      } else {
        showError('File selection error. Please try choosing a different file.');
      }
      return;
    }

    if (acceptedFiles.length > 0) {
      const file = acceptedFiles[0];
      console.log('File selected:', file.name, file.size, file.type);
      setSelectedFile(file);
      // Clear any previous error when a valid file is selected
      setErrorMessage(null);
      if (errorTimeout) {
        clearTimeout(errorTimeout);
        setErrorTimeout(null);
      }
    }
  }, [errorTimeout]);

  const handleUpload = async () => {
    if (!selectedFile) return;

    try {
      setUploading(true);
      setCurrentStep(0);
      setStepStatuses({
        upload: 'active',
        queue: 'pending',
        processing: 'pending',
        complete: 'pending'
      });

      // Upload the file directly (API creates FormData internally)
      const response = await projectsAPI.uploadFile(projectId, selectedFile);

      // Upload completed
      setStepStatuses(prev => ({ ...prev, upload: 'completed', queue: 'active' }));
      setCurrentStep(1);
      toast.success(`${selectedFile.name} uploaded successfully!`);

      // Get the AI job for this file
      try {
        const job = await projectsAPI.getFileAIJob(response.id);
        setCurrentJob(job);
        updateStepsFromJob(job);
      } catch (error) {
        // Job might not be created yet, will be polled
        console.log('Job not found yet, will poll for updates');
        setCurrentJob({ file_id: response.id, status: 'queued', progress: 0 });
        setStepStatuses(prev => ({ ...prev, queue: 'active' }));
        setCurrentStep(1);
      }

    } catch (error) {
      console.error('Upload failed:', error);
      setStepStatuses(prev => ({ ...prev, upload: 'error' }));
      
      // Show user-friendly error message in dialog
      const errorDetail = error.response?.data?.detail || error.message;
      showError(errorDetail);
    } finally {
      setUploading(false);
    }
  };

  const handleRetry = () => {
    resetDialogState();
  };





  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'application/msword': ['.doc'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx']
    },
    maxFiles: 1,
    maxSize: 10 * 1024 * 1024 // 10MB
  });

  return (
    <Box sx={{ 
      width: '100%',
      '& @keyframes spin': {
        '0%': { transform: 'rotate(0deg)' },
        '100%': { transform: 'rotate(360deg)' }
      }
    }}>
      {/* Upload Button - Always show for multi-file support */}
      <Button
          variant="outlined"
          onClick={() => setUploadModalOpen(true)}
          startIcon={<AddIcon />}
          sx={{ 
            textTransform: 'none', 
            minWidth: 140, 
            fontWeight: 600, 
            fontSize: '1rem', 
            borderColor: 'primary.main', 
            color: 'primary.main', 
            boxShadow: 0,
            '&:hover': { 
              borderColor: 'primary.dark', 
              bgcolor: 'action.hover' 
            }
          }}
        >
          Upload File
        </Button>

      {/* Upload Modal */}
      <Dialog
        open={uploadModalOpen}
        onClose={handleDialogClose}
        maxWidth="sm"
        fullWidth
        disableEscapeKeyDown={uploading}
        PaperProps={{
          sx: {
            borderRadius: 3,
            boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
            bgcolor: 'background.paper',
          }
        }}
      >
        <DialogTitle sx={{ pb: 1, pt: 3, textAlign: 'center' }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <Box sx={{ 
              width: 48, 
              height: 48, 
              borderRadius: '50%', 
              bgcolor: 'primary.main', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              mb: 1
            }}>
              <FileIcon sx={{ fontSize: 24, color: 'white' }} />
            </Box>
            <Typography variant="h6" sx={{ fontWeight: 600, color: 'text.primary' }}>
              Upload Document
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Generate AI-powered work items
            </Typography>
          </Box>
        </DialogTitle>
        <DialogContent sx={{ px: 3, pb: 1 }}>
          {/* Compact Stepper */}
          <Box sx={{ my: 2 }}>
            <Stepper 
              activeStep={currentStep} 
              alternativeLabel
              sx={{
                '& .MuiStepConnector-root': {
                  top: 12,
                  left: 'calc(-50% + 12px)',
                  right: 'calc(50% + 12px)',
                },
                '& .MuiStepConnector-line': {
                  borderColor: 'divider',
                  borderTopWidth: 1,
                },
                '& .MuiStepLabel-label': {
                  fontSize: '0.75rem',
                  fontWeight: 500,
                  mt: 0.5,
                }
              }}
            >
              <Step>
                <StepLabel 
                  error={stepStatuses.upload === 'error'}
                  StepIconComponent={() => (
                    <Box
                      sx={{
                        width: 24,
                        height: 24,
                        borderRadius: '50%',
                        bgcolor: stepStatuses.upload === 'completed' ? 'success.main' :
                                 stepStatuses.upload === 'active' ? 'primary.main' :
                                 stepStatuses.upload === 'error' ? 'error.main' : 'grey.300',
                        color: 'white',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: stepStatuses.upload === 'active' ? '0 0 0 3px rgba(25, 118, 210, 0.2)' : 'none',
                        transition: 'all 0.3s ease',
                      }}
                    >
                      {stepStatuses.upload === 'completed' ? <CheckIcon sx={{ fontSize: 14 }} /> :
                       stepStatuses.upload === 'active' ? <UploadIcon sx={{ fontSize: 14 }} /> :
                       stepStatuses.upload === 'error' ? <ErrorIcon sx={{ fontSize: 14 }} /> : '1'}
                    </Box>
                  )}
                >
                  Upload
                </StepLabel>
              </Step>
              <Step>
                <StepLabel
                  error={stepStatuses.queue === 'error'}
                  StepIconComponent={() => (
                    <Box
                      sx={{
                        width: 24,
                        height: 24,
                        borderRadius: '50%',
                        bgcolor: stepStatuses.queue === 'completed' ? 'success.main' :
                                 stepStatuses.queue === 'active' ? 'primary.main' :
                                 stepStatuses.queue === 'error' ? 'error.main' : 'grey.300',
                        color: 'white',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: stepStatuses.queue === 'active' ? '0 0 0 4px rgba(25, 118, 210, 0.2)' : 'none',
                        transition: 'all 0.3s ease',
                      }}
                    >
                      {stepStatuses.queue === 'completed' ? <CheckIcon sx={{ fontSize: 14 }} /> :
                       stepStatuses.queue === 'active' ? <QueuedIcon sx={{ fontSize: 14 }} /> :
                       stepStatuses.queue === 'error' ? <ErrorIcon sx={{ fontSize: 14 }} /> : '2'}
                    </Box>
                  )}
                >
                  Queue
                </StepLabel>
              </Step>
              <Step>
                <StepLabel
                  error={stepStatuses.processing === 'error'}
                  StepIconComponent={() => (
                    <Box
                      sx={{
                        width: 24,
                        height: 24,
                        borderRadius: '50%',
                        bgcolor: stepStatuses.processing === 'completed' ? 'success.main' :
                                 stepStatuses.processing === 'active' ? 'primary.main' :
                                 stepStatuses.processing === 'error' ? 'error.main' : 'grey.300',
                        color: 'white',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: stepStatuses.processing === 'active' ? '0 0 0 4px rgba(25, 118, 210, 0.2)' : 'none',
                        transition: 'all 0.3s ease',
                      }}
                    >
                      {stepStatuses.processing === 'completed' ? <CheckIcon sx={{ fontSize: 14 }} /> :
                       stepStatuses.processing === 'active' ? <ProcessingIcon sx={{ fontSize: 14, animation: 'spin 2s linear infinite' }} /> :
                       stepStatuses.processing === 'error' ? <ErrorIcon sx={{ fontSize: 14 }} /> : '3'}
                    </Box>
                  )}
                >
                  Processing ({currentJob?.progress || 0}%)
                </StepLabel>
              </Step>
              <Step>
                <StepLabel
                  error={stepStatuses.complete === 'error'}
                  StepIconComponent={() => (
                    <Box
                      sx={{
                        width: 24,
                        height: 24,
                        borderRadius: '50%',
                        bgcolor: stepStatuses.complete === 'completed' ? 'success.main' :
                                 stepStatuses.complete === 'active' ? 'primary.main' :
                                 stepStatuses.complete === 'error' ? 'error.main' : 'grey.300',
                        color: 'white',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: stepStatuses.complete === 'active' ? '0 0 0 4px rgba(25, 118, 210, 0.2)' : 'none',
                        transition: 'all 0.3s ease',
                      }}
                    >
                      {stepStatuses.complete === 'completed' ? <CheckIcon sx={{ fontSize: 14 }} /> : '4'}
                    </Box>
                  )}
                >
                  Complete
                </StepLabel>
              </Step>
            </Stepper>
          </Box>

          {/* Error Message Display */}
          {errorMessage && (
            <Alert 
              severity="error" 
              sx={{ 
                mb: 2,
                borderRadius: 2,
                '& .MuiAlert-icon': {
                  fontSize: '1.1rem'
                }
              }}
              onClose={() => {
                setErrorMessage(null);
                if (errorTimeout) {
                  clearTimeout(errorTimeout);
                  setErrorTimeout(null);
                }
              }}
            >
              {errorMessage}
            </Alert>
          )}

          {/* File Selection/Upload Area */}
          {!selectedFile ? (
            <Box {...getRootProps()} sx={{ mb: 2 }}>
              <input {...getInputProps()} />
              <Box
                sx={{
                  p: 3,
                  border: '2px dashed',
                  borderColor: isDragActive ? 'primary.main' : 'grey.800',
                  borderRadius: 3,
                  cursor: 'pointer',
                  textAlign: 'center',
                  bgcolor: (theme) => theme.palette.mode === 'dark' ? 'background.default' : (isDragActive ? 'primary.50' : 'grey.50'),
                  transition: 'all 0.3s ease',
                  '&:hover': {
                    borderColor: 'primary.main',
                    bgcolor: (theme) => theme.palette.mode === 'dark' ? 'background.paper' : 'primary.50'
                  }
                }}
              >
                <Box sx={{ 
                  width: 60, 
                  height: 60, 
                  borderRadius: '50%', 
                  bgcolor: isDragActive ? 'primary.main' : 'grey.600', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  mx: 'auto',
                  mb: 2,
                  transition: 'all 0.3s ease'
                }}>
                  <UploadIcon sx={{ fontSize: 30, color: 'white' }} />
                </Box>
                <Typography variant="body1" gutterBottom sx={{ fontWeight: 600, color: 'text.primary' }}>
                  {isDragActive ? 'Drop your file here' : 'Choose your document'}
                </Typography>
                <Typography variant="body2" sx={{ mb: 2, color: 'text.primary' }}>
                  Drag and drop your file here, or click to browse
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ 
                  bgcolor: 'background.paper', 
                  px: 2, 
                  py: 1, 
                  borderRadius: 1,
                  border: '1px solid',
                  borderColor: 'divider'
                }}>
                  PDF, DOC, DOCX • Max 10MB
                </Typography>
              </Box>
            </Box>
          ) : (
            <Box sx={{ mb: 2 }}>
              <Box sx={{ 
                p: 2, 
                bgcolor: 'success.50', 
                border: '1px solid', 
                borderColor: 'success.200',
                borderRadius: 2,
                mb: 2
              }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <CheckIcon sx={{ color: 'success.main' }} />
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="body1" sx={{ fontWeight: 600 }}>
                      {selectedFile.name}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Ready to process • {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                    </Typography>
                  </Box>
                </Box>
              </Box>
              
              {/* Real-time Progress */}
              {currentJob && (
                <Box sx={{ 
                  p: 2, 
                  bgcolor: 'background.paper', 
                  border: '1px solid', 
                  borderColor: 'divider',
                  borderRadius: 2 
                }}>
                  <Typography variant="body2" sx={{ fontWeight: 600, mb: 2 }}>
                    Processing Status: {currentJob.status?.toUpperCase()}
                  </Typography>
                  {currentJob.status === 'processing' && (
                    <Box>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                        <Typography variant="caption">AI Analysis Progress</Typography>
                        <Typography variant="caption" sx={{ fontWeight: 600 }}>
                          {currentJob.progress || 0}%
                        </Typography>
                      </Box>
                      <LinearProgress
                        variant="determinate"
                        value={currentJob.progress || 0}
                        sx={{ 
                          height: 8, 
                          borderRadius: 4,
                          bgcolor: 'grey.200',
                          '& .MuiLinearProgress-bar': {
                            borderRadius: 4,
                            bgcolor: 'primary.main'
                          }
                        }}
                      />
                    </Box>
                  )}
                </Box>
              )}
            </Box>
          )}
        </DialogContent>
        
        <DialogActions sx={{ px: 4, pb: 4, pt: 2, gap: 2 }}>
          {stepStatuses.processing === 'error' || stepStatuses.complete === 'error' ? (
            <>
              <Button 
                onClick={() => setUploadModalOpen(false)}
                variant="outlined"
                sx={{ flex: 1 }}
              >
                Close
              </Button>
              <Button 
                onClick={handleRetry} 
                variant="contained" 
                color="primary"
                sx={{ flex: 1 }}
                startIcon={<ProcessingIcon />}
              >
                Try Again
              </Button>
            </>
          ) : stepStatuses.complete === 'completed' ? (
            <Button 
              onClick={() => setUploadModalOpen(false)} 
              variant="contained"
              fullWidth
              size="large"
              startIcon={<CheckIcon />}
              sx={{ py: 1.5 }}
            >
              Complete - View Work Items
            </Button>
          ) : (
            <>
              <Button 
                onClick={handleDialogClose} 
                disabled={uploading}
                variant="outlined"
                sx={{ flex: 1 }}
              >
                Cancel
              </Button>
              <Button
                onClick={handleUpload}
                variant="contained"
                disabled={!selectedFile || uploading || (currentJob && ['queued', 'processing'].includes(currentJob.status))}
                startIcon={(uploading || (currentJob && ['queued', 'processing'].includes(currentJob.status))) ? <CircularProgress size={16} color="inherit" /> : <UploadIcon />}
                sx={{ flex: 2, py: 1.5 }}
                size="large"
              >
                {(uploading || (currentJob && ['queued', 'processing'].includes(currentJob.status))) ? 'Processing...' : selectedFile ? 'Start AI Processing' : 'Select File First'}
              </Button>
            </>
          )}
        </DialogActions>
      </Dialog>

    </Box>
  );
};

export default FileUploadComponent;