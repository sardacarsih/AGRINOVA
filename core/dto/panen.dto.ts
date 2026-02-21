import { IsString, IsUUID, IsDateString, IsNumber, IsArray, IsOptional, IsEnum, ValidateNested, Min } from 'class-validator';
import { Type } from 'class-transformer';

export enum JenisTbs {
  MENTAH = 'MENTAH',
  MATANG = 'MATANG',
  LEWAT_MATANG = 'LEWAT_MATANG'
}

export enum Shift {
  PAGI = 'PAGI',
  SIANG = 'SIANG',
  MALAM = 'MALAM'
}

export class PanenDetailDto {
  @IsUUID()
  employeeId: string;

  @IsString()
  employeeName: string;

  @IsEnum(JenisTbs)
  jenisTbs: JenisTbs;

  @IsNumber()
  @Min(0)
  jumlahTbs: number;

  @IsNumber()
  @Min(0)
  weight: number; // in kg

  @IsNumber()
  @Min(0)
  @IsOptional()
  brondolan?: number; // loose fruits in kg
}

export class CreatePanenDto {
  @IsUUID()
  blockId: string;

  @IsDateString()
  harvestDate: string;

  @IsEnum(Shift)
  @IsOptional()
  shift?: Shift;

  @IsString()
  @IsOptional()
  notes?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PanenDetailDto)
  employees: PanenDetailDto[];
}

export class PanenUploadDto {
  @IsUUID()
  panenId: string;

  @IsUUID()
  blockId: string;

  @IsDateString()
  harvestDate: string;

  @IsUUID()
  mandorId: string;

  @IsEnum(Shift)
  @IsOptional()
  shift?: Shift;

  @IsString()
  @IsOptional()
  notes?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PanenDetailDto)
  employees: PanenDetailDto[];

  // Sync metadata
  @IsString()
  @IsOptional()
  clientTimestamp?: string;

  @IsString()
  @IsOptional()
  deviceId?: string;
}

export class PanenResponseDto {
  id: string;
  panenNumber: string;
  blockId: string;
  harvestDate: string;
  mandorId: string;
  status: string;
  totalEmployees: number;
  totalTBS: number;
  totalWeight: number;
  totalBrondolan: number;
  createdAt: string;
  updatedAt: string;
  syncStatus: string;
}