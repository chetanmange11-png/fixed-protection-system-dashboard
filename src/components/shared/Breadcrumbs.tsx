import * as React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ChevronRight, Home, Building2, Layers, Folder, ShieldAlert } from 'lucide-react';
import { cn } from '../../lib/utils';

interface BreadcrumbItem {
  label: string;
  path?: string;
  icon?: any;
  active?: boolean;
}

interface BreadcrumbsProps {
  items: BreadcrumbItem[];
  className?: string;
}

export function Breadcrumbs({ items, className }: BreadcrumbsProps) {
  return (
    <nav className={cn("flex items-center space-x-1.5 text-[10px] font-black text-gray-400 uppercase tracking-[0.15em] mb-4 overflow-x-auto whitespace-nowrap pb-1 scrollbar-hide", className)}>
      <Link to="/" className="hover:text-blue-600 transition-colors flex items-center shrink-0">
        <Home className="h-3 w-3 mr-1" />
        Home
      </Link>
      
      {items.map((item, idx) => (
        <React.Fragment key={idx}>
          <ChevronRight className="h-2.5 w-2.5 opacity-30 shrink-0" />
          {item.path && !item.active ? (
            <Link 
              to={item.path} 
              className="hover:text-blue-600 transition-colors flex items-center shrink-0"
            >
              {item.icon && <item.icon className="h-3 w-3 mr-1" />}
              {item.label}
            </Link>
          ) : (
            <span 
              className={cn(
                "flex items-center shrink-0 px-2 py-0.5 rounded-md",
                item.active ? "bg-blue-600 text-white shadow-sm shadow-blue-200" : "text-gray-500"
              )}
            >
              {item.icon && <item.icon className={cn("h-3 w-3 mr-1", item.active ? "text-white" : "")} />}
              {item.label}
            </span>
          )}
        </React.Fragment>
      ))}
    </nav>
  );
}
