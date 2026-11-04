import {
  Body,
  Controller,
  Header,
  HttpCode,
  Param,
  Post,
  Req,
} from '@nestjs/common';
import { RequireAction } from '../access/http/access-policy';
import type { AccessRequest } from '../access/http/access.guard';
import { InterpretationService } from './service';
import { InterpretationApplication } from './application';
@Controller('api/v1/integrations/whatsapp/events')
@RequireAction('operations:manage')
export class InterpretationController {
  constructor(
    private readonly service: InterpretationService,
    private readonly application: InterpretationApplication,
  ) {}
  @Post(':id/apply')
  @HttpCode(200)
  @Header('Cache-Control', 'no-store')
  apply(
    @Req() request: AccessRequest,
    @Param('id') id: string,
    @Body() body: unknown,
  ) {
    return this.application.apply(request.teamUser!.subject, id, body);
  }
  @Post(':id/interpret')
  @HttpCode(200)
  @Header('Cache-Control', 'no-store')
  interpret(
    @Req() request: AccessRequest,
    @Param('id') id: string,
    @Body() body: unknown,
  ) {
    return this.service.interpret(request.teamUser!.subject, id, body);
  }
}
