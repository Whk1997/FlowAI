import {
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import { memoryStorage } from 'multer';
import { createReadStream, existsSync } from 'fs';
import { FilesService } from './files.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthUser } from '../common/decorators/current-user.decorator';
import { MAX_FILE_SIZE_BYTES } from './files.constants';
import { NotFoundException } from '@nestjs/common';

@Controller()
@UseGuards(JwtAuthGuard)
export class FilesController {
  constructor(private readonly filesService: FilesService) {}

  @Post('notes/:noteId/files')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: MAX_FILE_SIZE_BYTES },
    }),
  )
  upload(
    @CurrentUser() user: AuthUser,
    @Param('noteId', ParseIntPipe) noteId: number,
    @UploadedFile()
    file?: {
      originalname: string;
      mimetype: string;
      size: number;
      buffer: Buffer;
    },
  ) {
    return this.filesService.upload(user.userId, noteId, file);
  }

  @Get('files/:id')
  findOne(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.filesService.findOne(user.userId, id);
  }

  @Get('files/:id/download')
  async download(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseIntPipe) id: number,
    @Res() res: Response,
  ) {
    const result = await this.filesService.getDownload(user.userId, id);

    if (result.kind === 'redirect') {
      return res.redirect(result.url);
    }

    if (!existsSync(result.path)) {
      throw new NotFoundException('File missing on disk');
    }

    if (result.mimeType) {
      res.setHeader('Content-Type', result.mimeType);
    }
    res.setHeader(
      'Content-Disposition',
      `inline; filename*=UTF-8''${encodeURIComponent(result.name)}`,
    );
    createReadStream(result.path).pipe(res);
  }

  @Delete('files/:id')
  remove(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.filesService.remove(user.userId, id);
  }
}
