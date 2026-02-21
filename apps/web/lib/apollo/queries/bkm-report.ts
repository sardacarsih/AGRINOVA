import { gql } from '@apollo/client';

export const GET_BKM_POTONG_BUAH_REPORT = gql`
  query BkmPotongBuahReport($filter: BkmPotongBuahFilter!) {
    bkmPotongBuahReport(filter: $filter) {
      totalRecords
      totalQty
      totalJumlah
      estates {
        periode
        estate
        totalRecords
        totalQty
        totalJumlah
        divisions {
          divisi
          totalQty
          totalJumlah
          totalRecords
          blocks {
            blok
            totalQty
            totalJumlah
            totalRecords
            details {
              tanggal
              mandor
              nik
              nama
              qty
              satuan
              jumlah
            }
          }
        }
      }
    }
  }
`;

export interface BkmPotongBuahDetail {
  tanggal: string;
  mandor: string;
  nik: string;
  nama: string;
  qty: number;
  satuan: string;
  jumlah: number;
}

export interface BkmPotongBuahBlock {
  blok: string;
  totalQty: number;
  totalJumlah: number;
  totalRecords: number;
  details: BkmPotongBuahDetail[];
}

export interface BkmPotongBuahDivision {
  divisi: string;
  totalQty: number;
  totalJumlah: number;
  totalRecords: number;
  blocks: BkmPotongBuahBlock[];
}

export interface BkmPotongBuahEstate {
  periode: number;
  estate: string;
  totalRecords: number;
  totalQty: number;
  totalJumlah: number;
  divisions: BkmPotongBuahDivision[];
}

export interface BkmPotongBuahSummary {
  totalRecords: number;
  totalQty: number;
  totalJumlah: number;
  estates: BkmPotongBuahEstate[];
}

export interface BkmPotongBuahFilter {
  periode: number;
  companyId?: string;
  estate?: string;
  divisi?: string;
  blok?: string;
}

export interface BkmPotongBuahReportData {
  bkmPotongBuahReport: BkmPotongBuahSummary;
}

export interface BkmPotongBuahReportVars {
  filter: BkmPotongBuahFilter;
}

export const GET_BKM_POTONG_BUAH_FLAT = gql`
  query BkmPotongBuahFlat($filter: BkmPotongBuahFilter!, $page: Int!, $limit: Int!) {
    bkmPotongBuahFlat(filter: $filter, page: $page, limit: $limit) {
      data {
        tanggal
        companyCode
        companyName
        estate
        divisi
        blok
        nik
        nama
        qtyp1
        satp1
        qtyp2
        satp2
        qty
        satuan
        jumlah
      }
      total
      summary {
        totalQty
        totalJumlah
        totalHk
        bgm
        outputPerHk
      }
    }
  }
`;

export const GET_BKM_POTONG_BUAH_FLAT_SUMMARY = gql`
  query BkmPotongBuahFlatSummary($filter: BkmPotongBuahFilter!, $page: Int!, $limit: Int!) {
    bkmPotongBuahFlat(filter: $filter, page: $page, limit: $limit) {
      total
      summary {
        totalQty
        totalJumlah
        totalHk
        bgm
        outputPerHk
      }
    }
  }
`;

export const GET_BKM_POTONG_BUAH_ANALYTICS = gql`
  query BkmPotongBuahAnalytics($filter: BkmPotongBuahFilter!, $topN: Int) {
    bkmPotongBuahAnalytics(filter: $filter, topN: $topN) {
      totalRecords
      summary {
        totalQty
        totalJumlah
        totalHk
        bgm
        outputPerHk
      }
      daily {
        date
        outputQty
        totalJumlah
        workerCount
      }
      companies {
        name
        outputQty
      }
      estates {
        name
        outputQty
      }
      divisions {
        name
        outputQty
      }
      blocks {
        name
        outputQty
      }
      harvesters {
        nik
        name
        outputQty
      }
    }
  }
`;

export interface BkmPotongBuahFlatItem {
  tanggal: string;
  companyCode: string;
  companyName: string;
  estate: string;
  divisi: string;
  blok: string;
  nik: string;
  nama: string;
  qtyp1: number;
  satp1: string;
  qtyp2: number;
  satp2: string;
  qty: number;
  satuan: string;
  jumlah: number;
}

export interface BkmPotongBuahKPI {
  totalQty: number;
  totalJumlah: number;
  totalHk: number;
  bgm: number;
  outputPerHk: number;
}

export interface BkmPotongBuahFlatResponse {
  data: BkmPotongBuahFlatItem[];
  total: number;
  summary: BkmPotongBuahKPI;
}

export interface BkmPotongBuahFlatSummaryResponse {
  total: number;
  summary: BkmPotongBuahKPI;
}

export interface BkmPotongBuahDailyPoint {
  date: string;
  outputQty: number;
  totalJumlah: number;
  workerCount: number;
}

export interface BkmPotongBuahOutputPoint {
  name: string;
  outputQty: number;
}

export interface BkmPotongBuahHarvesterPoint {
  nik: string;
  name: string;
  outputQty: number;
}

export interface BkmPotongBuahAnalyticsResponse {
  totalRecords: number;
  summary: BkmPotongBuahKPI;
  daily: BkmPotongBuahDailyPoint[];
  companies: BkmPotongBuahOutputPoint[];
  estates: BkmPotongBuahOutputPoint[];
  divisions: BkmPotongBuahOutputPoint[];
  blocks: BkmPotongBuahOutputPoint[];
  harvesters: BkmPotongBuahHarvesterPoint[];
}

export interface BkmPotongBuahFlatData {
  bkmPotongBuahFlat: BkmPotongBuahFlatResponse;
}

export interface BkmPotongBuahFlatSummaryData {
  bkmPotongBuahFlat: BkmPotongBuahFlatSummaryResponse;
}

export interface BkmPotongBuahAnalyticsData {
  bkmPotongBuahAnalytics: BkmPotongBuahAnalyticsResponse;
}

export interface BkmPotongBuahFlatVars {
  filter: BkmPotongBuahFilter;
  page: number;
  limit: number;
}

export interface BkmPotongBuahAnalyticsVars {
  filter: BkmPotongBuahFilter;
  topN?: number;
}
