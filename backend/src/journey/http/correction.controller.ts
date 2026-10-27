import { Body, Controller, Get, Param, Post, Query, Req } from '@nestjs/common';
import { RequireAction } from '../../access/http/access-policy';
import type { AccessRequest } from '../../access/http/access.guard';
import { exact } from '../../registry/domain/registry';
import { CorrectionService } from '../application/correction.service';
@Controller('api/v1/students/:id/journey/correction')
@RequireAction('operations:manage')
export class CorrectionController {
  constructor(private readonly correction: CorrectionService) {}
  @Get() current(
    @Req() r: AccessRequest,
    @Param('id') id: string,
    @Query() q: unknown,
  ) {
    exact(q, []);
    return this.correction.current(r.teamUser!.subject, id);
  }
  @Post() correct(
    @Req() r: AccessRequest,
    @Param('id') id: string,
    @Body() b: unknown,
  ) {
    return this.correction.correct(r.teamUser!.subject, id, b);
  }
}
