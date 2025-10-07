import React from 'react';
import { Grid, Box, Typography } from '@mui/material';
import WorkItemCard from './WorkItemCard.jsx';
import { motion } from 'framer-motion';

const WorkItemGrid = ({
  items = [],
  itemType,
  onItemClick,
  onEdit,
  onDelete,
  onStatusChange,
  onPriorityChange,
  statusOptions,
  priorityOptions,
  emptyStateProps = {},
  compact = false,
  showDescription = true,
  columns = { xs: 1, sm: 2, md: 3, lg: 4 },
}) => {
  const cardVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: (i) => ({
      opacity: 1,
      y: 0,
      transition: {
        delay: i * 0.05,
        duration: 0.3,
        ease: 'easeOut',
      },
    }),
  };

  if (items.length === 0 && emptyStateProps.show) {
    return (
      <Box sx={{ textAlign: 'center', py: 8, px: 4 }}>
        {emptyStateProps.icon && (
          <Box sx={{ 
            width: 120, 
            height: 120, 
            borderRadius: '50%', 
            bgcolor: 'primary.50', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            mx: 'auto',
            mb: 3
          }}>
            {React.cloneElement(emptyStateProps.icon, { 
              sx: { fontSize: 60, color: 'primary.main' } 
            })}
          </Box>
        )}
        {emptyStateProps.title && (
          <Typography variant="h5" sx={{ fontWeight: 600, mb: 2 }}>
            {emptyStateProps.title}
          </Typography>
        )}
        {emptyStateProps.description && (
          <Typography variant="body1" color="text.secondary" sx={{ mb: 4, maxWidth: 400, mx: 'auto' }}>
            {emptyStateProps.description}
          </Typography>
        )}
        {emptyStateProps.actions && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, justifyContent: 'center', flexWrap: 'wrap' }}>
            {emptyStateProps.actions}
          </Box>
        )}
      </Box>
    );
  }

  return (
    <Grid container spacing={compact ? 2 : 3} sx={{ p: 3 }}>
      {items.map((item, index) => (
        <Grid 
          item 
          key={item.id} 
          xs={columns.xs} 
          sm={columns.sm} 
          md={columns.md} 
          lg={columns.lg}
        >
          <motion.div
            custom={index}
            variants={cardVariants}
            initial="hidden"
            animate="visible"
            style={{ height: '100%' }}
          >
            <WorkItemCard
              item={item}
              itemType={itemType}
              onItemClick={onItemClick}
              onEdit={onEdit}
              onDelete={onDelete}
              onStatusChange={onStatusChange}
              onPriorityChange={onPriorityChange}
              statusOptions={statusOptions}
              priorityOptions={priorityOptions}
              compact={compact}
              showDescription={showDescription}
            />
          </motion.div>
        </Grid>
      ))}
    </Grid>
  );
};

export default WorkItemGrid;