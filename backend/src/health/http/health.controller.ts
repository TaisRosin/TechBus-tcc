import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { CheckReadiness } from '../application/check-readiness';
import { PublicEndpoint } from '../../access/http/access-policy';

@Controller('health')
@PublicEndpoint()
export class HealthController {
  constructor(private readonly readiness: CheckReadiness) {}
  @Get('live')
  live() {
    return { status: 'ok' };
  }
  @Get('ready')
  async ready() {
    const result = await this.readiness.execute();
    if (result.status === 'unavailable')
      throw new ServiceUnavailableException(result);
    return result;
  }
}
