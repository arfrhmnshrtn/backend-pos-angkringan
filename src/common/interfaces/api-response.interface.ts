export interface ApiResponse<T> {
  readonly success: boolean;
  readonly message: string;
  readonly data?: T;
  readonly errors?: Record<string, string[]>;
}

export interface ApiSuccessResponse<T> extends ApiResponse<T> {
  readonly success: true;
  readonly data: T;
}

export interface ApiErrorResponse extends ApiResponse<never> {
  readonly success: false;
  readonly errors?: Record<string, string[]>;
}
