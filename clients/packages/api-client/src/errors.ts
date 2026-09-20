import type { ProblemDetailResponse } from "@agroloop/api-types";

export class ApiError extends Error {
  readonly status: number;
  readonly code?: string;
  readonly type?: string;
  readonly instance?: string;
  readonly requestId?: string;
  readonly timestamp?: string;
  readonly fieldErrors?: Record<string, string>;
  readonly rawProblem?: ProblemDetailResponse;

  constructor(status: number, message: string, problem?: ProblemDetailResponse) {
    super(problem?.detail || message);
    this.name = "ApiError";
    this.status = status;
    this.code = problem?.code;
    this.type = problem?.type;
    this.instance = problem?.instance;
    this.requestId = problem?.requestId;
    this.timestamp = problem?.timestamp;
    this.fieldErrors = problem?.fieldErrors;
    this.rawProblem = problem;
  }

  isUnauthorized(): boolean {
    return this.status === 401;
  }

  isForbidden(): boolean {
    return this.status === 403;
  }

  isNotFound(): boolean {
    return this.status === 404;
  }

  isConflict(): boolean {
    return this.status === 409;
  }

  isBadRequest(): boolean {
    return this.status === 400;
  }
}
