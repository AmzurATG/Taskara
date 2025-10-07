import React from 'react';
import { Box, Button, Typography, IconButton } from '@mui/material';
import { 
  ChevronLeft as PrevIcon, 
  ChevronRight as NextIcon,
  FirstPage as FirstPageIcon,
  LastPage as LastPageIcon 
} from '@mui/icons-material';

const LazyPaginationComponent = ({
  currentPage,
  totalPages,
  hasNext,
  hasPrev,
  startIndex,
  endIndex,
  totalItems,
  onNext,
  onPrev,
  onFirst,
  onLast,
  itemType = "items",
  showPageInfo = true,
  showFirstLast = false,
  size = "medium", // small, medium, large
  variant = "default", // default, compact, minimal, sticky
  loading = false
}) => {
  if (totalItems === 0) return null;

  const sizeProps = {
    small: { buttonSize: 'small', spacing: 0.4, py: 0.8 }, // Further reduced for ultra-compact
    medium: { buttonSize: 'small', spacing: 1, py: 2 },
    large: { buttonSize: 'medium', spacing: 1.5, py: 2.5 }
  };

  const currentSizeProps = sizeProps[size] || sizeProps.medium;

  // Add padding to body when sticky variant is used
  React.useEffect(() => {
    if (variant === 'sticky') {
      document.body.style.paddingBottom = '65px'; // Reduced padding for more compact sticky
      return () => {
        document.body.style.paddingBottom = '0px';
      };
    }
  }, [variant]);

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: variant === 'compact' ? 'center' : 'space-between',
        py: currentSizeProps.py,
        px: variant === 'minimal' || variant === 'sticky' ? 0 : 1,
        backgroundColor: variant === 'minimal' || variant === 'sticky' ? 'transparent' : 'background.paper',
        borderRadius: variant === 'minimal' || variant === 'sticky' ? 0 : 1,
        mt: variant === 'sticky' ? 0 : 2,
        opacity: loading ? 0.6 : 1,
        ...(variant === 'sticky' && {
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 1000,
          backgroundColor: 'background.paper',
          backdropFilter: 'blur(10px)',
          borderTop: '1px solid',
          borderColor: 'divider',
          px: 2, // Reduced padding
          py: 1.5, // Reduced padding for more compact sticky
          boxShadow: '0 -2px 12px rgba(0, 0, 0, 0.08)' // Lighter shadow
        }),
        pointerEvents: loading ? 'none' : 'auto'
      }}
    >
      {/* Left side - Items info */}
      {showPageInfo && (
        <Typography variant="body2" color="text.secondary">
          Showing {startIndex}-{endIndex} of {totalItems} {itemType}
        </Typography>
      )}

      {/* Right side - Navigation */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: currentSizeProps.spacing }}>
        {showFirstLast && (
          <IconButton
            onClick={onFirst}
            disabled={!hasPrev}
            size="small"
            sx={{ 
              borderRadius: 1,
              '&:disabled': { opacity: 0.5 }
            }}
          >
            <FirstPageIcon />
          </IconButton>
        )}

        <Button
          variant="outlined"
          onClick={onPrev}
          disabled={!hasPrev || loading}
          startIcon={<PrevIcon />}
          size={currentSizeProps.buttonSize}
          sx={{ 
            textTransform: 'none',
            minWidth: size === 'small' ? 70 : 90,
            '&:disabled': { 
              opacity: 0.5,
              borderColor: 'divider'
            }
          }}
        >
          {size === 'small' ? 'Prev' : 'Previous'}
        </Button>

        <Typography 
          variant="body2" 
          sx={{ 
            px: 2, 
            py: 1, 
            bgcolor: 'primary.main',
            color: 'primary.contrastText',
            borderRadius: 1,
            minWidth: 60,
            textAlign: 'center',
            fontWeight: 500
          }}
        >
          {currentPage} of {totalPages}
        </Typography>

        <Button
          variant="outlined"
          onClick={onNext}
          disabled={!hasNext || loading}
          endIcon={<NextIcon />}
          size={currentSizeProps.buttonSize}
          sx={{ 
            textTransform: 'none',
            minWidth: size === 'small' ? 70 : 90,
            '&:disabled': { 
              opacity: 0.5,
              borderColor: 'divider'
            }
          }}
        >
          Next
        </Button>

        {showFirstLast && (
          <IconButton
            onClick={onLast}
            disabled={!hasNext}
            size="small"
            sx={{ 
              borderRadius: 1,
              '&:disabled': { opacity: 0.5 }
            }}
          >
            <LastPageIcon />
          </IconButton>
        )}
      </Box>
    </Box>
  );
};

export default LazyPaginationComponent;