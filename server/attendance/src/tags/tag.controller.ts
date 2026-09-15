// tag.controller.ts
import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  UseGuards,
  Req,
} from '@nestjs/common';
import { TagService } from './tag.service';
import { CreateTagDto } from './dto/create-tag.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AuthenticatedUser } from '../auth/types/authenticated-user.type';
import { ApiBearerAuth } from '@nestjs/swagger';

@ApiBearerAuth()
@Controller('tags')
@UseGuards(JwtAuthGuard)
export class TagController {
  constructor(private readonly tagService: TagService) {}

  @Post()
  create(@Body() dto: CreateTagDto, @CurrentUser() user: AuthenticatedUser) {
    return this.tagService.create(dto.name, user.userId);
  }

  @Delete(':id')
  delete(@Param('id') id: number, @CurrentUser() user: AuthenticatedUser) {
    return this.tagService.delete(id, user.userId);
  }

  @Get(':id')
  findOne(@Param('id') id: number) {
    return this.tagService.findById(id);
  }

  @Get()
  findMine(@CurrentUser() user: AuthenticatedUser) {
    return this.tagService.findByOwner(user.userId);
  }

  @Post(':id/users/:userId')
  assignUser(
    @Param('id') tagId: number,
    @Param('userId') userId: number,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.tagService.assignToUser(tagId, userId, user.userId);
  }

  @Delete(':id/users/:userId')
  unassignUser(
    @Param('id') tagId: number,
    @Param('userId') userId: number,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.tagService.unassignFromUser(tagId, userId, user.userId);
  }
}
