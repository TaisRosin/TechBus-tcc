import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import { RegistryService } from '../application/registry.service';
import { RequireAction } from '../../access/http/access-policy';
import type { AccessRequest } from '../../access/http/access.guard';

@Controller('api/v1')
@RequireAction('operations:manage')
export class RegistryController {
  constructor(private readonly registry: RegistryService) {}
  @Get('universities') universities(@Req() req: AccessRequest) {
    return this.registry.universities(req.teamUser!.subject);
  }
  @Get('students') students(
    @Req() req: AccessRequest,
    @Query() query: unknown,
  ) {
    return this.registry.students(req.teamUser!.subject, query);
  }
  @Get('students/:id') student(
    @Req() req: AccessRequest,
    @Param('id') id: string,
  ) {
    return this.registry.student(req.teamUser!.subject, id);
  }
  @Post('students') create(@Req() req: AccessRequest, @Body() body: unknown) {
    return this.registry.createStudent(req.teamUser!.subject, body);
  }
  @Patch('students/:id') update(
    @Req() req: AccessRequest,
    @Param('id') id: string,
    @Body() body: unknown,
  ) {
    return this.registry.updateStudent(req.teamUser!.subject, id, body);
  }
  @Get('students/:id/contracts') contracts(
    @Req() req: AccessRequest,
    @Param('id') id: string,
  ) {
    return this.registry.contracts(req.teamUser!.subject, id);
  }
  @Post('students/:id/contracts') addContract(
    @Req() req: AccessRequest,
    @Param('id') id: string,
    @Body() body: unknown,
  ) {
    return this.registry.addContract(req.teamUser!.subject, id, body);
  }
  @Patch('contracts/:id') updateContract(
    @Req() req: AccessRequest,
    @Param('id') id: string,
    @Body() body: unknown,
  ) {
    return this.registry.updateContract(req.teamUser!.subject, id, body);
  }
}
