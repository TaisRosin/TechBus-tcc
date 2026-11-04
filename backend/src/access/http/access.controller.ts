import {
  Body,
  Controller,
  Get,
  Header,
  Param,
  Patch,
  Post,
  Req,
} from '@nestjs/common';
import { AccessError, userView } from '../domain/access';
import { AccessService } from '../application/access.service';
import { RequireAction } from './access-policy';
import type { AccessRequest } from './access.guard';

@Controller('api/v1')
export class AccessController {
  constructor(private readonly access: AccessService) {}
  @Get('session')
  @Header('Cache-Control', 'no-store')
  @RequireAction('session')
  session(@Req() req: AccessRequest) {
    return userView(req.teamUser!);
  }
  @Patch('users/:id/access')
  @RequireAction('users:manage')
  change(
    @Req() req: AccessRequest,
    @Param('id') id: string,
    @Body() body: unknown,
  ) {
    return this.access.changeAccess(req.teamUser!.subject, id, body);
  }
  @Post('users/invitations')
  @RequireAction('users:manage')
  invite(): never {
    throw new AccessError('INVITATIONS_REPLACED', 410);
  }
}
