'use client';

import { useState, useEffect } from 'react';
import { User } from '@/types/auth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ShieldCheckIcon, UserGroupIcon, CogIcon } from '@heroicons/react/24/outline';

interface RoleManagementProps {
  user: User;
  permissionManager: any;
  permissionValidator: any;
  canManage: boolean;
}

interface Role {
  name: string;
  displayName: string;
  level: number;
  description: string;
  color: string;
  icon: React.ComponentType<any>;
  isActive: boolean;
}

export default function RoleManagement({ user, permissionManager, permissionValidator, canManage }: RoleManagementProps) {
  // Fixed 9 roles based on system analysis
  const predefinedRoles: Role[] = [
    {
      name: 'SUPER_ADMIN',
      displayName: 'Super Administrator',
      level: 1,
      description: 'System administrator with full access to all features',
      color: 'bg-purple-100 text-purple-800 border-purple-200',
      icon: ShieldCheckIcon,
      isActive: true
    },
    {
      name: 'AREA_MANAGER',
      displayName: 'Area Manager',
      level: 2,
      description: 'Multi-company oversight and regional management',
      color: 'bg-blue-100 text-blue-800 border-blue-200',
      icon: UserGroupIcon,
      isActive: true
    },
    {
      name: 'COMPANY_ADMIN',
      displayName: 'Company Administrator',
      level: 3,
      description: 'Single company administration and user management',
      color: 'bg-green-100 text-green-800 border-green-200',
      icon: CogIcon,
      isActive: true
    },
    {
      name: 'MANAGER',
      displayName: 'Manager',
      level: 4,
      description: 'Estate management and operational oversight',
      color: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      icon: CogIcon,
      isActive: true
    },
    {
      name: 'ASISTEN',
      displayName: 'Asisten',
      level: 5,
      description: 'Division-level assistant and approval authority',
      color: 'bg-indigo-100 text-indigo-800 border-indigo-200',
      icon: UserGroupIcon,
      isActive: true
    },
    {
      name: 'MANDOR',
      displayName: 'Mandor',
      level: 5,
      description: 'Field supervisor and harvest data collection',
      color: 'bg-orange-100 text-orange-800 border-orange-200',
      icon: UserGroupIcon,
      isActive: true
    },
    {
      name: 'SATPAM',
      displayName: 'Satpam',
      level: 5,
      description: 'Security officer and gate check operations',
      color: 'bg-red-100 text-red-800 border-red-200',
      icon: ShieldCheckIcon,
      isActive: true
    },
    {
      name: 'TIMBANGAN',
      displayName: 'Timbangan',
      level: 5,
      description: 'Weighing operator for PKS integration and scale management',
      color: 'bg-cyan-100 text-cyan-800 border-cyan-200',
      icon: CogIcon,
      isActive: true
    },
    {
      name: 'GRADING',
      displayName: 'Grading',
      level: 5,
      description: 'Quality grader and produce quality inspection',
      color: 'bg-pink-100 text-pink-800 border-pink-200',
      icon: CogIcon,
      isActive: true
    }
  ];

  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Initialize with predefined roles
  useEffect(() => {
    setLoading(false);
  }, []);

  // Filter roles based on search
  const filteredRoles = predefinedRoles.filter(role => {
    const matchesSearch = searchTerm === '' ||
      role.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      role.displayName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      role.description.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  const handleSelectRole = (role: Role) => {
    setSelectedRole(role);
    setError(null);
    setSuccess(`Selected role: ${role.displayName}`);
  };

  const clearSelection = () => {
    setSelectedRole(null);
    setError(null);
    setSuccess(null);
  };

  const getLevelText = (level: number) => {
    const levelMap: { [key: number]: string } = {
      1: 'Super Admin',
      2: 'Area Manager',
      3: 'Company Admin',
      4: 'Manager',
      5: 'Staff Level'
    };
    return levelMap[level] || 'Unknown Level';
  };

  const getLevelBadgeColor = (level: number) => {
    if (level === 1) return 'bg-purple-100 text-purple-800 border-purple-200';
    if (level === 2) return 'bg-blue-100 text-blue-800 border-blue-200';
    if (level === 3) return 'bg-green-100 text-green-800 border-green-200';
    if (level === 4) return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    return 'bg-gray-100 text-gray-800 border-gray-200';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Role Management</h2>
          <p className="text-gray-600">System roles - Fixed configuration (9 roles)</p>
        </div>
        <div className="flex items-center space-x-2">
          <Badge className="bg-blue-100 text-blue-800">
            9 Fixed Roles
          </Badge>
          {selectedRole && (
            <Button
              variant="outline"
              size="sm"
              onClick={clearSelection}
            >
              Clear Selection
            </Button>
          )}
        </div>
      </div>

      {/* Search */}
      <div className="flex items-center space-x-4">
        <div className="flex-1 max-w-md">
          <Input
            type="text"
            placeholder="Search roles by name or description..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full"
          />
        </div>
        <Badge className="bg-gray-100 text-gray-800">
          {filteredRoles.length} / 9 roles
        </Badge>
      </div>

      {/* Information Alert */}
      <Alert className="border-blue-200 bg-blue-50">
        <AlertDescription className="text-blue-800">
          <strong>Fixed Role System:</strong> This system uses 9 predefined roles that cannot be modified, added, or deleted.
          These roles are optimized for agricultural company workflows including special roles for weighing (Timbangan) and quality control (Grading).
        </AlertDescription>
      </Alert>

      {/* Alerts */}
      {error && (
        <Alert className="border-red-200 bg-red-50">
          <AlertDescription className="text-red-800">{error}</AlertDescription>
        </Alert>
      )}
      {success && (
        <Alert className="border-green-200 bg-green-50">
          <AlertDescription className="text-green-800">{success}</AlertDescription>
        </Alert>
      )}

      {/* Role Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredRoles.map((role) => {
          const IconComponent = role.icon;
          const isSelected = selectedRole?.name === role.name;

          return (
            <Card
              key={role.name}
              className={`relative cursor-pointer transition-all hover:shadow-lg ${
                isSelected ? 'ring-2 ring-blue-500 shadow-lg' : 'hover:shadow-md'
              }`}
              onClick={() => handleSelectRole(role)}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-3">
                    <div className={`p-2 rounded-lg ${role.color}`}>
                      <IconComponent className="h-5 w-5" />
                    </div>
                    <div className="flex-1">
                      <CardTitle className="text-lg font-semibold text-gray-900">
                        {role.displayName}
                      </CardTitle>
                      <p className="text-sm text-gray-500 font-mono">{role.name}</p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end space-y-1">
                    <Badge className={getLevelBadgeColor(role.level)}>
                      {getLevelText(role.level)}
                    </Badge>
                    <Badge variant={role.isActive ? 'default' : 'secondary'}>
                      {role.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600 mb-3">{role.description}</p>

                <div className="text-xs text-gray-500 space-y-1">
                  <div className="flex justify-between">
                    <span>Hierarchy Level:</span>
                    <span className="font-medium">{role.level} (1=highest)</span>
                  </div>
                  {(role.name === 'TIMBANGAN' || role.name === 'GRADING') && (
                    <div className="flex justify-between">
                      <span>Special Role:</span>
                      <span className="font-medium text-blue-600">Agricultural</span>
                    </div>
                  )}
                </div>

                {isSelected && (
                  <div className="mt-3 pt-3 border-t border-gray-200">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-blue-600 font-medium">
                        Role selected
                      </span>
                      <Button size="sm" variant="outline" onClick={(e) => {
                        e.stopPropagation();
                        clearSelection();
                      }}>
                        Clear
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Role Statistics */}
      <div className="mt-8 p-4 bg-gray-50 rounded-lg">
        <h3 className="text-lg font-semibold text-gray-900 mb-3">Role Distribution</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900">1</div>
            <div className="text-gray-600">Super Admin</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900">2</div>
            <div className="text-gray-600">Management</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900">5</div>
            <div className="text-gray-600">Level 5 Staff</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900">9</div>
            <div className="text-gray-600">Total Roles</div>
          </div>
        </div>
      </div>

      {/* Current User Role */}
      <div className="mt-6 p-4 bg-blue-50 rounded-lg">
        <h3 className="text-sm font-semibold text-blue-900 mb-2">Your Current Role</h3>
        <div className="flex items-center space-x-3">
          <Badge className="bg-blue-100 text-blue-800">
            {user.role}
          </Badge>
          <span className="text-sm text-blue-700">
            {user.role === user.role.toLowerCase() ? 'System Administrator' : getLevelText(predefinedRoles.find(r => r.name === user.role)?.level || 0)}
          </span>
        </div>
      </div>
    </div>
  );
}