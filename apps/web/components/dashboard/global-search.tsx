'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Search,
  X,
  Building,
  Users,
  MapPin,
  Grid3x3,
  Square,
  UserCheck,
  Crown,
  Globe,
  Shield,
  ChevronRight,
  Filter,
  Clock,
  CheckCircle,
  XCircle,
  CircleAlert
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { User, Company, Estate, Divisi, Block, UserRole } from '@/types/auth';
import { SuperAdminAPI } from '@/lib/api/super-admin-api';

export type SearchEntityType = 'user' | 'company' | 'estate' | 'divisi' | 'block' | 'all';

export interface SearchResult {
  id: string;
  type: SearchEntityType;
  title: string;
  subtitle: string;
  description?: string;
  metadata: {
    status?: string;
    role?: UserRole;
    companyName?: string;
    estateName?: string;
    divisiName?: string;
    createdAt?: Date;
    lastActivity?: Date;
  };
  matches: string[];
  score: number;
}

interface GlobalSearchProps {
  onSearchResults?: (results: SearchResult[]) => void;
  onEntitySelect?: (result: SearchResult) => void;
  placeholder?: string;
  className?: string;
  maxResults?: number;
}

const FILTER_LABELS: Record<SearchEntityType, string> = {
  all: 'Semua',
  user: 'Pengguna',
  company: 'Perusahaan',
  estate: 'Estate',
  divisi: 'Divisi',
  block: 'Blok',
};

