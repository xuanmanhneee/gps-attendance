import {
  Body,
  Controller,
  Get,
  HttpStatus,
  Param,
  Post,
  Put,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';

import {
  CreateIntegrationSessionDto,
  SyncIntegrationUnitsDto,
  SyncIntegrationUsersDto,
  SyncIntegrationCoursesDto,
  SyncIntegrationAccountsDto,
} from './dto/integration.dto';
import { IntegrationApiKeyGuard } from './integration-api-key.guard';
import { IntegrationService } from './integration.service';

@Controller('v1/integration')
@UseGuards(IntegrationApiKeyGuard)
export class IntegrationController {
  constructor(private readonly integration: IntegrationService) {}

  @Put('units')
  syncUnits(@Body() dto: SyncIntegrationUnitsDto) {
    return this.integration.syncUnits(dto.units);
  }

  @Put('users')
  syncUsers(@Body() dto: SyncIntegrationUsersDto) {
    return this.integration.syncUsers(dto);
  }

  @Put('courses')
  syncCourses(@Body() dto: SyncIntegrationCoursesDto) {
    return this.integration.syncCourses(dto.courses);
  }

  @Put('accounts')
  syncAccounts(@Body() dto: SyncIntegrationAccountsDto) {
    return this.integration.syncAccounts(dto.users);
  }

  @Post('sessions')
  async createSession(
    @Body() dto: CreateIntegrationSessionDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    const result = await this.integration.createSession(dto);
    response.status(result.created ? HttpStatus.CREATED : HttpStatus.OK);
    return this.integration.getSession(result.externalId);
  }

  @Get('sessions/:externalId')
  getSession(@Param('externalId') externalId: string) {
    return this.integration.getSession(externalId);
  }

  @Get('sessions/:externalId/records')
  getRecords(@Param('externalId') externalId: string) {
    return this.integration.getRecords(externalId);
  }

  @Post('sessions/:externalId/cancel')
  cancelSession(@Param('externalId') externalId: string) {
    return this.integration.cancelSession(externalId);
  }
}
