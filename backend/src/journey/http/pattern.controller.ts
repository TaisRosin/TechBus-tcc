import { Controller, Get, Param, Query, Req } from '@nestjs/common';
import { RequireAction } from '../../access/http/access-policy';
import type { AccessRequest } from '../../access/http/access.guard';
import { exact } from '../../registry/domain/registry';
import { PatternService } from '../application/pattern.service';
@Controller('api/v1/students/:id/location-suggestions')
@RequireAction('operations:manage')
export class PatternController {
  constructor(private readonly patterns: PatternService) {}
  @Get() current(
    @Req() req: AccessRequest,
    @Param('id') id: string,
    @Query() query: unknown,
  ) {
    exact(query, []);
    return this.patterns.current(req.teamUser!.subject, id);
  }
}
