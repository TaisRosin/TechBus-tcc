import { Body, Controller, Get, Param, Put, Query, Req } from '@nestjs/common';
import { RequireAction } from '../../access/http/access-policy';
import type { AccessRequest } from '../../access/http/access.guard';
import { exact } from '../../registry/domain/registry';
import { ConsultationService } from '../application/consultation.service';
@Controller('api/v1')
export class ConsultationController {
  constructor(private readonly service: ConsultationService) {}
  @Get('operations/overview')
  @RequireAction('operations:manage')
  overview(@Req() r: AccessRequest, @Query() q: unknown) {
    return this.service.overview(r.teamUser!.subject, q);
  }
  @Get('access/driver-links/:id')
  @RequireAction('users:manage')
  link(@Req() r: AccessRequest, @Param('id') id: string, @Query() q: unknown) {
    exact(q, []);
    return this.service.getLink(r.teamUser!.subject, id);
  }
  @Put('access/driver-links/:id')
  @RequireAction('users:manage')
  setLink(
    @Req() r: AccessRequest,
    @Param('id') id: string,
    @Body() b: unknown,
  ) {
    return this.service.link(r.teamUser!.subject, id, b);
  }
  // Session authenticates the caller; service authorizes every driver and resource in the transaction.
  @Get('driver/trips')
  @RequireAction('session')
  trips(@Req() r: AccessRequest, @Query() q: unknown) {
    exact(q, []);
    return this.service.trips(r.teamUser!.subject);
  }
  @Get('driver/trips/:id')
  @RequireAction('session')
  trip(@Req() r: AccessRequest, @Param('id') id: string, @Query() q: unknown) {
    exact(q, []);
    return this.service.trip(r.teamUser!.subject, id);
  }
}
