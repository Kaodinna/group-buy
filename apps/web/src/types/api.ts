export interface ApiSuccessResponse<T> {
  success: true;
  message: string;
  data: T;
}

export interface ApiErrorResponse {
  success: false;
  message: string;
  code: string;
}

export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse;
