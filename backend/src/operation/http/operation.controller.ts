import { Body, Controller, Get, Post, Put, Query, Req } from '@nestjs/common';
import { RequireAction } from '../../access/http/access-policy';
import type { AccessRequest } from '../../access/http/access.guard';
import { exact } from '../../registry/domain/registry';
import { OperationService } from '../application/operation.service';
@Controller('api/v1/operations/current')
@RequireAction('operations:manage')
export class OperationController {
  constructor(private readonly operation: OperationService) {}
  @Get() current(@Req() r: AccessRequest, @Query() q: unknown) {
    exact(q, []);
    return this.operation.current(r.teamUser!.subject);
  }
  @Post('vehicle-options') options(
    @Req() r: AccessRequest,
    @Body() b: unknown,
  ) {
    return this.operation.options(r.teamUser!.subject, b);
  }
  @Put('planning') draft(@Req() r: AccessRequest, @Body() b: unknown) {
    return this.operation.saveDraft(r.teamUser!.subject, b);
  }
  @Post('planning/confirm') confirm(
    @Req() r: AccessRequest,
    @Body() b: unknown,
  ) {
    return this.operation.confirm(r.teamUser!.subject, b);
  }
}
