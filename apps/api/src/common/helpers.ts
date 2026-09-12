// Standard API response helpers

export function success<T>(data: T, message?: string) {
  return {
    success: true,
    data,
    message: message || null,
    errors: [],
  };
}

export function paginated<T>(
  data: T[],
  total: number,
  page: number,
  pageSize: number,
) {
  return {
    success: true,
    data,
    message: null,
    errors: [],
    meta: {
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
    },
  };
}

export function parsePagination(query: {
  page?: string;
  pageSize?: string;
  sortBy?: string;
  sortOrder?: string;
}) {
  const page = Math.max(1, parseInt(query.page || "1", 10));
  const pageSize = Math.min(
    100,
    Math.max(1, parseInt(query.pageSize || "25", 10)),
  );
  const sortBy = query.sortBy || "createdAt";
  const sortOrder = (query.sortOrder === "asc" ? "asc" : "desc") as
    "asc" | "desc";
  const skip = (page - 1) * pageSize;

  return { page, pageSize, sortBy, sortOrder, skip };
}
