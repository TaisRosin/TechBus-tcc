import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Put,
  Query,
  Req,
} from '@nestjs/common';
import { RequireAction } from '../../access/http/access-policy';
import type { AccessRequest } from '../../access/http/access.guard';
import { exact } from '../../registry/domain/registry';
import { ItineraryService } from '../application/itinerary.service';
@Controller('api/v1')
export class ItineraryController {
  constructor(private readonly service: ItineraryService) {}
  @Get('groups/:id/stop-order')
  @RequireAction('operations:manage')
  order(@Req() r: AccessRequest, @Param('id') id: string, @Query() q: unknown) {
    exact(q, []);
    return this.service.order(r.teamUser!.subject, id);
  }
  @Put('groups/:id/stop-order')
  @RequireAction('operations:manage')
  setOrder(
    @Req() r: AccessRequest,
    @Param('id') id: string,
    @Body() b: unknown,
  ) {
    return this.service.setOrder(r.teamUser!.subject, id, b);
  }
  @Get('operations/groups/:id/itinerary')
  @RequireAction('operations:manage')
  preview(
    @Req() r: AccessRequest,
    @Param('id') id: string,
    @Query() q: unknown,
  ) {
    return this.service.preview(r.teamUser!.subject, id, q);
  }
  @Post('operations/groups/:id/itinerary/publish')
  @RequireAction('operations:manage')
  publish(
    @Req() r: AccessRequest,
    @Param('id') id: string,
    @Body() b: unknown,
  ) {
    return this.service.publish(r.teamUser!.subject, id, b);
  }
  @Get('driver/trips/:id/itinerary')
  @RequireAction('session')
  driver(
    @Req() r: AccessRequest,
    @Param('id') id: string,
    @Query() q: unknown,
  ) {
    exact(q, []);
    return this.service.driverItinerary(r.teamUser!.subject, id);
  }
}
