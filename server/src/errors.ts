export class ApiError extends Error {
  constructor(
    public statusCode: number,
    public code: string,
    message: string,
  ) {
    super(message);
  }
}
export function notFound(): never {
  throw new ApiError(404, 'NOT_FOUND', 'Запись не найдена.');
}
