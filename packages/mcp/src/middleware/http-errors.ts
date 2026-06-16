import type { Response } from "express";

export interface JsonRpcErrorBody {
  jsonrpc: "2.0";
  error: {
    code: number;
    message: string;
    data?: Record<string, unknown>;
  };
  id: null;
}

export function sendJsonRpcError(
  res: Response,
  httpStatus: number,
  code: number,
  message: string,
  data?: Record<string, unknown>,
): void {
  const body: JsonRpcErrorBody = {
    jsonrpc: "2.0",
    error: { code, message, ...(data ? { data } : {}) },
    id: null,
  };
  res.status(httpStatus).json(body);
}
