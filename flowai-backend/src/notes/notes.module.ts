import { Module, forwardRef } from '@nestjs/common';
import { NotesService } from './notes.service';
import { NotesController } from './notes.controller';
import { FilesModule } from '../files/files.module';
import { AiModule } from '../ai/ai.module';

@Module({
  imports: [forwardRef(() => FilesModule), AiModule],
  controllers: [NotesController],
  providers: [NotesService],
  exports: [NotesService],
})
export class NotesModule {}
