import React from 'react';
import {
  Box,
  Pagination,
  Typography,
  FormControl,
  Select,
  MenuItem,
} from '@mui/material';

const PaginationComponent = ({ 
  totalItems, 
  itemsPerPage, 
  currentPage, 
  onPageChange, 
  onItemsPerPageChange,
  itemType = 'items',
  showItemsPerPage = true,
  pageSizeOptions = [5, 10, 20, 50],
}) => {
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const startItem = (currentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(currentPage * itemsPerPage, totalItems);

  if (totalItems === 0) {
    return null;
  }

  return (
    <Box
      sx={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: 2,
        py: 2,
        px: 1,
        borderTop: '1px solid',
        borderColor: 'divider',
        backgroundColor: 'background.paper',
      }}
    >
      {/* Items count and per-page selector */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        <Typography variant="body2" color="text.secondary">
          Showing {startItem}-{endItem} of {totalItems} {itemType}
        </Typography>
        
        {showItemsPerPage && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant="body2" color="text.secondary">
              Items per page:
            </Typography>
            <FormControl size="small" variant="outlined">
              <Select
                value={itemsPerPage}
                onChange={(e) => onItemsPerPageChange(e.target.value)}
                sx={{
                  minWidth: 70,
                  '& .MuiOutlinedInput-notchedOutline': {
                    borderColor: 'divider',
                  },
                  '&:hover .MuiOutlinedInput-notchedOutline': {
                    borderColor: 'primary.main',
                  },
                }}
              >
                {pageSizeOptions.map((option) => (
                  <MenuItem key={option} value={option}>
                    {option}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
        )}
      </Box>

      {/* Pagination controls */}
      {totalPages > 1 && (
        <Pagination
          count={totalPages}
          page={currentPage}
          onChange={(event, value) => onPageChange(value)}
          variant="outlined"
          shape="rounded"
          color="primary"
          size="medium"
          showFirstButton
          showLastButton
          sx={{
            '& .MuiPaginationItem-root': {
              borderColor: 'divider',
              '&:hover': {
                backgroundColor: 'action.hover',
              },
              '&.Mui-selected': {
                backgroundColor: 'primary.main',
                color: 'primary.contrastText',
                borderColor: 'primary.main',
                '&:hover': {
                  backgroundColor: 'primary.dark',
                },
              },
            },
          }}
        />
      )}
    </Box>
  );
};

export default PaginationComponent;