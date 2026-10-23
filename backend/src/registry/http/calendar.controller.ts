import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Put,
  Query,
  Req,
} from '@nestjs/common';
import { RequireAction } from '../../access/http/access-policy';
import type { AccessRequest } from '../../access/http/access.guard';
import { CalendarService } from '../application/calendar.service';

@Controller('api/v1/universities/:id/calendar')
@RequireAction('operations:manage')
export class CalendarController {
  constructor(private readonly calendar: CalendarService) {}
  @Get() get(@Req() req: AccessRequest, @Param('id') id: string) {
    return this.calendar.get(req.teamUser!.subject, id);
  }
  @Patch() week(
    @Req() req: AccessRequest,
    @Param('id') id: string,
    @Body() body: unknown,
  ) {
    return this.calendar.week(req.teamUser!.subject, id, body);
  }
  @Get('exceptions') exceptions(
    @Req() req: AccessRequest,
    @Param('id') id: string,
    @Query() query: unknown,
  ) {
    return this.calendar.exceptions(req.teamUser!.subject, id, query);
  }
  @Put('exceptions/:date') exception(
    @Req() req: AccessRequest,
    @Param('id') id: string,
    @Param('date') date: string,
    @Body() body: unknown,
  ) {
    return this.calendar.exception(req.teamUser!.subject, id, date, body);
  }
}
