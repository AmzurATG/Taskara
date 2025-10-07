import { useState, useMemo } from 'react';

export const usePagination = (items = [], initialItemsPerPage = 10, initialPage = 1) => {
  const [currentPage, setCurrentPage] = useState(initialPage);
  const [itemsPerPage, setItemsPerPage] = useState(initialItemsPerPage);

  // Calculate paginated items
  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return items.slice(startIndex, endIndex);
  }, [items, currentPage, itemsPerPage]);

  // Reset to first page when items change or items per page changes
  const handleItemsPerPageChange = (newItemsPerPage) => {
    setItemsPerPage(newItemsPerPage);
    setCurrentPage(1); // Reset to first page
  };

  // Handle page change
  const handlePageChange = (newPage) => {
    setCurrentPage(newPage);
  };

  // Reset pagination when items array changes significantly
  const resetPagination = () => {
    setCurrentPage(1);
  };

  return {
    currentPage,
    itemsPerPage,
    paginatedItems: paginatedData,
    totalItems: items.length,
    totalPages: Math.ceil(items.length / itemsPerPage),
    handlePageChange,
    handleItemsPerPageChange,
    resetPagination,
  };
};

export default usePagination;