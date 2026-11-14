import React from 'react';
import {
  ShieldCheck,
  HeartHandshake,
  CircleDollarSign,
  Terminal,
  Users,
  GraduationCap,
  Shield,
} from 'lucide-react';
import { AllowedRole } from '../../types/auth';
import { getRoleMeta } from '../../utils/roleUtils';
import { clsx } from 'clsx';

interface RoleBadgeProps {
  role: AllowedRole;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  variant?: 'subtle' | 'solid' | 'outline';
  showIcon?: boolean;
  className?: string;
}

export const RoleBadge: React.FC<RoleBadgeProps> = ({
  role,
  size = 'md',
  variant = 'subtle',
  showIcon = false,
  className,
}) => {
  const meta = getRoleMeta(role);

  const getIcon = () => {
    const iconSizeClass =
      size === 'xs'
        ? 'w-3 h-3'
        : size === 'sm'
        ? 'w-3.5 h-3.5'
        : size === 'lg'
        ? 'w-5 h-5'
        : 'w-4 h-4';

    switch (role) {
      case 'admin':
        return <ShieldCheck className={iconSizeClass} />;
      case 'hr':
        return <HeartHandshake className={iconSizeClass} />;
      case 'finance':
        return <CircleDollarSign className={iconSizeClass} />;
      case 'engineering':
        return <Terminal className={iconSizeClass} />;
      case 'intern':
        return <GraduationCap className={iconSizeClass} />;
      case 'all_employees':
        return <Users className={iconSizeClass} />;
      default:
        return <Shield className={iconSizeClass} />;
    }
  };

  const sizeClasses = {
    xs: 'px-2 py-0.5 text-[11px] gap-1 font-medium tracking-tight',
    sm: 'px-2.5 py-0.5 text-xs gap-1.5 font-medium',
    md: 'px-3 py-1 text-xs gap-1.5 font-semibold tracking-wide',
    lg: 'px-4 py-1.5 text-sm gap-2 font-semibold',
  }[size];

  const variantClass = () => {
    switch (variant) {
      case 'solid':
        return `${meta.solidBgClass} shadow-sm`;
      case 'outline':
        return `bg-transparent border-2 ${meta.borderClass} ${meta.textClass}`;
      case 'subtle':
      default:
        return `${meta.bgClass} border border-current/20`;
    }
  };

  return (
    <span
      className={clsx(
        'inline-flex items-center rounded-md transition-all duration-200 select-none uppercase',
        sizeClasses,
        variantClass(),
        className
      )}
      title={`${meta.label}: ${meta.description}`}
    >
      {showIcon && getIcon()}
      <span>{meta.shortLabel}</span>
    </span>
  );
};

export default RoleBadge;

