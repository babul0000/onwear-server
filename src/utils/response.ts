import { Response } from 'express';

export interface MetaData {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export const sendSuccessResponse = (
  res: Response,
  statusCode: number,
  message: string,
  data: any
) => {
  return res.status(statusCode).json({
    success: true,
    message,
    data
  });
};

export const sendPaginatedResponse = (
  res: Response,
  statusCode: number,
  message: string,
  data: any[],
  meta: MetaData
) => {
  return res.status(statusCode).json({
    success: true,
    message,
    data,
    meta
  });
};
