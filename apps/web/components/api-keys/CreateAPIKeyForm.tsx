'use client';

import { useState, useEffect } from 'react';
import { Label } from '@/components/ui/label';
import type { IntegrationType } from '@/lib/constants/api-key-scopes';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Info } from 'lucide-react';
import { INTEGRATION_SCOPES } from '@/lib/constants/api-key-scopes';

interface CreateAPIKeyFormProps {
    keyName: string;
    setKeyName: (name: string) => void;
    scopes: string;
    setScopes: (scopes: string) => void;
    expiresInDays: string;
    setExpiresInDays: (days: string) => void;
}

export function CreateAPIKeyForm({
    keyName,
    setKeyName,
    scopes,
    setScopes,
    expiresInDays,
    setExpiresInDays,
}: CreateAPIKeyFormProps) {
    const [integrationType, setIntegrationType] = useState<IntegrationType | ''>('');
    const [selectedScopes, setSelectedScopes] = useState<Set<string>>(new Set());

    // Update scopes when integration type changes
    useEffect(() => {
        if (integrationType) {
            const integration = INTEGRATION_SCOPES[integrationType];
            // Auto-select all required scopes
            const required = new Set(integration.requiredScopes.map(s => s.value));
            setSelectedScopes(required);
            setExpiresInDays(integration.recommendedExpiry.toString());
        } else {
            setSelectedScopes(new Set());
        }
    }, [integrationType, setExpiresInDays]);

    // Update scopes string when selected scopes change
    useEffect(() => {
        setScopes(Array.from(selectedScopes).join(','));
    }, [selectedScopes, setScopes]);

    const toggleScope = (scope: string, isRequired: boolean) => {
        if (isRequired) return; // Can't toggle required scopes

        setSelectedScopes(prev => {
            const next = new Set(prev);
            if (next.has(scope)) {
                next.delete(scope);
            } else {
                next.add(scope);
            }
            return next;
        });
    };

    const integration = integrationType ? INTEGRATION_SCOPES[integrationType] : null;

    return (
        <div className="space-y-4 py-4">
            {/* Integration Type */}
            <div className="space-y-2">
                <Label htmlFor="integration-type">Tipe Integrasi *</Label>
                <Select
                    value={integrationType}
                    onValueChange={(value) => setIntegrationType(value as IntegrationType)}
                >
                    <SelectTrigger id="integration-type">
                        <SelectValue placeholder="Pilih tipe integrasi" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="HRIS">HRIS Integration</SelectItem>
                        <SelectItem value="FINANCE">Finance Integration</SelectItem>
                        <SelectItem value="SMART_MILL_SCALE">Smart Mill Scale</SelectItem>
                    </SelectContent>
                </Select>
                {integration && (
                    <Alert>
                        <Info className="h-4 w-4" />
                        <AlertDescription>{integration.description}</AlertDescription>
                    </Alert>
                )}
            </div>

            {/* Key Name */}
            <div className="space-y-2">
                <Label htmlFor="name">Nama Kunci *</Label>
                <Input
                    id="name"
                    placeholder={
                        integrationType === 'HRIS'
                            ? 'HRIS Production'
                            : integrationType === 'FINANCE'
                                ? 'Finance Production'
                            : integrationType === 'SMART_MILL_SCALE'
                                ? 'Smart Mill Scale - PKS '
                                : 'Nama kunci API'
                    }
                    value={keyName}
                    onChange={(e) => setKeyName(e.target.value)}
                />
            </div>

            {/* Scopes */}
            {integration && (
                <div className="space-y-3">
                    <Label>Permissions</Label>

                    {/* Required Scopes */}
                    <div className="space-y-2">
                        <div className="text-sm font-medium text-muted-foreground">
                            Required Permissions
                        </div>
                        <div className="space-y-2 pl-2 border-l-2 border-primary/20">
                            {integration.requiredScopes.map((scope) => (
                                <div key={scope.value} className="flex items-start space-x-2">
                                    <Checkbox
                                        id={scope.value}
                                        checked={selectedScopes.has(scope.value)}
                                        disabled
                                        className="mt-1"
                                    />
                                    <div className="flex-1">
                                        <label
                                            htmlFor={scope.value}
                                            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 flex items-center gap-2"
                                        >
                                            {scope.label}
                                            <Badge variant="secondary" className="text-xs">
                                                Required
                                            </Badge>
                                        </label>
                                        <p className="text-xs text-muted-foreground mt-1">
                                            {scope.description}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Optional Scopes */}
                    <div className="space-y-2">
                        <div className="text-sm font-medium text-muted-foreground">
                            Optional Permissions (for monitoring)
                        </div>
                        <div className="space-y-2 pl-2">
                            {integration.optionalScopes.map((scope) => (
                                <div key={scope.value} className="flex items-start space-x-2">
                                    <Checkbox
                                        id={scope.value}
                                        checked={selectedScopes.has(scope.value)}
                                        onCheckedChange={() => toggleScope(scope.value, false)}
                                        className="mt-1"
                                    />
                                    <div className="flex-1">
                                        <label
                                            htmlFor={scope.value}
                                            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                                        >
                                            {scope.label}
                                        </label>
                                        <p className="text-xs text-muted-foreground mt-1">
                                            {scope.description}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* Expiry */}
            <div className="space-y-2">
                <Label htmlFor="expires">Kedaluwarsa Dalam (hari)</Label>
                <Input
                    id="expires"
                    type="number"
                    placeholder="365"
                    value={expiresInDays}
                    onChange={(e) => setExpiresInDays(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                    Recommended: {integration?.recommendedExpiry || 365} days for{' '}
                    {integrationType === 'HRIS'
                        ? 'HRIS'
                        : integrationType === 'FINANCE'
                            ? 'Finance'
                            : integrationType === 'SMART_MILL_SCALE'
                                ? 'Smart Mill Scale'
                                : 'this integration'}
                </p>
            </div>

            {/* Selected Scopes Preview */}
            {selectedScopes.size > 0 && (
                <div className="space-y-2">
                    <Label>Selected Scopes ({selectedScopes.size})</Label>
                    <div className="flex flex-wrap gap-1 p-2 border rounded-md bg-muted/30">
                        {Array.from(selectedScopes).map((scope) => (
                            <Badge key={scope} variant="outline" className="text-xs">
                                {scope}
                            </Badge>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
