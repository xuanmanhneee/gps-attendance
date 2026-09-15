// src/account/account.controller.ts
import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  ParseIntPipe,
  NotFoundException,
  ConflictException,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';

import { AccountService } from './account.service';
import { CreateAccountWithUserDto } from './dto/create-account-with-user.dto';
import type { Account } from './account.model';
import { ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '#auth/guards/jwt-auth.guard';

// Response trả ra ngoài KHÔNG bao giờ chứa passwordHash
type SafeAccount = Omit<Account, 'passwordHash'>;

function toSafeAccount(account: Account): SafeAccount {
  const { passwordHash, ...safe } = account;
  return safe;
}

@Controller('v0/accounts')
export class AccountController {
  constructor(private readonly accountService: AccountService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() dto: CreateAccountWithUserDto) {
    const existing = await this.accountService.findByUsername(dto.username);
    if (existing) {
      throw new ConflictException(`Username "${dto.username}" đã được sử dụng`);
    }

    const { user, account } =
      await this.accountService.createAccountWithUser(dto);

    return {
      user,
      account: toSafeAccount(account),
    };
  }

  @Get(':id')
  async findById(@Param('id', ParseIntPipe) id: number) {
    const account = await this.accountService.findById(id);
    if (!account) {
      throw new NotFoundException(`Account ${id} not found`);
    }
    return toSafeAccount(account);
  }
}
