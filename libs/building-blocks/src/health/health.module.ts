import { Controller, Get, Global, Injectable, Module } from '@nestjs/common'
import { HealthCheck, HealthCheckService, HealthIndicatorFunction, TerminusModule } from '@nestjs/terminus'

@Injectable()
export class HealthService {
  indicators: HealthIndicatorFunction[] = [() => ({ app: { status: 'up' } })]
}

@Controller('health')
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly service: HealthService
  ) {}

  @Get()
  @HealthCheck()
  check() {
    return this.health.check(this.service.indicators)
  }
}

@Global()
@Module({
  imports: [TerminusModule],
  controllers: [HealthController],
  providers: [HealthService],
  exports: [HealthService]
})
export class HealthModule {}