export function GlobalSearch({
  onSearchResults,
  onEntitySelect,
  placeholder = "Cari pengguna, perusahaan, estate, divisi, blok...",
  className = "",
  maxResults = 50
}: GlobalSearchProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedFilters, setSelectedFilters] = useState<SearchEntityType[]>(['all']);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [showResults, setShowResults] = useState(false);

  // Real data from API
  const [usersData, setUsersData] = useState<User[]>([]);
  const [companiesData, setCompaniesData] = useState<Company[]>([]);
  const [dataLoaded, setDataLoaded] = useState(false);

  const searchInputRef = useRef<HTMLInputElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

  // Load real data from API on mount
  useEffect(() => {
    const loadData = async () => {
      try {
        const [companies, usersResponse] = await Promise.all([
          SuperAdminAPI.getAllCompanies(),
          SuperAdminAPI.getAllUsers({ limit: 100 })
        ]);
        setCompaniesData(companies);
        setUsersData(usersResponse.data);
        setDataLoaded(true);
      } catch (error) {
        console.error('Gagal memuat data pencarian:', error);
        setDataLoaded(true);
      }
    };
    loadData();
  }, []);

  // Search algorithm with fuzzy matching and scoring
  const performSearch = useCallback((searchQuery: string, filters: SearchEntityType[]): SearchResult[] => {
    if (!searchQuery.trim()) return [];

    const q = searchQuery.toLowerCase();
    const searchResults: SearchResult[] = [];

    const shouldSearchType = (type: SearchEntityType) =>
      filters.includes('all') || filters.includes(type);

    // Search users
    if (shouldSearchType('user')) {
      usersData.forEach(user => {
        const matches: string[] = [];
        let score = 0;

        if (user.name?.toLowerCase().includes(q)) {
          matches.push('nama');
          score += user.name.toLowerCase().indexOf(q) === 0 ? 100 : 80;
        }
        if (user.email?.toLowerCase().includes(q)) {
          matches.push('email');
          score += 70;
        }
        if (user.employeeId?.toLowerCase().includes(q)) {
          matches.push('NIP');
          score += 90;
        }
        if (user.company?.toLowerCase().includes(q)) {
          matches.push('perusahaan');
          score += 50;
        }
        if (user.role?.toLowerCase().includes(q)) {
          matches.push('peran');
          score += 40;
        }

        if (matches.length > 0) {
          searchResults.push({
            id: user.id,
            type: 'user',
            title: user.name,
            subtitle: `${user.employeeId || '-'} • ${user.email}`,
            description: `${user.role} di ${user.company || '-'}`,
            metadata: {
              status: user.status,
              role: user.role,
              companyName: user.company,
              createdAt: user.createdAt,
            },
            matches,
            score
          });
        }
      });
    }

    // Search companies
    if (shouldSearchType('company')) {
      companiesData.forEach(company => {
        const matches: string[] = [];
        let score = 0;

        if (company.name?.toLowerCase().includes(q)) {
          matches.push('nama');
          score += company.name.toLowerCase().indexOf(q) === 0 ? 100 : 80;
        }
        if (company.code?.toLowerCase().includes(q)) {
          matches.push('kode');
          score += 90;
        }

        if (matches.length > 0) {
          searchResults.push({
            id: company.id,
            type: 'company',
            title: company.name,
            subtitle: company.code || '',
            metadata: {
              status: company.isActive ? 'active' : 'inactive',
              createdAt: company.createdAt,
            },
            matches,
            score
          });
        }
      });
    }

    return searchResults
      .sort((a, b) => b.score - a.score)
      .slice(0, maxResults);
  }, [usersData, companiesData, maxResults]);

  // Debounced search
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (query.trim()) {
        setIsSearching(true);
        const searchResults = performSearch(query, selectedFilters);
        setResults(searchResults);
        setShowResults(true);
        onSearchResults?.(searchResults);
        setIsSearching(false);
      } else {
        setResults([]);
        setShowResults(false);
        onSearchResults?.([]);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [query, selectedFilters, onSearchResults, performSearch]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!showResults) return;

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex(prev =>
            prev < results.length - 1 ? prev + 1 : prev
          );
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex(prev => prev > 0 ? prev - 1 : -1);
          break;
        case 'Enter':
          e.preventDefault();
          if (selectedIndex >= 0 && results[selectedIndex]) {
            handleResultSelect(results[selectedIndex]);
          }
          break;
        case 'Escape':
          setShowResults(false);
          setSelectedIndex(-1);
          searchInputRef.current?.blur();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showResults, results, selectedIndex]);

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (resultsRef.current && !resultsRef.current.contains(event.target as Node)) {
        setShowResults(false);
        setSelectedIndex(-1);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleResultSelect = (result: SearchResult) => {
    onEntitySelect?.(result);
    setShowResults(false);
    setSelectedIndex(-1);
    setQuery('');
  };

  const handleFilterToggle = (filter: SearchEntityType) => {
    if (filter === 'all') {
      setSelectedFilters(['all']);
    } else {
      const newFilters = selectedFilters.includes('all')
        ? [filter]
        : selectedFilters.includes(filter)
        ? selectedFilters.filter(f => f !== filter)
        : [...selectedFilters.filter(f => f !== 'all'), filter];

      setSelectedFilters(newFilters.length === 0 ? ['all'] : newFilters);
    }
  };

  const getEntityIcon = (type: SearchEntityType) => {
    switch (type) {
      case 'user': return Users;
      case 'company': return Building;
      case 'estate': return MapPin;
      case 'divisi': return Grid3x3;
      case 'block': return Square;
      default: return Search;
    }
  };

  const getEntityColor = (type: SearchEntityType) => {
    switch (type) {
      case 'user': return 'text-blue-600 bg-blue-100';
      case 'company': return 'text-green-600 bg-green-100';
      case 'estate': return 'text-purple-600 bg-purple-100';
      case 'divisi': return 'text-orange-600 bg-orange-100';
      case 'block': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getRoleIcon = (role: UserRole) => {
    switch (role) {
      case 'SUPER_ADMIN': return Crown;
      case 'COMPANY_ADMIN': return Building;
      case 'AREA_MANAGER': return Globe;
      case 'MANAGER': return MapPin;
      case 'ASISTEN': return UserCheck;
      case 'MANDOR': return Users;
      case 'SATPAM': return Shield;
      case 'TIMBANGAN': return Users;
      case 'GRADING': return Users;
      default: return Users;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active': return CheckCircle;
      case 'inactive': return XCircle;
      case 'suspended': return CircleAlert;
      default: return Clock;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'text-green-600';
      case 'inactive': return 'text-gray-600';
      case 'suspended': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  return (
    <div className={`relative ${className}`}>
      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input
          ref={searchInputRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => query && setShowResults(true)}
          placeholder={placeholder}
          className="pl-10 pr-20"
        />

        {/* Filter Toggle & Clear Button */}
        <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex items-center space-x-1">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setShowFilters(!showFilters)}
            className="h-6 w-6 p-0"
          >
            <Filter className="h-3 w-3" />
          </Button>
          {query && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setQuery('');
                setShowResults(false);
                setSelectedIndex(-1);
              }}
              className="h-6 w-6 p-0"
            >
              <X className="h-3 w-3" />
            </Button>
          )}
        </div>
      </div>

      {/* Filter Pills */}
      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-2 flex flex-wrap gap-2"
          >
            {(['all', 'user', 'company', 'estate', 'divisi', 'block'] as SearchEntityType[]).map(filter => (
              <button
                key={filter}
                onClick={() => handleFilterToggle(filter)}
                className={`px-2 py-1 text-xs rounded-full border transition-colors ${
                  selectedFilters.includes(filter)
                    ? 'bg-blue-100 text-blue-800 border-blue-200'
                    : 'bg-gray-100 text-gray-600 border-gray-200 hover:bg-gray-200'
                }`}
              >
                {FILTER_LABELS[filter]}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Search Results */}
      <AnimatePresence>
        {showResults && (
          <motion.div
            ref={resultsRef}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute top-full mt-2 w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-50 max-h-96 overflow-y-auto"
          >
            {isSearching ? (
              <div className="p-4 text-center">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
                <p className="text-sm text-gray-600 mt-2">Mencari...</p>
              </div>
            ) : results.length > 0 ? (
              <div className="py-2">
                {results.map((result, index) => {
                  const EntityIcon = getEntityIcon(result.type);
                  const isSelected = index === selectedIndex;

                  return (
                    <motion.div
                      key={result.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className={`px-4 py-3 cursor-pointer transition-colors ${
                        isSelected ? 'bg-blue-50 dark:bg-blue-950/30' : 'hover:bg-gray-50 dark:hover:bg-gray-800'
                      }`}
                      onClick={() => handleResultSelect(result)}
                    >
                      <div className="flex items-center space-x-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${getEntityColor(result.type)}`}>
                          <EntityIcon className="h-4 w-4" />
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-2">
                            <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                              {result.title}
                            </p>

                            {result.type === 'user' && result.metadata.role && (
                              <div className={`w-4 h-4 ${getEntityColor('user')}`}>
                                {React.createElement(getRoleIcon(result.metadata.role), {
                                  className: "h-3 w-3"
                                })}
                              </div>
                            )}

                            {result.metadata.status && (
                              <div className={getStatusColor(result.metadata.status)}>
                                {React.createElement(getStatusIcon(result.metadata.status), {
                                  className: "h-3 w-3"
                                })}
                              </div>
                            )}
                          </div>

                          <p className="text-xs text-gray-600 dark:text-gray-400 truncate">
                            {result.subtitle}
                          </p>

                          {result.description && (
                            <p className="text-xs text-gray-500 truncate">
                              {result.description}
                            </p>
                          )}

                          {/* Matched Fields */}
                          <div className="flex items-center space-x-1 mt-1">
                            {result.matches.map(match => (
                              <Badge key={match} variant="secondary" className="text-xs px-1 py-0">
                                {match}
                              </Badge>
                            ))}
                          </div>
                        </div>

                        <ChevronRight className="h-4 w-4 text-gray-400" />
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            ) : (
              <div className="p-4 text-center">
                <Search className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                <p className="text-sm text-gray-600">
                  Tidak ditemukan hasil untuk &quot;{query}&quot;
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Coba kata kunci lain atau ubah filter
                </p>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
