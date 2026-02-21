'use client';

import { useQuery } from '@apollo/client/react';
import { gql } from 'graphql-tag';
import type { Company, Estate, Division, MasterFilters } from '@/types/master-data';

const GET_COMPANIES = gql`
  query GetCompanies($filters: MasterFilters) {
    companies(filters: $filters) {
      id
      nama
      kode
      alamat
      telepon
      email
      isActive
    }
  }
`;

export function useCompanies(filters?: MasterFilters) {
  const { data, loading, error } = useQuery<{ companies: Company[] }>(GET_COMPANIES, {
    variables: { filters },
  });

  return {
    companies: data?.companies || [],
    isLoading: loading,
    error,
  };
}


