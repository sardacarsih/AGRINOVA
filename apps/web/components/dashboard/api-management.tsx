'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CircleAlert, Copy, Eye, EyeOff, Key, Plus, RefreshCw, Settings, Trash2, Loader2 } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { ApiManagementService, ApiKey, CreateApiKeyRequest, ApiKeyStats } from '@/lib/api/api-management';

interface ApiKeyWithMasked extends ApiKey {
  maskedKey: string;
  fullKey?: string;
}

interface IntegrationEndpoint {
  method: string;
  path: string;
  description: string;
  example: any;
}

export function ApiManagement() {
  const { toast } = useToast();
  const [apiKeys, setApiKeys] = useState<ApiKeyWithMasked[]>([]);
  const [stats, setStats] = useState<ApiKeyStats | null>(null);
  const [loading, setLoading] = useState(true);

  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newApiKey, setNewApiKey] = useState<CreateApiKeyRequest>({
    name: '',
    application: 'TIMBANGAN',
    description: ''
  });
  const [creating, setCreating] = useState(false);

  const [visibleKeys, setVisibleKeys] = useState<Set<string>>(new Set());

  // Load data on component mount
  useEffect(() => {
    loadApiKeys();
    loadStats();
  }, []);

  const loadApiKeys = async () => {
    try {
      setLoading(true);
      const keys = await ApiManagementService.getAllApiKeys();
      const keysWithMasked = keys.map(key => ({
        ...key,
        maskedKey: `${key.keyPrefix}****...${key.keyPrefix.slice(-5)}`,
        fullKey: key.key
      }));
      setApiKeys(keysWithMasked);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load API keys",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const statsData = await ApiManagementService.getApiKeyStats();
      setStats(statsData);
    } catch (error) {
      console.error('Failed to load API key stats:', error);
    }
  };

  const integrationEndpoints: Record<string, IntegrationEndpoint[]> = {
    TIMBANGAN: [
      {
        method: 'POST',
        path: '/pks/timbang',
        description: 'Record truck weighing data',
        example: {
          company_id: 'KSK',
          truck_no: 'KH1234AB',
          weight: 12500
        }
      }
    ],
    GRADING: [
      {
        method: 'POST',
        path: '/pks/grading',
        description: 'Submit quality grading results',
        example: {
          company_id: 'KSK',
          batch_no: 'BATCH001',
          grade: 'A',
          netto: 3200
        }
      }
    ],
    FINANCE: [
      {
        method: 'POST',
        path: '/finance/transactions',
        description: 'Create financial transactions',
        example: {
          company_id: 'MSL',
          transaction_no: 'TRX20250827001',
          amount: 15000000,
          currency: 'IDR',
          description: 'Pembayaran panen'
        }
      }
    ],
    HRIS: [
      {
        method: 'POST',
        path: '/hris/employees',
        description: 'Manage employee data',
        example: {
          company_id: 'FSL',
          employee_no: 'EMP12345',
          name: 'Budi Santoso',
          position: 'Mandor Panen'
        }
      }
    ]
  };


  const handleCreateApiKey = async () => {
    if (!newApiKey.name || !newApiKey.application) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive"
      });
      return;
    }

    try {
      setCreating(true);
      const createdKey = await ApiManagementService.createApiKey(newApiKey);
      
      const keyWithMasked: ApiKeyWithMasked = {
        ...createdKey,
        maskedKey: `${createdKey.keyPrefix}****...${createdKey.keyPrefix.slice(-5)}`,
        fullKey: createdKey.key
      };
      
      setApiKeys([keyWithMasked, ...apiKeys]);
      setNewApiKey({ name: '', application: 'TIMBANGAN', description: '' });
      setShowCreateDialog(false);
      
      // Show the full key in a separate dialog or alert
      navigator.clipboard.writeText(createdKey.key || '');
      
      toast({
        title: "API Key Created",
        description: `New API key created and copied to clipboard. Please save it securely as it won't be shown again.`,
      });
      
      await loadStats();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create API key",
        variant: "destructive"
      });
    } finally {
      setCreating(false);
    }
  };

  const toggleKeyVisibility = (keyId: string) => {
    const newVisible = new Set(visibleKeys);
    if (newVisible.has(keyId)) {
      newVisible.delete(keyId);
    } else {
      newVisible.add(keyId);
    }
    setVisibleKeys(newVisible);
  };

  const copyToClipboard = async (apiKey: ApiKeyWithMasked) => {
    const textToCopy = visibleKeys.has(apiKey.id) && apiKey.fullKey ? apiKey.fullKey : apiKey.keyPrefix;
    try {
      await navigator.clipboard.writeText(textToCopy);
      toast({
        title: "Copied",
        description: "API key copied to clipboard",
      });
    } catch (err) {
      toast({
        title: "Error",
        description: "Failed to copy to clipboard",
        variant: "destructive"
      });
    }
  };

  const toggleApiKeyStatus = async (keyId: string) => {
    try {
      const updatedKey = await ApiManagementService.toggleApiKeyStatus(keyId);
      
      setApiKeys(apiKeys.map(key => 
        key.id === keyId ? { 
          ...key, 
          isActive: updatedKey.isActive 
        } : key
      ));
      
      toast({
        title: "Status Updated",
        description: `API key ${updatedKey.isActive ? 'activated' : 'deactivated'} successfully`,
      });
      
      await loadStats();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update API key status",
        variant: "destructive"
      });
    }
  };

  const deleteApiKey = async (keyId: string) => {
    try {
      const key = apiKeys.find(k => k.id === keyId);
      await ApiManagementService.deleteApiKey(keyId);
      setApiKeys(apiKeys.filter(k => k.id !== keyId));
      
      toast({
        title: "API Key Deleted",
        description: `API key for ${key?.application} has been deleted`,
      });
      
      await loadStats();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete API key",
        variant: "destructive"
      });
    }
  };

  const regenerateApiKey = async (keyId: string) => {
    try {
      const regeneratedKey = await ApiManagementService.regenerateApiKey(keyId);
      
      const keyWithMasked: ApiKeyWithMasked = {
        ...regeneratedKey,
        maskedKey: `${regeneratedKey.keyPrefix}****...${regeneratedKey.keyPrefix.slice(-5)}`,
        fullKey: regeneratedKey.key
      };
      
      setApiKeys(apiKeys.map(key => 
        key.id === keyId ? keyWithMasked : key
      ));
      
      // Copy new key to clipboard
      if (regeneratedKey.key) {
        await navigator.clipboard.writeText(regeneratedKey.key);
      }
      
      toast({
        title: "API Key Regenerated",
        description: "New API key has been generated and copied to clipboard",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to regenerate API key",
        variant: "destructive"
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Loading API keys...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total API Keys</CardTitle>
              <Key className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
              <p className="text-xs text-muted-foreground">
                {stats.active} active, {stats.inactive} inactive
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Recently Used</CardTitle>
              <RefreshCw className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.recentlyUsed}</div>
              <p className="text-xs text-muted-foreground">
                Used in last 7 days
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Expiring Soon</CardTitle>
              <CircleAlert className="h-4 w-4 text-yellow-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.expiringSoon}</div>
              <p className="text-xs text-muted-foreground">
                Within 30 days
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Most Used</CardTitle>
              <Settings className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {Object.entries(stats.byApplication)
                  .sort(([,a], [,b]) => b - a)[0]?.[0] || 'N/A'}
              </div>
              <p className="text-xs text-muted-foreground">
                Integration type
              </p>
            </CardContent>
          </Card>
        </div>
      )}
      <Alert>
        <CircleAlert className="h-4 w-4" />
        <AlertTitle>API Integration Security</AlertTitle>
        <AlertDescription>
          API keys provide access to internal systems. Keep them secure and rotate regularly.
          All requests must include: <code>Authorization: Bearer {'<API_KEY>'}</code>
        </AlertDescription>
      </Alert>

      <Tabs defaultValue="keys" className="space-y-4">
        <TabsList>
          <TabsTrigger value="keys">API Keys</TabsTrigger>
          <TabsTrigger value="endpoints">Endpoints</TabsTrigger>
          <TabsTrigger value="documentation">Documentation</TabsTrigger>
        </TabsList>

        <TabsContent value="keys" className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold">API Key Management</h3>
              <p className="text-sm text-muted-foreground">
                Manage API keys for internal system integrations
              </p>
            </div>
            <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Create API Key
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create New API Key</DialogTitle>
                  <DialogDescription>
                    Generate a new API key for internal system integration
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label htmlFor="name">API Key Name</Label>
                    <Input
                      id="name"
                      placeholder="e.g., PKS Timbangan System"
                      value={newApiKey.name}
                      onChange={(e) => setNewApiKey({...newApiKey, name: e.target.value})}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="application">Application Type</Label>
                    <Select 
                      value={newApiKey.application} 
                      onValueChange={(value) => setNewApiKey({...newApiKey, application: value as 'TIMBANGAN' | 'GRADING' | 'FINANCE' | 'HRIS'})}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select application type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="TIMBANGAN">Timbangan (PKS Weighing)</SelectItem>
                        <SelectItem value="GRADING">Grading (Quality Control)</SelectItem>
                        <SelectItem value="FINANCE">Finance System</SelectItem>
                        <SelectItem value="HRIS">HRIS (Human Resources)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="description">Description (Optional)</Label>
                    <Input
                      id="description"
                      placeholder="Brief description of the integration"
                      value={newApiKey.description}
                      onChange={(e) => setNewApiKey({...newApiKey, description: e.target.value})}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleCreateApiKey} disabled={creating}>
                    {creating ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      'Create API Key'
                    )}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Application</TableHead>
                    <TableHead>API Key</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Last Used</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {apiKeys.map((apiKey) => (
                    <TableRow key={apiKey.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{apiKey.name}</div>
                          <div className="text-sm text-muted-foreground">
                            Created {apiKey.createdAt.toLocaleDateString()}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={
                          apiKey.application === 'TIMBANGAN' ? 'default' :
                          apiKey.application === 'GRADING' ? 'secondary' :
                          apiKey.application === 'FINANCE' ? 'outline' : 'destructive'
                        }>
                          {apiKey.application}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <code className="text-sm font-mono bg-muted px-2 py-1 rounded">
                            {visibleKeys.has(apiKey.id) && apiKey.fullKey ? apiKey.fullKey : apiKey.maskedKey}
                          </code>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => toggleKeyVisibility(apiKey.id)}
                          >
                            {visibleKeys.has(apiKey.id) ? 
                              <EyeOff className="h-4 w-4" /> : 
                              <Eye className="h-4 w-4" />
                            }
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => copyToClipboard(apiKey)}
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <Switch
                            checked={apiKey.isActive}
                            onCheckedChange={() => toggleApiKeyStatus(apiKey.id)}
                          />
                          <Badge variant={apiKey.isActive ? 'default' : 'secondary'}>
                            {apiKey.isActive ? 'Active' : 'Inactive'}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell>
                        {apiKey.lastUsedAt ? (
                          <div className="text-sm">
                            {new Date(apiKey.lastUsedAt).toLocaleDateString()}<br />
                            <span className="text-muted-foreground">
                              {new Date(apiKey.lastUsedAt).toLocaleTimeString()}
                            </span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">Never</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => regenerateApiKey(apiKey.id)}
                            title="Regenerate API Key"
                          >
                            <RefreshCw className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => deleteApiKey(apiKey.id)}
                            className="text-destructive hover:text-destructive"
                            title="Delete API Key"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="endpoints" className="space-y-4">
          <div>
            <h3 className="text-lg font-semibold">Integration Endpoints</h3>
            <p className="text-sm text-muted-foreground">
              Available API endpoints for internal system integrations
            </p>
          </div>

          <div className="grid gap-4">
            {Object.entries(integrationEndpoints).map(([app, endpoints]) => (
              <Card key={app}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Settings className="h-5 w-5" />
                    {app} Integration
                  </CardTitle>
                  <CardDescription>
                    API endpoints for {app.toLowerCase()} system integration
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {endpoints.map((endpoint, index) => (
                    <div key={index} className="border rounded-lg p-4 space-y-3">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">{endpoint.method}</Badge>
                        <code className="text-sm font-mono">{endpoint.path}</code>
                      </div>
                      <p className="text-sm text-muted-foreground">{endpoint.description}</p>
                      <div className="space-y-2">
                        <Label className="text-sm font-semibold">Request Example:</Label>
                        <pre className="text-xs bg-muted p-3 rounded overflow-x-auto">
                          <code>{JSON.stringify(endpoint.example, null, 2)}</code>
                        </pre>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-sm font-semibold">Headers Required:</Label>
                        <pre className="text-xs bg-muted p-3 rounded">
                          <code>
{`Content-Type: application/json
Authorization: Bearer <API_KEY>`}
                          </code>
                        </pre>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="documentation" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>API Integration Documentation</CardTitle>
              <CardDescription>
                Complete guide for integrating internal systems with Agrinova API
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <h4 className="font-semibold mb-2">Company Identification</h4>
                <p className="text-sm text-muted-foreground mb-3">
                  The <code>company_id</code> can be sent in two formats:
                </p>
                <ul className="text-sm space-y-1 list-disc list-inside">
                  <li><strong>UUID Format:</strong> <code>31e54379-0c8d-470c-ad77-5b6d59ffa234</code></li>
                  <li><strong>Code Format:</strong> <code>KSK</code>, <code>MSL</code>, <code>FSL</code></li>
                </ul>
                <p className="text-sm text-muted-foreground mt-2">
                  Server automatically resolves company codes to UUID format for internal storage.
                </p>
              </div>

              <div>
                <h4 className="font-semibold mb-2">Authentication</h4>
                <p className="text-sm text-muted-foreground mb-3">
                  All API requests must include an API key in the Authorization header:
                </p>
                <pre className="text-sm bg-muted p-3 rounded">
                  <code>Authorization: Bearer {'<API_KEY>'}</code>
                </pre>
              </div>

              <div>
                <h4 className="font-semibold mb-2">Response Format</h4>
                <p className="text-sm text-muted-foreground mb-3">
                  All endpoints return JSON responses with the following structure:
                </p>
                <pre className="text-sm bg-muted p-3 rounded">
                  <code>{`{
  "success": true,
  "data": { ... },
  "message": "Operation successful"
}`}</code>
                </pre>
              </div>

              <div>
                <h4 className="font-semibold mb-2">Error Handling</h4>
                <p className="text-sm text-muted-foreground mb-3">
                  Error responses include detailed information:
                </p>
                <pre className="text-sm bg-muted p-3 rounded">
                  <code>{`{
  "success": false,
  "error": "Invalid company_id",
  "message": "Unknown company identifier: INVALID",
  "code": "COMPANY_NOT_FOUND"
}`}</code>
                </pre>
              </div>

              <div>
                <h4 className="font-semibold mb-2">Rate Limiting</h4>
                <p className="text-sm text-muted-foreground">
                  API requests are rate limited to 100 requests per minute per API key.
                  Exceed this limit and you'll receive a 429 status code.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}