export interface BaseEntity {
  id: string;
  createdAt: Date;
  updatedAt: Date;
  version: number;
  syncStatus: 'PENDING' | 'SYNCED' | 'FAILED';
  syncedAt?: Date;
  clientTimestamp?: Date;
  deviceId?: string;
}

export interface AuditableEntity extends BaseEntity {
  createdBy?: string;
  updatedBy?: string;
  deletedAt?: Date;
  deletedBy?: string;
}

export interface CompanyScoped {
  companyId: string;
}

export interface GeolocatedEntity {
  latitude?: number;
  longitude?: number;
  coordinates?: string; // JSON string for complex geo data
}