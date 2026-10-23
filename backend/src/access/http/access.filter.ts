import {
  Catch,
  type ArgumentsHost,
  type ExceptionFilter,
} from '@nestjs/common';
import type { Response } from 'express';
import { AccessError } from '../domain/access';

@Catch(AccessError)
export class AccessFilter implements ExceptionFilter {
  catch(error: AccessError, host: ArgumentsHost) {
    host
      .switchToHttp()
      .getResponse<Response>()
      .status(error.status)
      .json({ code: error.code });
  }
}
