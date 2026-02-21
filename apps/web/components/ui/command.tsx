'use client';

import * as React from 'react';
import { DialogProps } from '@radix-ui/react-dialog';
import { Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Dialog, DialogContent } from '@/components/ui/dialog';

interface CommandContextValue {
  search: string;
  setSearch: (search: string) => void;
  filtered: { count: number; items: Map<string, number> };
}

const CommandContext = React.createContext<CommandContextValue | undefined>(undefined);

const useCommandContext = () => {
  const context = React.useContext(CommandContext);
  if (!context) {
    throw new Error('useCommandContext must be used within a Command');
  }
  return context;
};

interface CommandProps extends React.HTMLAttributes<HTMLDivElement> {
  loop?: boolean;
  shouldFilter?: boolean;
  filter?: (value: string, search: string) => number;
}

const Command = React.forwardRef<HTMLDivElement, CommandProps>(
  ({ className, shouldFilter = true, filter, ...props }, ref) => {
    const [search, setSearch] = React.useState('');
    const [filtered, setFiltered] = React.useState<{ count: number; items: Map<string, number> }>({
      count: 0,
      items: new Map(),
    });

    const filterFn = filter || ((value: string, search: string) => {
      return value.toLowerCase().includes(search.toLowerCase()) ? 1 : 0;
    });

    React.useEffect(() => {
      if (!shouldFilter) {
        setFiltered({ count: 0, items: new Map() });
        return;
      }

      const items = new Map<string, number>();
      let count = 0;

      // This is a simplified version - in practice, you'd want to filter actual items
      if (search) {
        count = 1; // Placeholder logic
      }

      setFiltered({ count, items });
    }, [search, shouldFilter, filterFn]);

    return (
      <CommandContext.Provider value={{ search, setSearch, filtered }}>
        <div
          ref={ref}
          className={cn(
            'flex h-full w-full flex-col overflow-hidden rounded-md bg-popover text-popover-foreground',
            className
          )}
          {...props}
        />
      </CommandContext.Provider>
    );
  }
);
Command.displayName = 'Command';

interface CommandDialogProps extends DialogProps {}

const CommandDialog = ({ children, ...props }: CommandDialogProps) => {
  return (
    <Dialog {...props}>
      <DialogContent className="overflow-hidden p-0 shadow-lg">
        <Command className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-muted-foreground [&_[cmdk-group]:not([hidden])_~[cmdk-group]]:pt-0 [&_[cmdk-group]]:px-2 [&_[cmdk-input-wrapper]_svg]:h-5 [&_[cmdk-input-wrapper]_svg]:w-5 [&_[cmdk-input]]:h-12 [&_[cmdk-item]]:px-2 [&_[cmdk-item]]:py-3 [&_[cmdk-item]_svg]:h-5 [&_[cmdk-item]_svg]:w-5">
          {children}
        </Command>
      </DialogContent>
    </Dialog>
  );
};

const CommandInput = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>(({ className, ...props }, ref) => {
  const { setSearch } = useCommandContext();

  return (
    <div className="flex items-center border-b px-3">
      <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
      <input
        ref={ref}
        className={cn(
          'flex h-11 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50',
          className
        )}
        onChange={(e) => setSearch(e.target.value)}
        {...props}
      />
    </div>
  );
});
CommandInput.displayName = 'CommandInput';

const CommandList = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn('max-h-[300px] overflow-y-auto overflow-x-hidden', className)}
    {...props}
  />
));
CommandList.displayName = 'CommandList';

const CommandEmpty = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => {
  const { filtered } = useCommandContext();
  
  if (filtered.count > 0) return null;
  
  return (
    <div
      ref={ref}
      className={cn('py-6 text-center text-sm text-muted-foreground', className)}
      {...props}
    />
  );
});
CommandEmpty.displayName = 'CommandEmpty';

const CommandGroup = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      'overflow-hidden p-1 text-foreground [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-muted-foreground',
      className
    )}
    {...props}
  />
));
CommandGroup.displayName = 'CommandGroup';

const CommandSeparator = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn('-mx-1 h-px bg-border', className)}
    {...props}
  />
));
CommandSeparator.displayName = 'CommandSeparator';

const CommandItem = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    value?: string;
    onSelect?: (value: string) => void;
    disabled?: boolean;
  }
>(({ className, onSelect, value, disabled, ...props }, ref) => {
  const handleSelect = () => {
    if (disabled) return;
    if (onSelect && value) {
      onSelect(value);
    }
  };

  return (
    <div
      ref={ref}
      className={cn(
        'relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none data-[disabled=true]:pointer-events-none data-[selected=true]:bg-accent data-[selected=true]:text-accent-foreground data-[disabled=true]:opacity-50',
        !disabled && 'cursor-pointer hover:bg-accent hover:text-accent-foreground',
        className
      )}
      onClick={handleSelect}
      data-disabled={disabled}
      {...props}
    />
  );
});
CommandItem.displayName = 'CommandItem';

const CommandShortcut = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLSpanElement>) => {
  return (
    <span
      className={cn(
        'ml-auto text-xs tracking-widest text-muted-foreground',
        className
      )}
      {...props}
    />
  );
};
CommandShortcut.displayName = 'CommandShortcut';

export {
  Command,
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandShortcut,
  CommandSeparator,
};