import { gql } from 'graphql-tag';

// Schedule GraphQL queries and mutations
export const GET_WORK_SCHEDULES = gql`
  query GetWorkSchedules($dateFrom: String, $dateTo: String, $mandorId: ID) {
    workSchedules(dateFrom: $dateFrom, dateTo: $dateTo, mandorId: $mandorId) {
      id
      date
      shift
      block {
        id
        blockCode
        name
      }
      team {
        id
        name
        ketua
        anggota {
          id
          name
          posisi
        }
      }
      workers {
        id
        name
        posisi
        hadir
      }
      status
      weather
      notes
      productivity
      createdAt
      updatedAt
    }
  }
`;

export const GET_TEAM_SCHEDULES = gql`
  query GetTeamSchedules($mandorId: ID!) {
    teamSchedules(mandorId: $mandorId) {
      teamId
      teamName
      leader
      members
      currentBlock
      todayStatus
      productivity
      assignments {
        date
        block
        shift
        status
      }
    }
  }
`;

export const CREATE_WORK_SCHEDULE = gql`
  mutation CreateWorkSchedule($input: WorkScheduleInput!) {
    createWorkSchedule(input: $input) {
      id
      date
      shift
      block {
        id
        blockCode
      }
      team {
        id
        name
      }
      workers {
        id
        name
      }
      status
      notes
    }
  }
`;

export const UPDATE_WORK_SCHEDULE = gql`
  mutation UpdateWorkSchedule($id: ID!, $input: WorkScheduleUpdateInput!) {
    updateWorkSchedule(id: $id, input: $input) {
      id
      date
      shift
      status
      notes
      updatedAt
    }
  }
`;

export const DELETE_WORK_SCHEDULE = gql`
  mutation DeleteWorkSchedule($id: ID!) {
    deleteWorkSchedule(id: $id) {
      success
      message
    }
  }
`;

// Schedule subscriptions
export const SCHEDULE_UPDATED = gql`
  subscription ScheduleUpdated($mandorId: ID!) {
    scheduleUpdated(mandorId: $mandorId) {
      id
      date
      shift
      status
      block {
        blockCode
      }
      team {
        name
      }
    }
  }
`;

export const TEAM_STATUS_UPDATED = gql`
  subscription TeamStatusUpdated($mandorId: ID!) {
    teamStatusUpdated(mandorId: $mandorId) {
      teamId
      teamName
      todayStatus
      productivity
      currentBlock
    }
  }
`;

// TypeScript types
export interface WorkSchedule {
  id: string;
  date: string;
  shift: 'pagi' | 'siang' | 'malam';
  block: {
    id: string;
    blockCode: string;
    name?: string;
  };
  team: {
    id: string;
    name: string;
    ketua?: string;
    anggota?: Array<{
      id: string;
      name: string;
      posisi: string;
    }>;
  };
  workers: Array<{
    id: string;
    name: string;
    posisi: string;
    hadir: boolean;
  }>;
  status: 'planned' | 'active' | 'completed' | 'cancelled';
  weather?: 'sunny' | 'cloudy' | 'rainy';
  notes?: string;
  productivity?: number;
  createdAt: string;
  updatedAt: string;
}

export interface TeamSchedule {
  teamId: string;
  teamName: string;
  leader: string;
  members: number;
  currentBlock: string;
  todayStatus: 'present' | 'partial' | 'absent';
  productivity: number;
  assignments?: Array<{
    date: string;
    block: string;
    shift: string;
    status: string;
  }>;
}

export interface WorkScheduleInput {
  date: string;
  shift: string;
  blockId: string;
  teamId: string;
  workerIds: string[];
  notes?: string;
  weather?: string;
}

export interface WorkScheduleUpdateInput {
  shift?: string;
  blockId?: string;
  teamId?: string;
  workerIds?: string[];
  status?: string;
  notes?: string;
  weather?: string;
  productivity?: number;
}