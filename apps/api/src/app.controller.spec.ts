import { Test, TestingModule } from '@nestjs/testing';
import { getConnectionToken } from '@nestjs/mongoose';
import { ServiceUnavailableException } from '@nestjs/common';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';

describe('AppController', () => {
  let appController: AppController;
  let connection: { readyState: number };

  beforeEach(async () => {
    connection = { readyState: 1 };

    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [AppService, { provide: getConnectionToken(), useValue: connection }],
    }).compile();

    appController = app.get<AppController>(AppController);
  });

  describe('health', () => {
    it('returns an ok status when the database is connected', () => {
      expect(appController.getHealth().status).toBe('ok');
    });

    it('throws when the database is not connected', () => {
      connection.readyState = 0;

      expect(() => appController.getHealth()).toThrow(ServiceUnavailableException);
    });
  });
});
