import { Body, Controller, Get, Param, Post, Query, Req } from '@nestjs/common';
import { RequireAction } from '../../access/http/access-policy';
import type { AccessRequest } from '../../access/http/access.guard';
import { MessageService } from '../application/message.service';
@Controller('api/v1/messages')
@RequireAction('operations:manage')
export class MessageController {
  constructor(private readonly messages: MessageService) {}
  @Get() current(@Req() r: AccessRequest, @Query() q: unknown) {
    return this.messages.current(r.teamUser!.subject, q);
  }
  @Post(':id/retry') retry(
    @Req() r: AccessRequest,
    @Param('id') id: string,
    @Body() b: unknown,
  ) {
    return this.messages.retry(r.teamUser!.subject, id, b);
  }
}
