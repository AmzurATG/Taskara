import React, { useState, useEffect } from 'react';
import { Box, Typography, Button, Collapse } from '@mui/material';
import { ExpandMore as ExpandMoreIcon, ExpandLess as ExpandLessIcon } from '@mui/icons-material';
import InlineEditableText from './InlineEditableText';

const ExpandableInlineDescription = ({ 
  title = "Description",
  value = "",
  onSave,
  field = "description",
  placeholder = "Click to add a description...",
  loading = false,
  maxLength = 2000,
  titleSx = {},
  containerSx = {},
  maxLines = 2
}) => {
  const [expanded, setExpanded] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [displayValue, setDisplayValue] = useState(value || "");

  // Update display value when prop value changes
  useEffect(() => {
    setDisplayValue(value || "");
  }, [value]);

  const hasContent = displayValue && displayValue.trim().length > 0;
  const shouldShowToggle = hasContent && displayValue.length > 100; // Show toggle if content is long

  const handleToggle = () => {
    if (expanded) {
      // If clicking "Less" button, collapse back to shortened view
      setExpanded(false);
    } else {
      setExpanded(true);
    }
  };

  const handleDescriptionClick = () => {
    if (hasContent) {
      setIsEditing(true);
      if (!expanded && shouldShowToggle) {
        setExpanded(true);
      }
    }
  };

  const handleSave = async (newValue) => {
    if (onSave) {
      await onSave(newValue);
    }
    // Update local display value immediately
    setDisplayValue(newValue);
    setIsEditing(false);
    // Collapse back to shortened view after saving
    setExpanded(false);
  };

  const handleCancel = () => {
    setIsEditing(false);
    // Collapse back after cancelling
    setExpanded(false);
  };

  const getDisplayValue = () => {
    if (expanded || isEditing || !shouldShowToggle) {
      return displayValue;
    }
    // Truncate for preview
    return displayValue.length > 100 ? displayValue.substring(0, 100) + '...' : displayValue;
  };

  return (
    <Box sx={{ ...containerSx }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.5 }}>
        <Typography variant="h6" sx={{ fontSize: '0.85rem', fontWeight: 500, ...titleSx }}>
          {title}
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          {shouldShowToggle && !isEditing && (
            <Button
              size="small"
              onClick={handleToggle}
              endIcon={expanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
              sx={{
                fontSize: '0.7rem',
                textTransform: 'none',
                p: 0.5,
                minWidth: 'auto',
                color: 'text.secondary'
              }}
            >
              {expanded ? 'Less' : 'More'}
            </Button>
          )}
        </Box>
      </Box>

      {isEditing ? (
        <InlineEditableText
          value={displayValue}
          onSave={handleSave}
          variant="body2"
          color="text.secondary"
          placeholder={placeholder}
          multiline={true}
          maxLength={maxLength}
          loading={loading}
          sx={{
            minHeight: '2rem',
            fontSize: '0.75rem',
            p: 0.5,
            borderRadius: 1,
            border: '1px solid',
            borderColor: 'primary.main',
            bgcolor: 'background.paper',
          }}
        />
      ) : (
        <Collapse in={expanded || !shouldShowToggle} timeout="auto">
          <Box
            onClick={!hasContent ? setIsEditing.bind(null, true) : handleDescriptionClick}
            sx={{
              minHeight: '1.5rem',
              fontSize: '0.75rem',
              p: 0.5,
              borderRadius: 1,
              cursor: 'pointer',
              '&:hover': { 
                bgcolor: 'action.hover',
              },
              color: hasContent ? 'text.secondary' : 'text.disabled',
            }}
          >
            {hasContent ? (
              <Typography 
                variant="body2" 
                sx={{ 
                  fontSize: '0.75rem',
                  lineHeight: 1.4,
                  whiteSpace: 'pre-wrap'
                }}
              >
                {getDisplayValue()}
              </Typography>
            ) : (
              <Typography 
                variant="body2" 
                sx={{ 
                  fontSize: '0.75rem',
                  fontStyle: 'italic',
                  color: 'text.disabled'
                }}
              >
                {placeholder}
              </Typography>
            )}
          </Box>
        </Collapse>
      )}
    </Box>
  );
};

export default ExpandableInlineDescription;