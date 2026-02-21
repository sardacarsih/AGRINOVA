import {
  IsUUID,
  IsString,
  IsDateString,
  IsEnum,
  IsOptional,
  IsNumber,
  IsInt,
  Min,
  Max,
  IsArray,
  ValidateNested,
  MaxLength,
  IsDecimal,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { BaseSyncDto, PaginationDto } from '../common/base.dto';

export enum PanenStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  PKS_RECEIVED = 'PKS_RECEIVED',
  PKS_WEIGHED = 'PKS_WEIGHED',
}

export enum Ripeness {
  MENTAH = 'MENTAH',
  MATANG = 'MATANG',
  LEWAT_MATANG = 'LEWAT_MATANG',
}

export enum Quality {
  EXCELLENT = 'EXCELLENT',
  GOOD = 'GOOD',
  FAIR = 'FAIR',
  POOR = 'POOR',
  REJECT = 'REJECT',
}

export class CreatePanenDto {
  @IsUUID('4')
  blockId: string;

  @IsDateString()
  harvestDate: string;

  @IsUUID('4')
  mandorId: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PanenEmployeeDto)
  employees: PanenEmployeeDto[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TBSRecordDto)
  tbsRecords: TBSRecordDto[];
}

export class UpdatePanenDto {
  @IsOptional()
  @IsDateString()
  harvestDate?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PanenEmployeeDto)
  employees?: PanenEmployeeDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TBSRecordDto)
  tbsRecords?: TBSRecordDto[];
}

export class PanenDto extends BaseSyncDto {
  @IsString()
  panenNumber: string;

  @IsUUID('4')
  blockId: string;

  @IsDateString()
  harvestDate: string;

  @IsUUID('4')
  mandorId: string;

  @IsOptional()
  @IsUUID('4')
  approvedById?: string;

  @IsEnum(PanenStatus)
  status: PanenStatus;

  @IsOptional()
  @IsDateString()
  approvalDate?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  rejectionReason?: string;

  @IsInt()
  @Min(0)
  totalEmployees: number;

  @IsInt()
  @Min(0)
  totalTBS: number;

  @Transform(({ value }) => parseFloat(value))
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  totalWeight: number;

  @Transform(({ value }) => parseFloat(value))
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  totalBrondolan: number;

  @IsOptional()
  @IsEnum(Ripeness)
  averageRipeness?: Ripeness;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;

  @IsOptional()
  @Transform(({ value }) => parseFloat(value))
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  pksWeight?: number;

  @IsOptional()
  @Transform(({ value }) => parseFloat(value))
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  bjr?: number;

  @IsOptional()
  @Transform(({ value }) => parseFloat(value))
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(100)
  oer?: number;

  @IsOptional()
  @Transform(({ value }) => parseFloat(value))
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(100)
  ker?: number;

  // Relations
  block?: any;
  mandor?: any;
  approvedBy?: any;
  employees?: PanenEmployeeDto[];
  tbsRecords?: TBSRecordDto[];
}

export class PanenEmployeeDto {
  @IsOptional()
  @IsUUID('4')
  id?: string;

  @IsUUID('4')
  employeeId: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  role?: string;

  @IsInt()
  @Min(0)
  tbsCount: number;

  @Transform(({ value }) => parseFloat(value))
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  weight: number;

  @Transform(({ value }) => parseFloat(value))
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  brondolan: number;

  @IsOptional()
  @Transform(({ value }) => parseFloat(value))
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  workHours?: number;

  @IsOptional()
  @Transform(({ value }) => parseFloat(value))
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  overtimeHours?: number;

  @IsOptional()
  @IsDateString()
  checkInTime?: string;

  @IsOptional()
  @IsDateString()
  checkOutTime?: string;

  // Relations
  employee?: any;
}

export class TBSRecordDto {
  @IsOptional()
  @IsUUID('4')
  id?: string;

  @IsUUID('4')
  blockId: string;

  @IsUUID('4')
  recordedById: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  tbsNumber?: string;

  @Transform(({ value }) => parseFloat(value))
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  weight: number;

  @IsEnum(Ripeness)
  ripeness: Ripeness;

  @IsEnum(Quality)
  quality: Quality;

  @Transform(({ value }) => parseFloat(value))
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  brondolan: number;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  defects?: string;

  @IsOptional()
  @Transform(({ value }) => parseFloat(value))
  @IsNumber({ maxDecimalPlaces: 6 })
  latitude?: number;

  @IsOptional()
  @Transform(({ value }) => parseFloat(value))
  @IsNumber({ maxDecimalPlaces: 6 })
  longitude?: number;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  palmTreeNumber?: string;

  @IsDateString()
  collectionTime: string;

  @IsOptional()
  @IsDateString()
  transportTime?: string;

  // Relations
  block?: any;
  recordedBy?: any;
}

export class ApprovePanenDto {
  @IsEnum(PanenStatus)
  status: PanenStatus.APPROVED | PanenStatus.REJECTED;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  rejectionReason?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}

export class PanenFilterDto extends PaginationDto {
  @IsOptional()
  @IsUUID('4')
  blockId?: string;

  @IsOptional()
  @IsUUID('4')
  mandorId?: string;

  @IsOptional()
  @IsUUID('4')
  approvedById?: string;

  @IsOptional()
  @IsEnum(PanenStatus)
  status?: PanenStatus;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsEnum(Ripeness)
  averageRipeness?: Ripeness;

  @IsOptional()
  @Transform(({ value }) => parseFloat(value))
  @IsNumber()
  @Min(0)
  minWeight?: number;

  @IsOptional()
  @Transform(({ value }) => parseFloat(value))
  @IsNumber()
  @Min(0)
  maxWeight?: number;
}

export class PanenSummaryDto {
  totalRecords: number;
  totalWeight: number;
  totalTBS: number;
  totalBrondolan: number;
  averageWeight: number;
  statusCounts: Record<PanenStatus, number>;
  ripenessCounts: Record<Ripeness, number>;
  qualityCounts: Record<Quality, number>;
  monthlyTrends: {
    month: string;
    count: number;
    weight: number;
  }[];
}

export class PKSIntegrationDto {
  @IsUUID('4')
  panenId: string;

  @Transform(({ value }) => parseFloat(value))
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  pksWeight: number;

  @IsOptional()
  @Transform(({ value }) => parseFloat(value))
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  bjr?: number;

  @IsOptional()
  @Transform(({ value }) => parseFloat(value))
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(100)
  oer?: number;

  @IsOptional()
  @Transform(({ value }) => parseFloat(value))
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(100)
  ker?: number;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;

  @IsDateString()
  weighedAt: string;

  @IsString()
  @MaxLength(100)
  weighedBy: string;
}