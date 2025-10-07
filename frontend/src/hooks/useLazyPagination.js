import { useState, useMemo } from 'react';

export const useLazyPagination = (items, pageSize = 5, initialPage = 1) => {
  const [currentPage, setCurrentPage] = useState(initialPage);

  // Calculate total pages
  const totalPages = Math.ceil(items.length / pageSize);
  
  // Get current page items
  const currentItems = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    return items.slice(startIndex, endIndex);
  }, [items, currentPage, pageSize]);

  // Navigation functions
  const goToNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  const goToPrevPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  const goToPage = (page) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  const resetPagination = () => {
    setCurrentPage(1);
  };

  // Pagination info
  const hasNext = currentPage < totalPages;
  const hasPrev = currentPage > 1;
  const startIndex = (currentPage - 1) * pageSize + 1;
  const endIndex = Math.min(currentPage * pageSize, items.length);

  return {
    currentPage,
    pageSize,
    totalPages,
    currentItems,
    hasNext,
    hasPrev,
    startIndex,
    endIndex,
    totalItems: items.length,
    goToNextPage,
    goToPrevPage,
    goToPage,
    resetPagination,
  };
};