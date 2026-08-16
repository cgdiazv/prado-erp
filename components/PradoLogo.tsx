'use client';

import React from 'react';
import { Layers, Briefcase, Wrench, Boxes, Kanban, Building2, Sparkles, LayoutGrid } from 'lucide-react';

export type PradoIconType = 'layers' | 'briefcase' | 'wrench' | 'boxes' | 'kanban' | 'building' | 'sparkle' | 'grid';

interface PradoLogoProps {
  theme?: 'light' | 'dark';
  subtitle?: string;
  badgeText?: string;
  size?: 'sm' | 'md' | 'lg';
  iconType?: PradoIconType;
  className?: string;
}

export default function PradoLogo({
  theme = 'light',
  subtitle = 'Job & Field Operations',
  badgeText,
  size = 'md',
  iconType = 'layers',
  className = '',
}: PradoLogoProps) {
  const isDark = theme === 'dark';

  const badgeSizeClasses = {
    sm: 'p-1.5 rounded-lg',
    md: 'p-2 rounded-xl',
    lg: 'p-2.5 rounded-xl',
  }[size];

  const iconPxSize = {
    sm: 16,
    md: 20,
    lg: 24,
  }[size];

  const titleSizeClasses = {
    sm: 'text-lg',
    md: 'text-xl',
    lg: 'text-2xl',
  }[size];

  const renderIcon = () => {
    switch (iconType) {
      case 'layers':
        return <Layers size={iconPxSize} className="text-white" />;
      case 'briefcase':
        return <Briefcase size={iconPxSize} className="text-white" />;
      case 'wrench':
        return <Wrench size={iconPxSize} className="text-white" />;
      case 'boxes':
        return <Boxes size={iconPxSize} className="text-white" />;
      case 'kanban':
        return <Kanban size={iconPxSize} className="text-white" />;
      case 'building':
        return <Building2 size={iconPxSize} className="text-white" />;
      case 'grid':
        return <LayoutGrid size={iconPxSize} className="text-white" />;
      case 'sparkle':
      default:
        return (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="currentColor"
            style={{ width: iconPxSize, height: iconPxSize }}
            className="text-white"
          >
            <path d="M12 3c.12 4.96-3.03 9.04-7.96 9.17C8.96 12.29 12 16.31 12 21c0-4.69 3.04-8.71 7.96-8.83C15.03 12.04 11.88 7.96 12 3z" />
          </svg>
        );
    }
  };

  return (
    <div className={`group flex items-center gap-2.5 select-none ${className}`}>
      {/* Icon container styled matching Prado Fleet's rounded badge, in Prado green */}
      <div
        className={`${badgeSizeClasses} bg-emerald-500 text-white shadow-sm shadow-emerald-500/30 transition-transform group-hover:scale-105 shrink-0 flex items-center justify-center`}
      >
        {renderIcon()}
      </div>

      {/* Brand Text Stack */}
      <div className="hidden md:flex flex-col">
        <div className="flex items-center gap-1.5 leading-none">
          <span className={`font-sans ${titleSizeClasses} font-bold tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
            Prado
          </span>
          {badgeText ? (
            <span className="text-[10px] font-semibold uppercase bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded border border-slate-200">
              {badgeText}
            </span>
          ) : null}
        </div>
        {subtitle ? (
          <p className={`mt-0.5 text-[10px] font-medium uppercase tracking-widest ${isDark ? 'text-emerald-400/90' : 'text-slate-500'}`}>
            {subtitle}
          </p>
        ) : null}
      </div>
    </div>
  );
}
