import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { GroupBuyParticipant, GroupBuyParticipantSchema } from './schemas/participant.schema.js';
import { ParticipantsService } from './participants.service.js';
import { ParticipantsController } from './participants.controller.js';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: GroupBuyParticipant.name, schema: GroupBuyParticipantSchema },
    ]),
  ],
  controllers: [ParticipantsController],
  providers: [ParticipantsService],
  exports: [ParticipantsService],
})
export class ParticipantsModule {}
