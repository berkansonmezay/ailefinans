import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from "@nestjs/common";
import { Response } from "express";

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = "Beklenmeyen bir hata oluştu.";
    let errors: any[] = [];

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === "string") {
        message = exceptionResponse;
      } else if (
        typeof exceptionResponse === "object" &&
        exceptionResponse !== null
      ) {
        const resp = exceptionResponse as any;
        message = resp.message || message;
        if (Array.isArray(resp.message)) {
          errors = resp.message.map((msg: string) => ({
            code: "VALIDATION_ERROR",
            message: msg,
          }));
          message = "Doğrulama hatası oluştu.";
        }
      }
    } else if (exception instanceof Error) {
      console.error("Unhandled error:", exception);
      message =
        process.env.NODE_ENV === "development" ? exception.message : message;
    }

    response.status(status).json({
      success: false,
      data: null,
      message,
      errors,
    });
  }
}
