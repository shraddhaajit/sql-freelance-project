import React from 'react';
import { Briefcase, Code2, LayoutDashboard, Database, HardDrive } from 'lucide-react';
import { motion } from 'framer-motion';
import { useData } from '@/context/DataContext';

interface AppLayoutProps {
  children: React.ReactNode;
  activeView: 'client' | 'freelancer';
  onViewChange: (view: 'client' | 'freelancer') => void;
}

const navItems = [
  { key: 'client' as const, label: 'Client Portal', icon: Briefcase },
  { key: 'freelancer' as const, label: 'Freelancer Portal', icon: Code2 },
];

const AppLayout: React.FC<AppLayoutProps> = ({ children, activeView, onViewChange }) => {
  const { isApiConnected } = useData();
  return (
    <div className="flex min-h-screen w-full">
      {/* Sidebar */}
      <aside className="w-64 bg-sidebar flex flex-col border-r border-sidebar-border shrink-0">
        <div className="p-6 border-b border-sidebar-border">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-sidebar-primary flex items-center justify-center">
              <LayoutDashboard className="h-5 w-5 text-sidebar-primary-foreground" />
            </div>
            <div>
              <h1 className="font-display font-bold text-sidebar-foreground text-lg leading-tight">FreelanceHub</h1>
              <p className="text-xs text-sidebar-foreground/60">Management Portal</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          {navItems.map(item => {
            const isActive = activeView === item.key;
            return (
              <button
                key={item.key}
                onClick={() => onViewChange(item.key)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200
                  ${isActive
                    ? 'bg-sidebar-accent text-sidebar-accent-foreground shadow-sm'
                    : 'text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50'
                  }`}
              >
                <item.icon className="h-5 w-5" />
                {item.label}
                {isActive && (
                  <motion.div
                    layoutId="sidebar-indicator"
                    className="ml-auto h-2 w-2 rounded-full bg-sidebar-primary"
                  />
                )}
              </button>
            );
          })}
        </nav>

        <div className="p-4 border-t border-sidebar-border space-y-3">
          <div className="flex items-center gap-2 px-2">
            {isApiConnected ? (
              <Database className="h-4 w-4 text-green-500" />
            ) : (
              <HardDrive className="h-4 w-4 text-amber-500" />
            )}
            <span className="text-xs text-sidebar-foreground/60">
              {isApiConnected ? 'Oracle DB Connected' : 'Local Storage Mode'}
            </span>
          </div>
          <p className="text-xs text-sidebar-foreground/40 text-center">© 2025 FreelanceHub</p>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 min-h-screen overflow-y-auto">
        {children}
      </main>
    </div>
  );
};

export default AppLayout;
