export interface PaginationResult<T> {
  data: T[];
  meta: {
    total: number;
    lastPage: number;
    currentPage: number;
    perPage: number;
    prev: number | null;
    next: number | null;
  };
}

export function generatePagination<T>(
  data: T[],
  total: number,
  page: number,
  limit: number,
): PaginationResult<T> {
  const lastPage = Math.ceil(total / limit);

  return {
    data,
    meta: {
      total,
      lastPage,
      currentPage: page,
      perPage: limit,
      prev: page > 1 ? page - 1 : null,
      next: page < lastPage ? page + 1 : null,
    },
  };
}

export function getPaginationParams(page?: number, limit?: number) {
  const pageNumber = page && page > 0 ? Number(page) : 1;
  const limitNumber = limit && limit > 0 ? Number(limit) : 10;
  const skip = (pageNumber - 1) * limitNumber;

  return {
    skip,
    take: limitNumber,
    page: pageNumber,
    limit: limitNumber,
  };
}
