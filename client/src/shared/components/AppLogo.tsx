import { cn } from '@/shared/lib/utils';
import appLogo from '@/assets/images/app_logo.jpg';

interface AppLogoProps {
  className?: string;
  showText?: boolean;
  textClassName?: string;
}

export const AppLogo: React.FC<AppLogoProps> = ({
  className,
  showText = true,
  textClassName,
}) => {
  return (
    <div className={cn('flex items-center gap-2', className)}>
      <img
        src={appLogo}
        alt="Kendo Bakery"
        className="h-8 w-8 rounded-md object-contain border border-border bg-white/80 shadow-sm"
        onError={(e) => {
          const target = e.currentTarget;
          target.style.display = 'none';
        }}
      />
      {showText && (
        <div className={cn('leading-tight', textClassName)}>
          <p className="text-sm font-bold tracking-tight">
            Central <span className="text-primary">Kitchen</span>
          </p>
          <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
            Management System
          </p>
        </div>
      )}
    </div>
  );
};

