import {
  GET_DIVISIONS,
  GET_DIVISIONS_BY_COMPANY,
  GET_DIVISIONS_BY_ESTATE,
  GET_DIVISION,
  CREATE_DIVISION,
  UPDATE_DIVISION,
  DELETE_DIVISION,
  GET_DIVISION_STATS,
  type GraphQLDivision,
  type DivisionWithBlocks,
  type GetDivisionsResponse,
  type GetDivisionsByCompanyResponse,
  type GetDivisionsByEstateResponse,
  type GetDivisionResponse,
  type CreateDivisionInput,
  type UpdateDivisionInput,
  type CreateDivisionResponse,
  type UpdateDivisionResponse,
  type DeleteDivisionResponse,
  type DivisionStats,
  type GetDivisionStatsResponse
} from '@/lib/apollo/queries/division';

export class DivisionAPI {
  // Get all divisions with optional filtering
  static async getDivisions(variables?: {
    companyId?: string;
    estateId?: string;
    search?: string;
    isActive?: boolean;
    page?: number;
    limit?: number;
  }): Promise<{ data: GraphQLDivision[]; pagination: any }> {
    const response = await fetch('/api/graphql', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: GET_DIVISIONS.loc?.source.body,
        variables
      })
    });

    const result = await response.json();
    if (result.errors) {
      throw new Error(result.errors[0].message);
    }

    return result.data.divisions;
  }

  // Get divisions by company
  static async getDivisionsByCompany(companyId: string): Promise<GraphQLDivision[]> {
    const response = await fetch('/api/graphql', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: GET_DIVISIONS_BY_COMPANY.loc?.source.body,
        variables: { companyId }
      })
    });

    const result = await response.json();
    if (result.errors) {
      throw new Error(result.errors[0].message);
    }

    return result.data.divisionsByCompany;
  }

  // Get divisions by estate
  static async getDivisionsByEstate(estateId: string): Promise<GraphQLDivision[]> {
    const response = await fetch('/api/graphql', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: GET_DIVISIONS_BY_ESTATE.loc?.source.body,
        variables: { estateId }
      })
    });

    const result = await response.json();
    if (result.errors) {
      throw new Error(result.errors[0].message);
    }

    return result.data.divisionsByEstate;
  }

  // Get single division by ID
  static async getDivision(id: string): Promise<DivisionWithBlocks> {
    const response = await fetch('/api/graphql', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: GET_DIVISION.loc?.source.body,
        variables: { id }
      })
    });

    const result = await response.json();
    if (result.errors) {
      throw new Error(result.errors[0].message);
    }

    return result.data.division;
  }

  // Create new division
  static async createDivision(input: CreateDivisionInput): Promise<GraphQLDivision> {
    const response = await fetch('/api/graphql', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: CREATE_DIVISION.loc?.source.body,
        variables: { input }
      })
    });

    const result = await response.json();
    if (result.errors) {
      throw new Error(result.errors[0].message);
    }

    return result.data.createDivision;
  }

  // Update existing division
  static async updateDivision(input: UpdateDivisionInput): Promise<GraphQLDivision> {
    const response = await fetch('/api/graphql', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: UPDATE_DIVISION.loc?.source.body,
        variables: { input }
      })
    });

    const result = await response.json();
    if (result.errors) {
      throw new Error(result.errors[0].message);
    }

    return result.data.updateDivision;
  }

  // Delete division
  static async deleteDivision(id: string): Promise<boolean> {
    const response = await fetch('/api/graphql', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: DELETE_DIVISION.loc?.source.body,
        variables: { id }
      })
    });

    const result = await response.json();
    if (result.errors) {
      throw new Error(result.errors[0].message);
    }

    return result.data.deleteDivision;
  }

  // Get division statistics
  static async getDivisionStats(id: string): Promise<DivisionStats> {
    const response = await fetch('/api/graphql', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: GET_DIVISION_STATS.loc?.source.body,
        variables: { id }
      })
    });

    const result = await response.json();
    if (result.errors) {
      throw new Error(result.errors[0].message);
    }

    return result.data.divisionStats;
  }
}