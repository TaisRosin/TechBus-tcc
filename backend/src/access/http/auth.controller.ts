import {
  Body,
  Controller,
  Get,
  Header,
  HttpCode,
  Param,
  Post,
  Req,
} from '@nestjs/common';
import { AuthService } from '../application/auth.service';
import { AccessError } from '../domain/access';
import type { AccessRequest } from './access.guard';
import { RequireAction, PublicEndpoint } from './access-policy';

function bearer(req: AccessRequest): string {
  const match = /^Bearer ([^\s]+)$/i.exec(req.headers.authorization ?? '');
  if (!match) throw new AccessError('UNAUTHENTICATED', 401);
  return match[1];
}
@Controller('api/v1')
export class AuthController {
  constructor(private readonly auth: AuthService) {}
  @Post('auth/login')
  @HttpCode(200)
  @Header('Cache-Control', 'no-store')
  @PublicEndpoint()
  login(@Body() body: unknown, @Req() req: AccessRequest) {
    return this.auth.login(body, req.socket.remoteAddress ?? 'local');
  }
  // Restricted tokens are validated by the service, never by the operational verifier.
  @Post('auth/password')
  @HttpCode(204)
  @Header('Cache-Control', 'no-store')
  @PublicEndpoint()
  password(@Body() body: unknown, @Req() req: AccessRequest) {
    return this.auth.changePassword(
      bearer(req),
      body,
      req.socket.remoteAddress ?? 'local',
    );
  }
  @Post('auth/logout')
  @HttpCode(204)
  @Header('Cache-Control', 'no-store')
  @PublicEndpoint()
  logout(@Req() req: AccessRequest) {
    return this.auth.logout(bearer(req));
  }
  @Post('users')
  @Header('Cache-Control', 'no-store')
  @RequireAction('users:manage')
  create(@Req() req: AccessRequest, @Body() body: unknown) {
    return this.auth.create(req.teamUser!.subject, body);
  }
  @Post('users/:id/credentials')
  @Header('Cache-Control', 'no-store')
  @RequireAction('users:manage')
  provision(
    @Req() req: AccessRequest,
    @Param('id') id: string,
    @Body() body: unknown,
  ) {
    return this.auth.provision(req.teamUser!.subject, id, body);
  }
  @Get('users/:id/credentials')
  @Header('Cache-Control', 'no-store')
  @RequireAction('users:manage')
  metadata(@Req() req: AccessRequest, @Param('id') id: string) {
    return this.auth.metadata(req.teamUser!.subject, id);
  }
  @Post('users/:id/password-reset')
  @HttpCode(200)
  @Header('Cache-Control', 'no-store')
  @RequireAction('users:manage')
  reset(
    @Req() req: AccessRequest,
    @Param('id') id: string,
    @Body() body: unknown,
  ) {
    return this.auth.reset(req.teamUser!.subject, id, body);
  }
}
