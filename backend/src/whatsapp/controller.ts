import {
  Body,
  Controller,
  Get,
  Header,
  Headers,
  HttpCode,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import { PublicEndpoint, RequireAction } from '../access/http/access-policy';
import type { AccessRequest } from '../access/http/access.guard';
import { WhatsAppService } from './service';
@Controller('api/v1/integrations/whatsapp')
export class WhatsAppController {
  constructor(private readonly service: WhatsAppService) {}
  @Post('webhook')
  @PublicEndpoint()
  @HttpCode(202)
  @Header('Cache-Control', 'no-store')
  receive(
    @Headers('x-techbus-webhook-secret') secret: unknown,
    @Body() body: unknown,
  ) {
    return this.service.receive(secret, body);
  }
  @Get('events')
  @RequireAction('operations:manage')
  @Header('Cache-Control', 'no-store')
  current(@Req() req: AccessRequest, @Query() query: unknown) {
    return this.service.current(req.teamUser!.subject, query);
  }
}
