import * as React from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

export interface PasswordInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  error?: boolean;
}

const PasswordInput = React.forwardRef<HTMLInputElement, PasswordInputProps>(
  ({ className, error, ...props }, ref) => {
    const [showPassword, setShowPassword] = React.useState(false);

    return (
      <div className="relative">
        <input
          type={showPassword ? 'text' : 'password'}
          className={cn(
            'flex h-10 w-full rounded-md border border-input bg-background pl-3 pr-12 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
            error && 'border-destructive focus-visible:ring-destructive',
            className
          )}
          ref={ref}
          {...props}
        />
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent min-w-[44px] sm:min-w-[36px] touch-manipulation"
          onClick={() => setShowPassword(!showPassword)}
          disabled={props.disabled}
          tabIndex={-1}
        >
          {showPassword ? (
            <EyeOff className="h-4 w-4 sm:h-4 sm:w-4 text-muted-foreground" />
          ) : (
            <Eye className="h-4 w-4 sm:h-4 sm:w-4 text-muted-foreground" />
          )}
          <span className="sr-only">
            {showPassword ? 'Sembunyikan password' : 'Tampilkan password'}
          </span>
        </Button>
      </div>
    );
  }
);
PasswordInput.displayName = 'PasswordInput';

export { PasswordInput };