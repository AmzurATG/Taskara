import React, { useState } from 'react';
import { 
  Box, 
  Typography, 
  IconButton, 
  Collapse 
} from '@mui/material';
import { 
  ExpandMore as ExpandMoreIcon, 
  ExpandLess as ExpandLessIcon 
} from '@mui/icons-material';

const ExpandableDescription = ({ 
  title = "Description",
  description, 
  titleVariant = "h6",
  descriptionVariant = "body2",
  maxLines = 1, // Reduced from 2 to 1 for more compact display
  titleSx = {},
  descriptionSx = {},
  containerSx = {},
  defaultExpanded = false,
  showToggleButton = true
}) => {
  const [expanded, setExpanded] = useState(defaultExpanded);

  const handleToggle = () => {
    setExpanded(!expanded);
  };

  const hasContent = description && description.trim();

  if (!hasContent && !showToggleButton) {
    return null;
  }

  return (
    <Box sx={{ ...containerSx }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: hasContent ? 0.5 : 0 }}> {/* Reduced gaps */}
        <Typography 
          variant={titleVariant} 
          sx={{ 
            fontWeight: 500,
            fontSize: titleVariant === 'h6' ? '0.9rem' : undefined, // Even smaller font for title
            ...titleSx 
          }}
        >
          {title}
        </Typography>
        {showToggleButton && hasContent && (
          <IconButton
            onClick={handleToggle}
            size="small"
            sx={{ 
              ml: 0.3, 
              p: 0.3, // Even smaller padding
              color: 'text.secondary',
              '&:hover': {
                color: 'primary.main',
                bgcolor: 'action.hover',
              }
            }}
          >
            {expanded ? <ExpandLessIcon fontSize="small" /> : <ExpandMoreIcon fontSize="small" />}
          </IconButton>
        )}
      </Box>
      
      {hasContent && (
        <Collapse in={expanded} timeout="auto" unmountOnExit>
          <Typography
            variant={descriptionVariant}
            sx={{
              color: 'text.secondary',
              lineHeight: 1.3, // Tighter line height
              fontSize: '0.8rem', // Even smaller font for description
              ...descriptionSx
            }}
          >
            {description}
          </Typography>
        </Collapse>
      )}
      
      {!expanded && hasContent && showToggleButton && (
        <Typography
          variant={descriptionVariant}
          sx={{
            color: 'text.secondary',
            lineHeight: 1.3, // Tighter line height
            fontSize: '0.8rem', // Even smaller font for description
            display: '-webkit-box',
            WebkitLineClamp: maxLines,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            cursor: 'pointer', // Make it clickable
            '&:hover': {
              color: 'text.primary', // Highlight on hover
            },
            ...descriptionSx
          }}
          onClick={handleToggle} // Allow clicking on truncated text to expand
        >
          {description}
        </Typography>
      )}
    </Box>
  );
};

export default ExpandableDescription;