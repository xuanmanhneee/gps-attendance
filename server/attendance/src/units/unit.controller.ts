import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
} from '@nestjs/common';
import { UnitTreeResponse } from '@gps-attendance/shared';

import { CreateUnitInput, Unit, UpdateUnitInput } from './unit.model';
import { UnitNode } from './unit-tree.model';
import { UnitService } from './units.service';

@Controller('units')
export class UnitController {
  constructor(private readonly unitService: UnitService) {}

  @Get()
  async findAll(): Promise<Unit[]> {
    return this.unitService.findAll();
  }

  @Get('tree')
  async getTree(): Promise<UnitTreeResponse[]> {
    const forest = await this.unitService.getForest();

    return forest.trees.map((tree) => this.serialize(tree.root));
  }

  @Get(':id')
  async findById(@Param('id', ParseIntPipe) id: number): Promise<Unit | null> {
    return this.unitService.findById(id);
  }

  @Post()
  async create(@Body() input: CreateUnitInput): Promise<Unit> {
    return this.unitService.create(input);
  }

  @Patch(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() input: UpdateUnitInput,
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
