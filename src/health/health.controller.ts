import { Controller, Get } from '@nestjs/common';

// Pinged every 10 min by a cron-job.org job to keep the Render free instance
// from sleeping (15 min idle timeout) — see DEPLOY.md.
@Controller('health')
export class HealthController {
  @Get()
  check() {
    return { status: 'ok' };
  }
}
