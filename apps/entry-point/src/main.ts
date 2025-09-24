import { Logger } from '@nestjs/common'
import { NestFactory } from '@nestjs/core'
import { LoggerErrorInterceptor, Logger as PinoLogger } from 'nestjs-pino'

import { AppModule } from './app.module'
import { cfg } from './config'

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true })

  app.useLogger(app.get(PinoLogger))
  app.useGlobalInterceptors(new LoggerErrorInterceptor())

  await app.listen(cfg.appPort, '0.0.0.0')

  Logger.log(`Server running on port ${String(cfg.appPort)}`, 'Bootstrap')
}

bootstrap()
