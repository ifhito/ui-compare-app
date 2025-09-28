export class ApplicationError extends Error {
  constructor(public readonly code: string, message: string, public readonly cause?: Error) {
    super(message);
    this.name = "ApplicationError";
  }
}

export class DomainError extends ApplicationError {
  constructor(code: string, message: string, cause?: Error) {
    super(code, message, cause);
    this.name = "DomainError";
  }
}
