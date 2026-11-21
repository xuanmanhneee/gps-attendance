import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import { UnitTreeResponse } from '@gps-attendance/shared';

import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CreateUnitDto } from './dto/create-unit.dto';
import { UpdateUnitDto } from './dto/update-unit.dto';
import { Unit } from './unit.model';
import { UnitNode } from './unit-tree.model';
import { UnitService } from './units.service';

@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('units')
export class UnitController {
  constructor(private readonly unitService: UnitService) {}

  @Roles('admin', 'organizer')
  @Get()
  async findAll(): Promise<Unit[]> {
    return this.unitService.findAll();
  }

  @Roles('admin', 'organizer')
  @Get('tree')
  async getTree(): Promise<UnitTreeResponse[]> {
    const forest = await this.unitService.getForest();

    return forest.trees.map((tree) => this.serialize(tree.root));
  }

  @Roles('admin', 'organizer')
  @Get(':id')
  async findById(@Param('id', ParseIntPipe) id: number): Promise<Unit | null> {
    return this.unitService.findById(id);
  }

  @Roles('admin')
  @Post()
  async create(@Body() input: CreateUnitDto): Promise<Unit> {
    return this.unitService.create(input);
  }

  @Roles('admin')
  @Patch(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() input: UpdateUnitDto,
  ): Promise<Unit> {
    return this.unitService.update(id, input);
  }

  private serialize(node: UnitNode): UnitTreeResponse {
    return {
      id: node.id,
      name: node.name,
      level: node.level,
      children: node.children.map((child) => this.serialize(child)),
    };
  }
}
