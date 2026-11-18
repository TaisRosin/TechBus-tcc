import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Req,
  Header,
} from '@nestjs/common';
import type { AccessRequest } from '../access/http/access.guard';
import { RequireAction } from '../access/http/access-policy';
import { exact } from '../registry/domain/registry';
import { MapsService } from './maps.service';

@Controller('api/v1/maps')
@RequireAction('operations:manage')
export class MapsController {
  constructor(private readonly service: MapsService) {}
  @Post('geocode')
  @Header('Cache-Control', 'no-store')
  geocode(@Req() req: AccessRequest, @Body() body: unknown) {
    return this.service.geocode(req.teamUser!.subject, body);
  }
  @Get('groups/:id')
  points(
    @Req() req: AccessRequest,
    @Param('id') id: string,
    @Query() query: unknown,
  ) {
    const value = exact(query, ['mode']);
    return this.service.points(req.teamUser!.subject, id, String(value.mode));
  }
  @Post('route')
  @Header('Cache-Control', 'no-store')
  route(@Req() req: AccessRequest, @Body() body: unknown) {
    return this.service.route(req.teamUser!.subject, body);
  }
}
