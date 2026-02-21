import { IsUUID, IsDateString, IsEnum, IsOptional, IsInt, Min } from 'class-validator';
import { Transform, Type } from 'class-transformer';

export enum SyncStatus {
  PENDING = 'PENDING',
  SYNCING = 'SYNCING',
  SYNCED = 'SYNCED',
  FAILED = 'FAILED',
  CONFLICT = 'CONFLICT',
}

export class BaseDto {
  @IsUUID('4')
  id: string;

  @IsDateString()
  createdAt: string;

  @IsDateString()
  updatedAt: string;

  @IsOptional()
  @IsUUID('4')
  createdBy?: string;

  @IsOptional()
  @IsUUID('4')
  updatedBy?: string;
}

export class BaseSyncDto extends BaseDto {
  @IsEnum(SyncStatus)
  syncStatus: SyncStatus;

  @IsOptional()
  @IsDateString()
  syncedAt?: string;

  @IsInt()
  @Min(1)
  version: number;
}

export class PaginationDto {
  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  @IsInt()
  @Min(1)
  limit?: number = 20;

  @IsOptional()
  search?: string;

  @IsOptional()
  sortBy?: string;

  @IsOptional()
  @IsEnum(['asc', 'desc'])
  sortOrder?: 'asc' | 'desc' = 'desc';
}

export class PaginatedResponseDto<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;

  constructor(data: T[], total: number, page: number, limit: number) {
    this.data = data;
    this.total = total;
    this.page = page;
    this.limit = limit;
    this.totalPages = Math.ceil(total / limit);
    this.hasNext = page < this.totalPages;
    this.hasPrev = page > 1;
  }
}

export class ResponseDto<T> {
  success: boolean;
  message?: string;
  data?: T;
  error?: any;
  timestamp: string;

  constructor(success: boolean, data?: T, message?: string, error?: any) {
    this.success = success;
    this.data = data;
    this.message = message;
    this.error = error;
    this.timestamp = new Date().toISOString();
  }

  static success<T>(data?: T, message?: string): ResponseDto<T> {
    return new ResponseDto(true, data, message);
  }

  static error<T>(error: any, message?: string): ResponseDto<T> {
    return new ResponseDto(false, undefined, message, error);
  }
}

export class FilterDto {
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsUUID('4')
  companyId?: string;

  @IsOptional()
  @IsUUID('4')
  estateId?: string;

  @IsOptional()
  @IsUUID('4')
  divisiId?: string;

  @IsOptional()
  @IsUUID('4')
  blockId?: string;

  @IsOptional()
  @IsEnum(SyncStatus)
  syncStatus?: SyncStatus;

  @IsOptional()
  isActive?: boolean;
}