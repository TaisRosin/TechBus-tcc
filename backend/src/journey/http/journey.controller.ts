import { Controller, Get, Param, Query, Req } from '@nestjs/common';
import { RequireAction } from '../../access/http/access-policy';
import type { AccessRequest } from '../../access/http/access.guard';
import { exact } from '../../registry/domain/registry';
import { JourneyService } from '../application/journey.service';
@Controller('api/v1/students/:id/journey')
@RequireAction('operations:manage')
export class JourneyController {
  constructor(private readonly journey: JourneyService) {}
  @Get() today(
    @Req() req: AccessRequest,
    @Param('id') id: string,
    @Query() query: unknown,
  ) {
    exact(query, []);
    return this.journey.today(req.teamUser!.subject, id);
  }
}
