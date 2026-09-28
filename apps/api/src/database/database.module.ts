import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';

@Module({
  imports: [
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        uri: configService.get<string>('mongodbUri'),
        retryWrites: true,
        maxPoolSize: 20,
        minPoolSize: 2,
        serverSelectionTimeoutMS: 10_000,
        socketTimeoutMS: 45_000,
      }),
    }),
  ],
})
export class DatabaseModule {}
