import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import {
  Box,
  Typography,
  Button,
  LinearProgress,
  Paper,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
  Stepper,
  Step,
  StepLabel,
  StepContent,
} from '@mui/material';
import {
  CloudUpload as UploadIcon,
  InsertDriveFile as FileIcon,
  CheckCircle as SuccessIcon,
  Error as ErrorIcon,
  Refresh as ProcessingIcon,
  HourglassEmpty as QueuedIcon,
  Check as CheckIcon,
} from '@mui/icons-material';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-hot-toast';
import { projectsAPI } from '../../services/api/projects';

const FileUploadButton = ({ 
  projectId, 
  onUploadComplete,
  disabled = false,
  variant = "contained",
  sx = {}
}) => {
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [currentJob, setCurrentJob] = useState(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [stepStatuses, setStepStatuses] = useState({
    upload: 'pending',
    queue: 'pending', 
    processing: 'pending',
    complete: 'pending'
  });

  const steps = [
    'Upload File',
    'Queue for Processing',
    'AI Processing',
    'Generate Work Items'
  ];

  const onDrop = useCallback((acceptedFiles) => {
    if (acceptedFiles.length > 0) {
      const file = acceptedFiles[0];
      console.log('File selected:', file.name, file.size, file.type);
      setSelectedFile(file);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'application/msword': ['.doc']
    },
    multiple: false,
    maxSize: 10 * 1024 * 1024 // 10MB
  });

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

      // Upload the file
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
        
        // Start polling for job status
        pollJobStatus(response.id);
      } catch (error) {
        console.error('Error getting AI job:', error);
        // Job might not be created yet, that's okay
      }

    } catch (error) {
      console.error('Upload failed:', error);
      
      // Handle specific error cases
      if (error.message && error.message.includes('already exists')) {
        toast.error(error.message);
      } else {
        toast.error(`Upload failed: ${error.message || 'Unknown error'}`);
      }
      
      setStepStatuses(prev => ({ ...prev, upload: 'error' }));
      setUploading(false);
    }
  };

  const pollJobStatus = async (fileId) => {
    const maxAttempts = 150; // 5 minutes with 2-second intervals
    let attempts = 0;

    const poll = async () => {
      try {
        const job = await projectsAPI.getFileAIJob(fileId);
        setCurrentJob(job);
        updateStepsFromJob(job);

        if (job.status === 'done') {
          setStepStatuses(prev => ({ ...prev, complete: 'completed' }));
          setCurrentStep(3);
          toast.success('🎉 AI processing completed! Work items have been generated.');
          setUploading(false);
          onUploadComplete && onUploadComplete(job);
          return;
        } else if (job.status === 'failed') {
          setStepStatuses(prev => ({ ...prev, processing: 'error' }));
          toast.error(`Processing failed: ${job.error_message || 'Unknown error'}`);
          setUploading(false);
          return;
        } else if (['queued', 'processing'].includes(job.status)) {
          attempts++;
          if (attempts < maxAttempts) {
            setTimeout(poll, 2000); // Poll every 2 seconds
          } else {
            toast.error('Processing timeout. Please check the file list for status.');
            setUploading(false);
          }
        }
      } catch (error) {
        console.error('Error polling job status:', error);
        attempts++;
        if (attempts < maxAttempts) {
          setTimeout(poll, 2000);
        } else {
          setUploading(false);
        }
      }
    };

    setTimeout(poll, 1000); // Start polling after 1 second
  };

  const updateStepsFromJob = (job) => {
    if (!job) return;

    if (job.status === 'queued') {
      setStepStatuses(prev => ({ 
        ...prev, 
        upload: 'completed',
        queue: 'active',
        processing: 'pending',
        complete: 'pending'
      }));
      setCurrentStep(1);
    } else if (job.status === 'processing') {
      setStepStatuses(prev => ({ 
        ...prev, 
        upload: 'completed',
        queue: 'completed',
        processing: 'active',
        complete: 'pending'
      }));
      setCurrentStep(2);
    } else if (job.status === 'done') {
      setStepStatuses(prev => ({ 
        ...prev, 
        upload: 'completed',
        queue: 'completed',
        processing: 'completed',
        complete: 'completed'
      }));
      setCurrentStep(3);
    } else if (job.status === 'failed') {
      setStepStatuses(prev => ({ 
        ...prev, 
        processing: 'error'
      }));
    }
  };

  const handleModalClose = () => {
    if (!uploading) {
      setUploadModalOpen(false);
      setSelectedFile(null);
      setCurrentJob(null);
      setCurrentStep(0);
      setStepStatuses({
        upload: 'pending',
        queue: 'pending',
        processing: 'pending',
        complete: 'pending'
      });
    }
  };

  const getStepIcon = (stepStatus) => {
    switch (stepStatus) {
      case 'completed':
        return <CheckIcon />;
      case 'active':
        return <CircularProgress size={24} />;
      case 'error':
        return <ErrorIcon />;
      default:
        return null;
    }
  };

  return (
    <>
      <Button
        variant={variant}
        startIcon={<UploadIcon />}
        onClick={() => setUploadModalOpen(true)}
        disabled={disabled}
        sx={{ 
          textTransform: 'none', 
          minWidth: 140, 
          fontWeight: 600, 
          fontSize: '1rem',
          ...sx
        }}
      >
        Upload File
      </Button>

      <Dialog
        open={uploadModalOpen}
        onClose={handleModalClose}
        maxWidth="md"
        fullWidth
        disableEscapeKeyDown={uploading}
      >
        <DialogTitle>
          Upload Requirements Document
        </DialogTitle>
        
        <DialogContent>
          {!selectedFile && (
            <Paper
              {...getRootProps()}
              sx={{
                p: 4,
                textAlign: 'center',
                border: '2px dashed',
                borderColor: isDragActive ? 'primary.main' : 'grey.300',
                bgcolor: isDragActive ? 'action.hover' : 'background.paper',
                cursor: 'pointer',
                '&:hover': { borderColor: 'primary.main' }
              }}
            >
              <input {...getInputProps()} />
              <UploadIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
              <Typography variant="h6" gutterBottom>
                {isDragActive ? 'Drop the file here' : 'Drag & drop a file here, or click to select'}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Supported formats: PDF, DOCX, DOC (max 10MB)
              </Typography>
            </Paper>
          )}

          {selectedFile && !uploading && (
            <Box sx={{ textAlign: 'center', py: 2 }}>
              <FileIcon sx={{ fontSize: 48, mb: 2 }} />
              <Typography variant="h6" gutterBottom>
                {selectedFile.name}
              </Typography>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
              </Typography>
            </Box>
          )}

          {uploading && (
            <Box sx={{ py: 2 }}>
              <Stepper activeStep={currentStep} orientation="vertical">
                {steps.map((label, index) => {
                  const stepStatus = Object.values(stepStatuses)[index];
                  return (
                    <Step key={label} completed={stepStatus === 'completed'}>
                      <StepLabel 
                        icon={getStepIcon(stepStatus)}
                        error={stepStatus === 'error'}
                      >
                        {label}
                      </StepLabel>
                      <StepContent>
                        {stepStatus === 'active' && (
                          <LinearProgress sx={{ mt: 1, mb: 2 }} />
                        )}
                        {stepStatus === 'error' && (
                          <Alert severity="error" sx={{ mt: 1, mb: 2 }}>
                            {currentJob?.error_message || 'An error occurred'}
                          </Alert>
                        )}
                      </StepContent>
                    </Step>
                  );
                })}
              </Stepper>
            </Box>
          )}
        </DialogContent>

        <DialogActions>
          {!uploading && (
            <>
              <Button onClick={handleModalClose}>Cancel</Button>
              {selectedFile && (
                <Button onClick={handleUpload} variant="contained">
                  Upload & Process
                </Button>
              )}
            </>
          )}
          {uploading && (
            <Button onClick={handleModalClose} disabled={uploading}>
              {uploading ? 'Processing...' : 'Close'}
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </>
  );
};

export default FileUploadButton;