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
import { RequireAction } from '../../access/http/access-policy';
import type { AccessRequest } from '../../access/http/access.guard';
import { FleetService } from '../application/fleet.service';
@Controller('api/v1')
@RequireAction('operations:manage')
export class FleetController {
  constructor(private readonly fleet: FleetService) {}
  @Get('vehicles') vehicles(@Req() r: AccessRequest, @Query() q: unknown) {
    return this.fleet.listVehicles(r.teamUser!.subject, q);
  }
  @Post('vehicles') createVehicle(@Req() r: AccessRequest, @Body() b: unknown) {
    return this.fleet.createVehicle(r.teamUser!.subject, b);
  }
  @Patch('vehicles/:id') updateVehicle(
    @Req() r: AccessRequest,
    @Param('id') id: string,
    @Body() b: unknown,
  ) {
    return this.fleet.updateVehicle(r.teamUser!.subject, id, b);
  }
  @Get('drivers') drivers(@Req() r: AccessRequest, @Query() q: unknown) {
    return this.fleet.listDrivers(r.teamUser!.subject, q);
  }
  @Post('drivers') createDriver(@Req() r: AccessRequest, @Body() b: unknown) {
    return this.fleet.createDriver(r.teamUser!.subject, b);
  }
  @Patch('drivers/:id') updateDriver(
    @Req() r: AccessRequest,
    @Param('id') id: string,
    @Body() b: unknown,
  ) {
    return this.fleet.updateDriver(r.teamUser!.subject, id, b);
  }
  @Get('vehicles/:id/availability') availability(
    @Req() r: AccessRequest,
    @Param('id') id: string,
  ) {
    return this.fleet.availability(r.teamUser!.subject, id);
  }
  @Put('vehicles/:id/availability') setWeek(
    @Req() r: AccessRequest,
    @Param('id') id: string,
    @Body() b: unknown,
  ) {
    return this.fleet.setWeek(r.teamUser!.subject, id, b);
  }
  @Get('vehicles/:id/availability/exceptions') exceptions(
    @Req() r: AccessRequest,
    @Param('id') id: string,
    @Query() q: unknown,
  ) {
    return this.fleet.exceptions(r.teamUser!.subject, id, q);
  }
  @Put('vehicles/:id/availability/exceptions/:date') setException(
    @Req() r: AccessRequest,
    @Param('id') id: string,
    @Param('date') date: string,
    @Body() b: unknown,
  ) {
    return this.fleet.setException(r.teamUser!.subject, id, date, b);
  }
  @Post('fleet/evaluate') evaluate(
    @Req() r: AccessRequest,
    @Body() b: unknown,
  ) {
    return this.fleet.evaluate(r.teamUser!.subject, b);
  }
}
