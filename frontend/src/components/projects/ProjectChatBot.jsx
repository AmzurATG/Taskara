import React, { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Box,
  TextField,
  Button,
  Typography,
  Paper,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  CircularProgress,
  Chip,
  Divider,
  Avatar,
  IconButton,
  Card,
  CardContent,
  Alert,
  Collapse,
  Stack,
} from '@mui/material';
import {
  Chat as ChatIcon,
  Send as SendIcon,
  Close as CloseIcon,
  Description as DocumentIcon,
  SmartToy as RobotIcon,
  Person as PersonIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  InsertDriveFile as FileIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-hot-toast';
import { projectsAPI } from '../../services/api/projects';
import { ragAPI } from '../../services/api/rag';

const ProjectChatBot = ({ open, onClose, projectId }) => {
  const [documents, setDocuments] = useState([]);
  const [selectedDocument, setSelectedDocument] = useState(null);
  const [messages, setMessages] = useState([]);
  const [currentMessage, setCurrentMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [documentsLoading, setDocumentsLoading] = useState(false);
  const [showDocuments, setShowDocuments] = useState(true);
  const messagesEndRef = useRef(null);

  // Load documents when dialog opens
  useEffect(() => {
    if (open && projectId) {
      loadDocuments();
      // Add welcome message
      // setMessages([{
      //   id: Date.now(),
      //   type: 'bot',
      //   content: "👋 Hi! I'm your **Project Assistant**. I can help you ask questions about your uploaded documents. Please select a document to start chatting.",
      //   timestamp: new Date()
      // }]);
    } else {
      // Reset state when dialog closes
      setMessages([]);
      setSelectedDocument(null);
      setCurrentMessage('');
    }
  }, [open, projectId]);

  // Periodic status check for processing documents
  useEffect(() => {
    if (!open || !selectedDocument || selectedDocument.is_indexed) return;

    const checkStatus = async () => {
      try {
        const docs = await ragAPI.getProjectDocuments(projectId);
        const updatedDoc = docs.find(doc => doc.id === selectedDocument.id);
        
        if (updatedDoc && updatedDoc.is_indexed) {
          setSelectedDocument(updatedDoc);
          setDocuments(docs);
          
          setMessages(prev => [...prev, {
            id: Date.now(),
            type: 'bot',
            content: "🎉 Excellent! The document has finished processing automatically and is now ready for questions. What would you like to know?",
            timestamp: new Date()
          }]);
        }
      } catch (error) {
        console.error('Error checking document status:', error);
      }
    };

    // Check status every 10 seconds for unindexed documents
    const interval = setInterval(checkStatus, 10000);
    
    return () => clearInterval(interval);
  }, [open, selectedDocument, projectId]);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const attemptDocumentIndexing = async (document, retryCount = 0) => {
    const maxRetries = 3;
    const retryDelay = 2000; // 2 seconds
    
    try {
      setMessages(prev => [...prev, {
        id: Date.now(),
        type: 'bot',
        content: retryCount === 0 
          ? "🔄 I'm indexing the document now... This may take a few moments."
          : `🔄 Retrying document indexing (attempt ${retryCount + 1}/${maxRetries})...`,
        timestamp: new Date()
      }]);
      
      await ragAPI.indexDocument(projectId, document.id);
      
      // Update the document status
      setDocuments(prev => prev.map(doc => 
        doc.id === document.id ? { ...doc, is_indexed: true } : doc
      ));
      
      // Update selected document
      setSelectedDocument(prev => ({ ...prev, is_indexed: true }));
      
      setMessages(prev => [...prev, {
        id: Date.now(),
        type: 'bot',
        content: "🎉 Perfect! The document has been indexed and is now ready for questions. What would you like to know about it?",
        timestamp: new Date()
      }]);
      
    } catch (error) {
      console.error('Error indexing document:', error);
      
      if (retryCount < maxRetries - 1) {
        setMessages(prev => [...prev, {
          id: Date.now(),
          type: 'bot',
          content: `⚠️ Indexing failed. The document might still be processing from the upload. I'll retry in ${retryDelay/1000} seconds...`,
          timestamp: new Date(),
          isWarning: true
        }]);
        
        // Retry after delay
        setTimeout(() => {
          attemptDocumentIndexing(document, retryCount + 1);
        }, retryDelay);
      } else {
        // Final failure after all retries
        setMessages(prev => [...prev, {
          id: Date.now(),
          type: 'bot',
          content: "❌ I couldn't index the document after multiple attempts. This might be because:\n\n• The document is still being processed from the upload\n• The document format isn't supported or contains no readable text\n• There's a temporary system issue\n\n**What you can try:**\n1. Wait a few more minutes and refresh the document list\n2. Try re-uploading the document\n3. Check if the document contains readable text content",
          timestamp: new Date(),
          isError: true,
          showRetryButton: true,
          retryData: document
        }]);
      }
    }
  };

  const refreshDocumentStatus = async () => {
    if (selectedDocument) {
      try {
        const docs = await ragAPI.getProjectDocuments(projectId);
        const updatedDoc = docs.find(doc => doc.id === selectedDocument.id);
        
        if (updatedDoc && updatedDoc.is_indexed !== selectedDocument.is_indexed) {
          setSelectedDocument(updatedDoc);
          setDocuments(docs);
          
          if (updatedDoc.is_indexed) {
            setMessages(prev => [...prev, {
              id: Date.now(),
              type: 'bot',
              content: "🎉 Great news! The document has been successfully indexed and is now ready for questions. What would you like to know?",
              timestamp: new Date()
            }]);
          }
        }
      } catch (error) {
        console.error('Error refreshing document status:', error);
      }
    }
  };

  const loadDocuments = async () => {
    setDocumentsLoading(true);
    try {
      const docs = await ragAPI.getProjectDocuments(projectId);
      setDocuments(docs);
      
      // If there are documents, show count in welcome message
      if (docs.length > 0) {
        // setMessages(prev => [...prev, {
        //   id: Date.now() + 1,
        //   type: 'bot',
        //   content: `📁 I found **${docs.length} document${docs.length > 1 ? 's' : ''}** in this project. Select one to start asking questions about it.`,
        //   timestamp: new Date()
        // }]);
      }
    } catch (error) {
      console.error('Error loading documents:', error);
      toast.error('Failed to load documents');
      setMessages(prev => [...prev, {
        id: Date.now() + 1,
        type: 'bot',
        content: "Sorry, I couldn't load the documents for this project. Please try again later.",
        timestamp: new Date()
      }]);
    } finally {
      setDocumentsLoading(false);
    }
  };

  const handleRetryIndexing = async (document) => {
    // Remove the previous error message and retry
    setMessages(prev => prev.filter(msg => !msg.showRetryButton));
    attemptDocumentIndexing(document);
  };

  const handleDocumentSelect = (document) => {
    setSelectedDocument(document);
    setShowDocuments(false);
    
    if (document.is_indexed) {
      setMessages(prev => [...prev, {
        id: Date.now(),
        type: 'bot',
        content: `✅ Great! I've selected **"${document.file_name}"** for our conversation. The document is ready for questions. What would you like to know about it?`,
        timestamp: new Date(),
        metadata: {
          selectedDocument: document.file_name
        }
      }]);
    } else {
      setMessages(prev => [...prev, {
        id: Date.now(),
        type: 'bot',
        content: `📄 I've selected **"${document.file_name}"** but it's still being processed. I'll try to index it now so we can chat about it.`,
        timestamp: new Date(),
        metadata: {
          selectedDocument: document.file_name
        }
      }]);
      
      // Try to index the document
      attemptDocumentIndexing(document);
    }
  };

  const handleSendMessage = async () => {
    if (!currentMessage.trim() || isLoading) return;

    if (!selectedDocument) {
      toast.error('Please select a document first');
      return;
    }

    if (!selectedDocument.is_indexed) {
      toast.error('The selected document is still being processed. Please wait a moment.');
      return;
    }

    const userMessage = {
      id: Date.now(),
      type: 'user',
      content: currentMessage.trim(),
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    const messageToSend = currentMessage.trim();
    setCurrentMessage('');
    setIsLoading(true);

    try {
      const result = await ragAPI.chatWithDocument(projectId, messageToSend, selectedDocument.id);

      if (result.success) {
        const botMessage = {
          id: Date.now() + 1,
          type: 'bot',
          content: result.response,
          timestamp: new Date(),
          metadata: {
            fileName: result.file_name,
            chunksUsed: result.chunks_used
          }
        };
        setMessages(prev => [...prev, botMessage]);
      } else {
        throw new Error(result.error || 'Failed to get response');
      }
    } catch (error) {
      console.error('Error sending message:', error);
      
      // Check if it's an indexing-related error
      const errorMsg = error.response?.data?.detail || error.message || 'Unknown error';
      const isIndexingError = errorMsg.toLowerCase().includes('index') || 
                             errorMsg.toLowerCase().includes('chunk') ||
                             errorMsg.toLowerCase().includes('embedding');
      
      let errorContent = "Sorry, I encountered an error while processing your question.";
      
      if (isIndexingError) {
        errorContent = "It looks like there might be an issue with the document indexing. Let me try to refresh the document status and re-index if needed.";
        
        // Automatically try to refresh and potentially re-index
        setTimeout(() => {
          refreshDocumentStatus();
        }, 1000);
      }
      
      const errorMessage = {
        id: Date.now() + 1,
        type: 'bot',
        content: errorContent + "\n\nPlease try asking your question again, or use the refresh button to check document status.",
        timestamp: new Date(),
        isError: true
      };
      setMessages(prev => [...prev, errorMessage]);
      toast.error('Failed to send message');
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      handleSendMessage();
    }
  };

  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          height: '80vh',
          borderRadius: 3,
          boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
        }
      }}
    >
      <DialogTitle sx={{ 
        pb: 1, 
        borderBottom: '1px solid', 
        borderColor: 'divider',
        bgcolor: 'primary.main',
        color: 'primary.contrastText'
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Avatar sx={{ bgcolor: 'primary.dark' }}>
            <RobotIcon />
          </Avatar>
          <Box sx={{ flex: 1 }}>
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              Project Assistant
            </Typography>
            <Typography variant="caption" sx={{ opacity: 0.9 }}>
              {selectedDocument 
                ? `Chatting about: ${selectedDocument.file_name}` 
                : `${documents.length} document${documents.length !== 1 ? 's' : ''} available`
              }
            </Typography>
          </Box>
          <IconButton 
            onClick={() => {
              loadDocuments();
              if (selectedDocument) {
                refreshDocumentStatus();
              }
            }} 
            sx={{ color: 'primary.contrastText' }}
            size="small"
            title="Refresh documents and check status"
          >
            <RefreshIcon />
          </IconButton>
          <IconButton 
            onClick={onClose} 
            sx={{ color: 'primary.contrastText' }}
            size="small"
          >
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent sx={{ p: 0, display: 'flex', flexDirection: 'column', height: '100%' }}>
        {/* Document Selection Panel */}
        <Collapse in={showDocuments && documents.length > 0}>
          <Box sx={{ p: 2, bgcolor: 'grey.50', borderBottom: '1px solid', borderColor: 'divider' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
              <DocumentIcon color="primary" fontSize="small" />
              <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                Available Documents ({documents.length})
              </Typography>
              <IconButton 
                size="small" 
                onClick={() => setShowDocuments(!showDocuments)}
              >
                <ExpandLessIcon />
              </IconButton>
            </Box>
            
            {documentsLoading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
                <CircularProgress size={24} />
              </Box>
            ) : (
              <Stack spacing={1}>
                {documents.map((doc) => (
                  <Card 
                    key={doc.id} 
                    sx={{ 
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      border: selectedDocument?.id === doc.id ? '2px solid' : '1px solid',
                      borderColor: selectedDocument?.id === doc.id ? 'primary.main' : 'divider',
                      '&:hover': { 
                        boxShadow: 2,
                        borderColor: 'primary.main'
                      }
                    }}
                    onClick={() => handleDocumentSelect(doc)}
                  >
                    <CardContent sx={{ p: 1.5 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <FileIcon color="primary" fontSize="small" />
                        <Typography variant="body2" sx={{ flex: 1, fontWeight: 500 }}>
                          {doc.file_name}
                        </Typography>
                        <Chip 
                          size="small" 
                          label={doc.is_indexed ? 'Ready' : 'Processing'} 
                          color={doc.is_indexed ? 'success' : 'warning'}
                          icon={doc.is_indexed ? <CheckCircleIcon /> : <CircularProgress size={12} />}
                          sx={{
                            animation: !doc.is_indexed ? 'pulse 2s infinite' : 'none',
                            '@keyframes pulse': {
                              '0%': { opacity: 1 },
                              '50%': { opacity: 0.6 },
                              '100%': { opacity: 1 }
                            }
                          }}
                        />
                      </Box>
                      <Typography variant="caption" color="text.secondary">
                        Uploaded: {new Date(doc.created_at).toLocaleDateString()}
                        {!doc.is_indexed && " • Processing for chat..."}
                      </Typography>
                    </CardContent>
                  </Card>
                ))}
                
                {/* Info message when documents are processing */}
                {documents.some(doc => !doc.is_indexed) && (
                  <Alert severity="info" sx={{ mt: 1 }}>
                    <Typography variant="caption">
                      <strong>💡 Tip:</strong> Documents marked as "Processing" are being prepared for AI chat. 
                      This usually takes 1-3 minutes depending on document size. You can still select them and I'll try to prepare them for chat.
                    </Typography>
                  </Alert>
                )}
              </Stack>
            )}
          </Box>
        </Collapse>

        {/* Minimized Document Panel */}
        {!showDocuments && documents.length > 0 && (
          <Box sx={{ p: 1, bgcolor: 'grey.50', borderBottom: '1px solid', borderColor: 'divider' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <IconButton 
                size="small" 
                onClick={() => setShowDocuments(true)}
              >
                <ExpandMoreIcon />
              </IconButton>
              <Typography variant="caption" color="text.secondary">
                {documents.length} document{documents.length !== 1 ? 's' : ''} available
              </Typography>
              {selectedDocument && (
                <Chip 
                  size="small" 
                  label={selectedDocument.file_name} 
                  variant="outlined"
                  deleteIcon={<CloseIcon />}
                  onDelete={() => {
                    setSelectedDocument(null);
                    setShowDocuments(true);
                  }}
                />
              )}
            </Box>
          </Box>
        )}

        {/* Messages Area */}
        <Box sx={{ 
          flex: 1, 
          overflow: 'auto', 
          p: 2, 
          bgcolor: 'background.default',
          minHeight: 0
        }}>
          <AnimatePresence>
            {messages.map((message) => (
              <motion.div
                key={message.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
              >
                <Box sx={{ 
                  mb: 2,
                  display: 'flex',
                  justifyContent: message.type === 'user' ? 'flex-end' : 'flex-start'
                }}>
                  <Box sx={{ 
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 1,
                    maxWidth: '80%',
                    flexDirection: message.type === 'user' ? 'row-reverse' : 'row'
                  }}>
                    <Avatar 
                      sx={{ 
                        width: 32, 
                        height: 32,
                        bgcolor: message.type === 'user' ? 'primary.main' : 'secondary.main'
                      }}
                    >
                      {message.type === 'user' ? <PersonIcon /> : <RobotIcon />}
                    </Avatar>
                    
                    <Paper sx={{
                      p: 1.5,
                      bgcolor: message.isError ? 'error.dark' : 
                               message.isWarning ? 'warning.dark' :
                               message.type === 'user' ? 'primary.main' : 'grey.800',
                      color: message.isError ? 'error.contrastText' :
                             message.isWarning ? 'warning.contrastText' :
                             message.type === 'user' ? 'primary.contrastText' : 'grey.100',
                      borderRadius: 2,
                      boxShadow: 1,
                      border: (message.isError || message.isWarning) ? '1px solid' : 'none',
                      borderColor: message.isError ? 'error.light' : 
                                  message.isWarning ? 'warning.light' : 'transparent',
                      maxWidth: '100%',
                      wordBreak: 'break-word',
                    }}>
                      {message.type === 'bot' && !message.isError ? (
                        <ReactMarkdown
                          components={{
                            // Customize markdown components for better styling
                            p: ({ children }) => (
                              <Typography variant="body2" component="p" sx={{ 
                                mb: 1, 
                                '&:last-child': { mb: 0 },
                                lineHeight: 1.6
                              }}>
                                {children}
                              </Typography>
                            ),
                            h1: ({ children }) => (
                              <Typography variant="h6" component="h1" sx={{ 
                                fontWeight: 600, 
                                mb: 1, 
                                color: 'inherit' 
                              }}>
                                {children}
                              </Typography>
                            ),
                            h2: ({ children }) => (
                              <Typography variant="subtitle1" component="h2" sx={{ 
                                fontWeight: 600, 
                                mb: 1, 
                                color: 'inherit' 
                              }}>
                                {children}
                              </Typography>
                            ),
                            h3: ({ children }) => (
                              <Typography variant="subtitle2" component="h3" sx={{ 
                                fontWeight: 600, 
                                mb: 1, 
                                color: 'inherit' 
                              }}>
                                {children}
                              </Typography>
                            ),
                            ul: ({ children }) => (
                              <Box component="ul" sx={{ 
                                m: 0, 
                                pl: 2, 
                                mb: 1,
                                '&:last-child': { mb: 0 }
                              }}>
                                {children}
                              </Box>
                            ),
                            ol: ({ children }) => (
                              <Box component="ol" sx={{ 
                                m: 0, 
                                pl: 2, 
                                mb: 1,
                                '&:last-child': { mb: 0 }
                              }}>
                                {children}
                              </Box>
                            ),
                            li: ({ children }) => (
                              <Typography component="li" variant="body2" sx={{ 
                                mb: 0.5,
                                lineHeight: 1.6
                              }}>
                                {children}
                              </Typography>
                            ),
                            strong: ({ children }) => (
                              <Typography component="strong" variant="inherit" sx={{ 
                                fontWeight: 700,
                                color: 'inherit'
                              }}>
                                {children}
                              </Typography>
                            ),
                            em: ({ children }) => (
                              <Typography component="em" variant="inherit" sx={{ 
                                fontStyle: 'italic',
                                color: 'inherit'
                              }}>
                                {children}
                              </Typography>
                            ),
                            code: ({ children }) => (
                              <Typography component="code" variant="inherit" sx={{ 
                                fontFamily: 'monospace',
                                bgcolor: 'rgba(255, 255, 255, 0.1)',
                                px: 0.5,
                                py: 0.25,
                                borderRadius: 0.5,
                                fontSize: '0.875em'
                              }}>
                                {children}
                              </Typography>
                            ),
                            pre: ({ children }) => (
                              <Box component="pre" sx={{ 
                                bgcolor: 'rgba(255, 255, 255, 0.05)',
                                p: 1,
                                borderRadius: 1,
                                overflow: 'auto',
                                fontFamily: 'monospace',
                                fontSize: '0.875rem',
                                mb: 1,
                                '&:last-child': { mb: 0 }
                              }}>
                                {children}
                              </Box>
                            ),
                            blockquote: ({ children }) => (
                              <Box component="blockquote" sx={{ 
                                borderLeft: '4px solid',
                                borderColor: 'grey.500',
                                pl: 2,
                                py: 0.5,
                                mb: 1,
                                fontStyle: 'italic',
                                bgcolor: 'rgba(255, 255, 255, 0.05)',
                                '&:last-child': { mb: 0 }
                              }}>
                                {children}
                              </Box>
                            )
                          }}
                        >
                          {message.content}
                        </ReactMarkdown>
                      ) : (
                        <Typography variant="body2" sx={{ 
                          whiteSpace: 'pre-wrap',
                          lineHeight: 1.6
                        }}>
                          {message.content}
                        </Typography>
                      )}
                      
                      {/* Retry button for failed indexing */}
                      {message.showRetryButton && message.retryData && (
                        <Box sx={{ mt: 2, display: 'flex', gap: 1 }}>
                          <Button
                            size="small"
                            variant="outlined"
                            startIcon={<RefreshIcon />}
                            onClick={() => handleRetryIndexing(message.retryData)}
                            sx={{
                              borderColor: 'currentColor',
                              color: 'inherit',
                              '&:hover': {
                                borderColor: 'currentColor',
                                bgcolor: 'rgba(255, 255, 255, 0.1)'
                              }
                            }}
                          >
                            Retry Indexing
                          </Button>
                          <Button
                            size="small"
                            variant="outlined"
                            onClick={refreshDocumentStatus}
                            sx={{
                              borderColor: 'currentColor',
                              color: 'inherit',
                              '&:hover': {
                                borderColor: 'currentColor',
                                bgcolor: 'rgba(255, 255, 255, 0.1)'
                              }
                            }}
                          >
                            Check Status
                          </Button>
                        </Box>
                      )}
                      
                      {/* Message metadata */}
                      <Box sx={{ 
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        alignItems: 'center',
                        mt: 1,
                        pt: 1,
                        borderTop: message.metadata ? '1px solid' : 'none',
                        borderColor: message.type === 'user' ? 'primary.dark' : 'divider',
                        opacity: 0.7
                      }}>
                        {message.metadata && (
                          <Typography variant="caption">
                            {message.metadata.chunksUsed && `${message.metadata.chunksUsed} sources • `}
                            {message.metadata.fileName || message.metadata.selectedDocument}
                          </Typography>
                        )}
                        <Typography variant="caption" sx={{ ml: 'auto' }}>
                          {formatTime(message.timestamp)}
                        </Typography>
                      </Box>
                    </Paper>
                  </Box>
                </Box>
              </motion.div>
            ))}
          </AnimatePresence>
          
          {/* Loading indicator */}
          {isLoading && (
            <Box sx={{ display: 'flex', justifyContent: 'flex-start', mb: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Avatar sx={{ width: 32, height: 32, bgcolor: 'secondary.main' }}>
                  <RobotIcon />
                </Avatar>
                <Paper sx={{ p: 1.5, bgcolor: 'grey.100', borderRadius: 2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <CircularProgress size={16} />
                    <Typography variant="body2" color="text.secondary">
                      Thinking...
                    </Typography>
                  </Box>
                </Paper>
              </Box>
            </Box>
          )}
          
          <div ref={messagesEndRef} />
        </Box>

        {/* Input Area */}
        <Box sx={{ 
          p: 2, 
          borderTop: '1px solid', 
          borderColor: 'divider',
          bgcolor: 'background.paper'
        }}>
          {!selectedDocument && documents.length > 0 && (
            <Alert severity="info" sx={{ mb: 2 }}>
              Select a document above to start asking questions
            </Alert>
          )}
          
          {documents.length === 0 && !documentsLoading && (
            <Alert severity="warning" sx={{ mb: 2 }}>
              No documents found in this project. Upload a document first to enable chat.
            </Alert>
          )}

          <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-end' }}>
            <TextField
              fullWidth
              multiline
              maxRows={4}
              placeholder={
                !selectedDocument 
                  ? "Select a document to start chatting..."
                  : selectedDocument.is_indexed
                    ? "Ask me anything about the document..."
                    : "Document is being processed..."
              }
              value={currentMessage}
              onChange={(e) => setCurrentMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              disabled={!selectedDocument || !selectedDocument.is_indexed || isLoading}
              variant="outlined"
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: 2,
                }
              }}
            />
            <IconButton
              onClick={handleSendMessage}
              disabled={!currentMessage.trim() || !selectedDocument || !selectedDocument.is_indexed || isLoading}
              color="primary"
              sx={{
                p: 1.5,
                bgcolor: 'primary.main',
                color: 'white',
                '&:hover': {
                  bgcolor: 'primary.dark',
                },
                '&:disabled': {
                  bgcolor: 'grey.300',
                  color: 'grey.500',
                }
              }}
            >
              {isLoading ? <CircularProgress size={20} color="inherit" /> : <SendIcon />}
            </IconButton>
          </Box>
        </Box>
      </DialogContent>
    </Dialog>
  );
};

export default ProjectChatBot;