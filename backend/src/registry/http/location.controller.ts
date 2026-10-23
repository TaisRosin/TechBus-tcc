import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Query,
  Req,
} from '@nestjs/common';
import type { AccessRequest } from '../../access/http/access.guard';
import { RequireAction } from '../../access/http/access-policy';
import { LocationService } from '../application/location.service';

@Controller('api/v1')
@RequireAction('operations:manage')
export class LocationController {
  constructor(private readonly places: LocationService) {}
  @Get('groups') groups(@Req() req: AccessRequest, @Query() q: unknown) {
    return this.places.list(req.teamUser!.subject, 'group', q);
  }
  @Post('groups') createGroup(
    @Req() req: AccessRequest,
    @Body() body: unknown,
  ) {
    return this.places.create(req.teamUser!.subject, 'group', body);
  }
  @Patch('groups/:id') updateGroup(
    @Req() req: AccessRequest,
    @Param('id') id: string,
    @Body() body: unknown,
  ) {
    return this.places.update(req.teamUser!.subject, 'group', id, body);
  }
  @Get('regions') regions(@Req() req: AccessRequest, @Query() q: unknown) {
    return this.places.list(req.teamUser!.subject, 'region', q);
  }
  @Post('regions') createRegion(
    @Req() req: AccessRequest,
    @Body() body: unknown,
  ) {
    return this.places.create(req.teamUser!.subject, 'region', body);
  }
  @Patch('regions/:id') updateRegion(
    @Req() req: AccessRequest,
    @Param('id') id: string,
    @Body() body: unknown,
  ) {
    return this.places.update(req.teamUser!.subject, 'region', id, body);
  }
  @Get('boarding-points') points(
    @Req() req: AccessRequest,
    @Query() q: unknown,
  ) {
    return this.places.list(req.teamUser!.subject, 'point', q);
  }
  @Post('boarding-points') createPoint(
    @Req() req: AccessRequest,
    @Body() body: unknown,
  ) {
    return this.places.create(req.teamUser!.subject, 'point', body);
  }
  @Patch('boarding-points/:id') updatePoint(
    @Req() req: AccessRequest,
    @Param('id') id: string,
    @Body() body: unknown,
  ) {
    return this.places.update(req.teamUser!.subject, 'point', id, body);
  }
  @Post('return-locations/resolve') resolve(
    @Req() req: AccessRequest,
    @Body() body: unknown,
  ) {
    return this.places.resolveReturn(req.teamUser!.subject, body);
  }
  @Get('students/:id/location-defaults') defaults(
    @Req() req: AccessRequest,
    @Param('id') id: string,
  ) {
    return this.places.defaults(req.teamUser!.subject, id);
  }
  @Put('students/:id/location-defaults/pickup') pickup(
    @Req() req: AccessRequest,
    @Param('id') id: string,
    @Body() body: unknown,
  ) {
    return this.places.setDefault(req.teamUser!.subject, id, 'pickup', body);
  }
  @Put('students/:id/location-defaults/dropoff') dropoff(
    @Req() req: AccessRequest,
    @Param('id') id: string,
    @Body() body: unknown,
  ) {
    return this.places.setDefault(req.teamUser!.subject, id, 'dropoff', body);
  }
}
