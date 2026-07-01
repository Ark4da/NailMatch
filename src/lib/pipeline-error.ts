export class PipelineError extends Error {
  constructor(
    readonly stage: string,
    message: string,
    readonly cause?: unknown
  ) {
    super(message);
    this.name = "PipelineError";
  }
}

export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === "string") {
    return error;
  }

  return "Unknown error";
}
