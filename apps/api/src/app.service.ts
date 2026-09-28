import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import type { Connection } from 'mongoose';

export interface HealthStatus {
  status: 'ok';
  timestamp: string;
  database: 'connected';
}

@Injectable()
export class AppService {
  constructor(@InjectConnection() private readonly connection: Connection) {}

  getHealth(): HealthStatus {
    // readyState 1 = connected. Anything else (0 disconnected, 2
    // connecting, 3 disconnecting) means this instance can't actually
    // serve traffic yet - a load balancer should stop routing to it.
    if (this.connection.readyState !== 1) {
      throw new ServiceUnavailableException('Database connection is not ready');
    }

    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      database: 'connected',
    };
  }
}
