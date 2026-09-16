import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { TagService } from './tag.service';
import { CreateTagDto } from './dto/create-tag.dto';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AuthenticatedUser } from '../auth/types/authenticated-user.type';

@ApiTags('Tags')
@ApiBearerAuth()
@Controller('tags')
@UseGuards(JwtAuthGuard)
export class TagController {
  constructor(private readonly tagService: TagService) {}

  /**
   * Create a new tag owned by the current user.
   */
  @Post()
  @ApiOperation({ summary: 'Create a tag' })
  create(@Body() dto: CreateTagDto, @CurrentUser() user: AuthenticatedUser) {
    return this.tagService.create(dto.name, user.userId);
  }

  /**
   * Get all tags owned by the current user.
   */
  @Get()
  @ApiOperation({ summary: 'Get my tags' })
  findMine(@CurrentUser() user: AuthenticatedUser) {
    return this.tagService.findByOwner(user.userId);
  }

  /**
   * Get a tag by ID.
   */
  @Get(':id')
  @ApiOperation({ summary: 'Get tag by ID' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.tagService.findById(id);
  }

  /**
   * Get all user IDs assigned to a tag.
   */
  @Get(':tagId/users')
  @ApiOperation({ summary: 'Get users assigned to a tag' })
  async findUsersByTag(
    @Param('tagId', ParseIntPipe) tagId: number,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return await this.tagService.getUserIdsByTag(tagId, user.userId);
  }

  /**
   * Get all tags assigned to a user.
   */
  @Get('users/:userId/tags')
  @ApiOperation({ summary: 'Get tags assigned to a user' })
  findTagsByUser(@Param('userId', ParseIntPipe) userId: number) {
    return this.tagService.findTagsByUser(userId);
  }

  /**
   * Assign a tag to a user.
   */
  @Post(':tagId/users/:userId')
  @ApiOperation({ summary: 'Assign tag to user' })
  assignUser(
    @Param('tagId', ParseIntPipe) tagId: number,
    @Param('userId', ParseIntPipe) userId: number,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.tagService.assignToUser(tagId, userId, user.userId);
  }

  /**
   * Remove a tag from a user.
   */
  @Delete(':tagId/users/:userId')
  @ApiOperation({ summary: 'Unassign tag from user' })
  unassignUser(
    @Param('tagId', ParseIntPipe) tagId: number,
    @Param('userId', ParseIntPipe) userId: number,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.tagService.unassignFromUser(tagId, userId, user.userId);
  }

  /**
   * Delete a tag.
   */
  @Delete(':id')
  @ApiOperation({ summary: 'Delete tag' })
  delete(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.tagService.delete(id, user.userId);
  }
}
