function buildPaginationMeta(page, limit, totalItems) {
  const totalPages = totalItems === 0 ? 0 : Math.ceil(totalItems / limit);

  return {
    page,
    limit,
    totalItems,
    totalPages
  };
}

module.exports = {
  buildPaginationMeta
};
