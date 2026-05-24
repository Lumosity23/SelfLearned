import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { BookOpen, FolderOpen, Settings, GraduationCap, ChevronLeft, ChevronRight } from 'lucide-react';

export const MainSidebar: React.FC = () => {
  const location = useLocation();
  const currentPath = location.pathname;

  // Collapse state loaded from localStorage
  const [isCollapsed, setIsCollapsed] = useState<boolean>(() => {
    return localStorage.getItem('main_sidebar_collapsed') === 'true';
  });

  // Persist collapse state
  useEffect(() => {
    localStorage.setItem('main_sidebar_collapsed', String(isCollapsed));
    // Trigger a window resize event so other components (like charts or layouts) can adjust if needed
    window.dispatchEvent(new Event('resize'));
  }, [isCollapsed]);

  // Determine active route highlights
  const isHomeActive = currentPath === '/' || (currentPath.startsWith('/course') && currentPath !== '/explorer');
  const isExplorerActive = currentPath === '/explorer';
  const isSettingsActive = currentPath === '/settings';

  return (
    <aside 
      className={`border-r border-dark-800/60 bg-dark-900/30 backdrop-blur-md p-5 flex flex-col h-screen shrink-0 z-20 select-none transition-all duration-300 ${
        isCollapsed ? 'w-20 items-center' : 'w-64'
      }`}
    >
      {/* Brand Logo */}
      <div className={`flex items-center gap-3 mb-8 px-2 ${isCollapsed ? 'justify-center' : ''}`}>
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-500/10 border border-brand-500/30 text-brand-400">
          <GraduationCap className="h-5.5 w-5.5" />
        </div>
        {!isCollapsed && (
          <div className="animate-fadeIn">
            <span className="text-sm font-extrabold text-white tracking-tight leading-none block">SelfLearned</span>
            <span className="text-[9px] font-mono text-dark-500 mt-0.5 block">LMS Local AI</span>
          </div>
        )}
      </div>

      {/* Navigation menu */}
      <nav className="flex-1 space-y-2 w-full">
        {/* Mes Cours */}
        <Link
          to="/"
          className={`group relative flex items-center rounded-xl transition-all duration-250 ${
            isCollapsed ? 'justify-center p-3' : 'px-4 py-3 gap-3.5'
          } ${
            isHomeActive
              ? 'bg-brand-600/15 text-white border-l-2 border-brand-500 font-bold'
              : 'text-dark-400 hover:bg-dark-800/40 hover:text-white'
          }`}
          title={isCollapsed ? "Mes Cours" : ""}
        >
          <BookOpen className={`h-4.5 w-4.5 shrink-0 ${isHomeActive ? 'text-brand-400' : 'text-dark-400 group-hover:text-white transition-colors'}`} />
          {!isCollapsed && <span className="text-xs font-bold uppercase tracking-wider">Mes Cours</span>}
          {isCollapsed && (
            <div className="absolute left-16 scale-0 rounded bg-dark-850 px-2 py-1 text-[10px] font-bold text-white group-hover:scale-100 transition-all shadow-md z-30 pointer-events-none whitespace-nowrap">
              Mes Cours
            </div>
          )}
        </Link>

        {/* Explorateur RAW */}
        <Link
          to="/explorer"
          className={`group relative flex items-center rounded-xl transition-all duration-250 ${
            isCollapsed ? 'justify-center p-3' : 'px-4 py-3 gap-3.5'
          } ${
            isExplorerActive
              ? 'bg-brand-600/15 text-white border-l-2 border-brand-500 font-bold'
              : 'text-dark-400 hover:bg-dark-800/40 hover:text-white'
          }`}
          title={isCollapsed ? "Explorateur RAW" : ""}
        >
          <FolderOpen className={`h-4.5 w-4.5 shrink-0 ${isExplorerActive ? 'text-indigo-400' : 'text-dark-400 group-hover:text-white transition-colors'}`} />
          {!isCollapsed && <span className="text-xs font-bold uppercase tracking-wider">Explorateur RAW</span>}
          {isCollapsed && (
            <div className="absolute left-16 scale-0 rounded bg-dark-850 px-2 py-1 text-[10px] font-bold text-white group-hover:scale-100 transition-all shadow-md z-30 pointer-events-none whitespace-nowrap">
              Explorateur RAW
            </div>
          )}
        </Link>

        {/* Paramètres */}
        <Link
          to="/settings"
          className={`group relative flex items-center rounded-xl transition-all duration-250 ${
            isCollapsed ? 'justify-center p-3' : 'px-4 py-3 gap-3.5'
          } ${
            isSettingsActive
              ? 'bg-brand-600/15 text-white border-l-2 border-brand-500 font-bold'
              : 'text-dark-400 hover:bg-dark-800/40 hover:text-white'
          }`}
          title={isCollapsed ? "Paramètres" : ""}
        >
          <Settings className={`h-4.5 w-4.5 shrink-0 ${isSettingsActive ? 'text-amber-500' : 'text-dark-400 group-hover:text-white transition-colors'}`} />
          {!isCollapsed && <span className="text-xs font-bold uppercase tracking-wider">Paramètres</span>}
          {isCollapsed && (
            <div className="absolute left-16 scale-0 rounded bg-dark-850 px-2 py-1 text-[10px] font-bold text-white group-hover:scale-100 transition-all shadow-md z-30 pointer-events-none whitespace-nowrap">
              Paramètres
            </div>
          )}
        </Link>
      </nav>

      {/* Collapse Trigger Button */}
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className={`w-full flex items-center justify-center gap-2 p-3 rounded-xl border border-dark-800/60 bg-dark-950/20 text-dark-500 hover:text-white hover:bg-dark-800/40 hover:border-dark-850 transition-all cursor-pointer mt-4 shrink-0`}
        title={isCollapsed ? "Déplier le menu" : "Replier le menu"}
      >
        {isCollapsed ? (
          <ChevronRight className="h-4.5 w-4.5" />
        ) : (
          <>
            <ChevronLeft className="h-4.5 w-4.5" />
            <span className="text-[10px] font-extrabold uppercase tracking-wider">Replier le menu</span>
          </>
        )}
      </button>

      {/* Footer copyright */}
      {!isCollapsed && (
        <div className="pt-4 mt-4 border-t border-dark-800/60 text-[9px] font-mono text-dark-500 text-center animate-fadeIn shrink-0">
          v1.2.0 • Powered by DeepMind
        </div>
      )}
    </aside>
  );
};

export default MainSidebar;
