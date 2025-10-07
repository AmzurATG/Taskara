import React, { useState, useRef, useEffect } from 'react';
import {
  Typography,
  TextField,
  Box,
  ClickAwayListener,
  CircularProgress,
} from '@mui/material';

const InlineEditableText = ({
  value,
  onSave,
  variant = 'body1',
  color = 'text.primary',
  placeholder = 'Click to edit',
  multiline = false,
  minRows = 2,
  maxLength = 200,
  sx = {},
  disabled = false,
  loading = false,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value || '');
  const inputRef = useRef(null);

  useEffect(() => {
    setEditValue(value || '');
  }, [value]);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      // Small delay to ensure the TextField is fully rendered
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus();
          // Only call select if it's available and not multiline
          if (!multiline && inputRef.current.select && typeof inputRef.current.select === 'function') {
            inputRef.current.select();
          }
        }
      }, 0);
    }
  }, [isEditing, multiline]);

  const handleClick = (e) => {
    e.stopPropagation();
    if (!disabled && !loading) {
      setIsEditing(true);
    }
  };

  const handleSave = async () => {
    if (editValue.trim() !== value?.trim()) {
      try {
        await onSave(editValue.trim());
      } catch (error) {
        // Reset to original value on error
        setEditValue(value || '');
      }
    }
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditValue(value || '');
    setIsEditing(false);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !multiline) {
      e.preventDefault();
      handleSave();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      handleCancel();
    }
  };

  const handleChange = (e) => {
    const newValue = e.target.value;
    if (newValue.length <= maxLength) {
      setEditValue(newValue);
    }
  };

  if (isEditing) {
    return (
      <ClickAwayListener onClickAway={handleSave}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <TextField
            inputRef={inputRef}
            value={editValue}
            onChange={handleChange}
            onKeyDown={handleKeyPress}
            multiline={multiline}
            rows={multiline ? minRows : 1}
            variant="outlined"
            size="small"
            fullWidth
            disabled={loading}
            sx={{
              '& .MuiOutlinedInput-root': {
                fontSize: variant === 'h6' ? '1.25rem' : '0.875rem',
                fontWeight: variant === 'h6' ? 500 : 400,
              },
              ...sx,
            }}
            helperText={maxLength ? `${editValue.length}/${maxLength}` : undefined}
          />
          {loading && (
            <CircularProgress size={16} sx={{ color: 'primary.main' }} />
          )}
        </Box>
      </ClickAwayListener>
    );
  }

  return (
    <Typography
      variant={variant}
      color={color}
      onClick={handleClick}
      sx={{
        cursor: disabled ? 'default' : 'pointer',
        minHeight: '1.5em',
        display: 'flex',
        alignItems: 'center',
        position: 'relative',
        '&:hover': !disabled ? {
          bgcolor: 'action.hover',
          borderRadius: 1,
          px: 0.5,
        } : {},
        '&:focus': {
          outline: '2px solid',
          outlineColor: 'primary.main',
          borderRadius: 1,
        },
        px: 0.5,
        py: 0.25,
        borderRadius: 1,
        transition: 'background-color 0.2s ease',
        ...sx,
      }}
      tabIndex={disabled ? -1 : 0}
      role="button"
      aria-label={disabled ? undefined : `Click to edit ${placeholder}`}
    >
      {loading ? (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <CircularProgress size={14} />
          <span>Updating...</span>
        </Box>
      ) : (
        value || (
          <span style={{ color: 'text.secondary', fontStyle: 'italic' }}>
            {placeholder}
          </span>
        )
      )}
    </Typography>
  );
};

export default InlineEditableText;