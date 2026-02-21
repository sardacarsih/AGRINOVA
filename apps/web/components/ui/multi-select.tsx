'use client';

import * as React from 'react';
import { Check, ChevronsUpDown, X, Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

export interface MultiSelectOption {
  value: string;
  label: string;
  description?: string;
}

interface MultiSelectProps {
  options: MultiSelectOption[];
  selected: string[];
  onSelectionChange: (selected: string[]) => void;
  placeholder?: string;
  emptyMessage?: string;
  maxDisplayed?: number;
  disabled?: boolean;
  loading?: boolean;
  className?: string;
}

export function MultiSelect({
  options,
  selected,
  onSelectionChange,
  placeholder = 'Select items...',
  emptyMessage = 'No items found',
  maxDisplayed = 3,
  disabled = false,
  loading = false,
  className
}: MultiSelectProps) {
  const [open, setOpen] = React.useState(false);
  const [searchTerm, setSearchTerm] = React.useState('');

  const selectedOptions = options.filter(option => selected.includes(option.value));
  const availableOptions = options.filter(option => !selected.includes(option.value));

  // Filter options based on search term
  const filteredOptions = React.useMemo(() => {
    if (!searchTerm) return options;
    return options.filter(option => 
      option.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
      option.description?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [options, searchTerm]);

  const availableFilteredOptions = filteredOptions.filter(option => !selected.includes(option.value));
  const selectedFilteredOptions = filteredOptions.filter(option => selected.includes(option.value));

  const handleSelect = (optionValue: string) => {
    const isAlreadySelected = selected.includes(optionValue);
    
    if (isAlreadySelected) {
      onSelectionChange(selected.filter(value => value !== optionValue));
    } else {
      onSelectionChange([...selected, optionValue]);
    }
  };

  const handleRemove = (optionValue: string) => {
    onSelectionChange(selected.filter(value => value !== optionValue));
  };

  const handleClearAll = () => {
    onSelectionChange([]);
  };

  const displayText = React.useMemo(() => {
    if (selected.length === 0) {
      return placeholder;
    }

    if (selected.length <= maxDisplayed) {
      return selectedOptions.map(option => option.label).join(', ');
    }

    const displayedOptions = selectedOptions.slice(0, maxDisplayed);
    const remainingCount = selected.length - maxDisplayed;
    
    return `${displayedOptions.map(option => option.label).join(', ')} +${remainingCount} more`;
  }, [selected, selectedOptions, maxDisplayed, placeholder]);

  return (
    <div className={cn("w-full", className)}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between"
            disabled={disabled || loading}
          >
            <span className="truncate text-left flex-1">
              {loading ? 'Loading...' : displayText}
            </span>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-full p-0" align="start">
          <div className="p-2">
            <Input
              placeholder={`Search ${placeholder.toLowerCase()}...`}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="mb-2"
            />
            <div className="max-h-60 overflow-y-auto">
              {filteredOptions.length === 0 ? (
                <div className="py-6 text-center text-sm text-muted-foreground">
                  {emptyMessage}
                </div>
              ) : (
                <div className="space-y-1">
                  {/* Show selected items that match search first */}
                  {selectedFilteredOptions.map((option) => (
                    <div
                      key={option.value}
                      className="flex items-center space-x-2 p-2 rounded-sm hover:bg-accent cursor-pointer bg-accent/50"
                      onClick={() => handleSelect(option.value)}
                    >
                      <Checkbox checked={true} />
                      <div className="flex-1">
                        <div className="font-medium">{option.label}</div>
                        {option.description && (
                          <div className="text-sm text-muted-foreground">{option.description}</div>
                        )}
                      </div>
                    </div>
                  ))}
                  
                  {/* Show available options that match search */}
                  {availableFilteredOptions.map((option) => (
                    <div
                      key={option.value}
                      className="flex items-center space-x-2 p-2 rounded-sm hover:bg-accent cursor-pointer"
                      onClick={() => handleSelect(option.value)}
                    >
                      <Checkbox checked={false} />
                      <div className="flex-1">
                        <div>{option.label}</div>
                        {option.description && (
                          <div className="text-sm text-muted-foreground">{option.description}</div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </PopoverContent>
      </Popover>

      {/* Selected items display with badges */}
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2">
          {selectedOptions.slice(0, maxDisplayed).map((option) => (
            <Badge
              key={option.value}
              variant="secondary"
              className="text-xs px-2 py-1"
            >
              <span className="mr-1">{option.label}</span>
              <button
                type="button"
                onClick={() => handleRemove(option.value)}
                className="ml-1 hover:bg-secondary-foreground/20 rounded-sm p-0.5"
                disabled={disabled}
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
          
          {selected.length > maxDisplayed && (
            <Badge variant="outline" className="text-xs">
              +{selected.length - maxDisplayed} more
            </Badge>
          )}

          {selected.length > 1 && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleClearAll}
              className="h-6 px-2 text-xs"
              disabled={disabled}
            >
              Clear All
            </Button>
          )}
        </div>
      )}
    </div>
  );
}