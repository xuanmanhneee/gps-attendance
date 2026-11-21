import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  ArrayUnique,
  IsArray,
  IsDateString,
  IsIn,
  IsLatitude,
  IsLongitude,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';

export class IntegrationUnitDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  externalCode!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  parentCode?: string | null;
}

export class SyncIntegrationUnitsDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(2000)
  @ValidateNested({ each: true })
  @Type(() => IntegrationUnitDto)
  units!: IntegrationUnitDto[];
}

export class IntegrationUserDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  code!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  fullname!: string;

  @IsIn(['organizer', 'participant'])
  role!: 'organizer' | 'participant';

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  unitCode!: string;
}

export class SyncIntegrationUsersDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(500)
  @ValidateNested({ each: true })
  @Type(() => IntegrationUserDto)
  users!: IntegrationUserDto[];
}

export class IntegrationTagDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  externalCode!: string;
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name!: string;
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  organizerCode!: string;
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(5000)
  @ArrayUnique()
  @IsString({ each: true })
  participantCodes!: string[];
}

export class SyncIntegrationTagsDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(2000)
  @ValidateNested({ each: true })
  @Type(() => IntegrationTagDto)
  tags!: IntegrationTagDto[];
}

export class CreateIntegrationSessionDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  externalId!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  organizerCode!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  title!: string;

  @IsLatitude()
  latitude!: number;

  @IsLongitude()
  longitude!: number;

  @IsNumber()
  @IsPositive()
  radius!: number;

  @IsDateString()
  openAt!: string;

  @IsDateString()
  closeAt!: string;

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(5000)
  @ArrayUnique()
  @IsString({ each: true })
  participantCodes!: string[];
}
