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
    window.dispatchEvent(new Event('resize'));
  }, [isCollapsed]);

  // Determine active route highlights
  const isHomeActive = currentPath === '/' || (currentPath.startsWith('/course') && currentPath !== '/explorer');
  const isExplorerActive = currentPath === '/explorer';
  const isSettingsActive = currentPath === '/settings';

  return (
    <aside 
      className={`border-r border-dark-850 bg-dark-900/90 backdrop-blur-md p-4 flex flex-col h-screen shrink-0 z-20 select-none transition-all duration-350 ease-in-out ${
        isCollapsed ? 'w-16 items-center' : 'w-60'
      }`}
    >
      {/* Brand Logo */}
      <div className={`flex items-center gap-2.5 mb-6 px-1 ${isCollapsed ? 'justify-center' : ''}`}>
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-dark-800 border border-dark-700/60 text-white">
          <GraduationCap className="h-4.5 w-4.5" />
        </div>
        {!isCollapsed && (
          <div className="animate-fadeIn">
            <span className="text-sm font-semibold text-white tracking-tight leading-none block">SelfLearned</span>
            <span className="text-[9px] font-mono text-dark-400 mt-0.5 block">LMS Local AI</span>
          </div>
        )}
      </div>

      {/* Navigation menu */}
      <nav className="flex-1 space-y-1 w-full">
        {/* Mes Cours */}
        <Link
          to="/"
          className={`group relative flex items-center rounded-md transition-all duration-150 ${
            isCollapsed ? 'justify-center p-2' : 'px-3 py-2 gap-3'
          } ${
            isHomeActive
              ? 'bg-dark-800 text-white border border-dark-700/50 font-medium'
              : 'text-dark-400 hover:bg-dark-800/40 hover:text-white border border-transparent'
          }`}
          title={isCollapsed ? "Mes Cours" : ""}
        >
          <BookOpen className={`h-4 w-4 shrink-0 ${isHomeActive ? 'text-white' : 'text-dark-400 group-hover:text-white transition-colors'}`} />
          {!isCollapsed && <span className="text-sm font-medium">Mes Cours</span>}
          {isCollapsed && (
            <div className="absolute left-14 scale-0 rounded bg-dark-900 border border-dark-700 px-2 py-1 text-[10px] font-medium text-white group-hover:scale-100 transition-all duration-150 shadow-md z-30 pointer-events-none whitespace-nowrap">
              Mes Cours
            </div>
          )}
        </Link>

        {/* Explorateur RAW */}
        <Link
          to="/explorer"
          className={`group relative flex items-center rounded-md transition-all duration-150 ${
            isCollapsed ? 'justify-center p-2' : 'px-3 py-2 gap-3'
          } ${
            isExplorerActive
              ? 'bg-dark-800 text-white border border-dark-700/50 font-medium'
              : 'text-dark-400 hover:bg-dark-800/40 hover:text-white border border-transparent'
          }`}
          title={isCollapsed ? "Explorateur RAW" : ""}
        >
          <FolderOpen className={`h-4 w-4 shrink-0 ${isExplorerActive ? 'text-white' : 'text-dark-400 group-hover:text-white transition-colors'}`} />
          {!isCollapsed && <span className="text-sm font-medium">Explorateur RAW</span>}
          {isCollapsed && (
            <div className="absolute left-14 scale-0 rounded bg-dark-900 border border-dark-700 px-2 py-1 text-[10px] font-medium text-white group-hover:scale-100 transition-all duration-150 shadow-md z-30 pointer-events-none whitespace-nowrap">
              Explorateur RAW
            </div>
          )}
        </Link>

        {/* Paramètres */}
        <Link
          to="/settings"
          className={`group relative flex items-center rounded-md transition-all duration-150 ${
            isCollapsed ? 'justify-center p-2' : 'px-3 py-2 gap-3'
          } ${
            isSettingsActive
              ? 'bg-dark-800 text-white border border-dark-700/50 font-medium'
              : 'text-dark-400 hover:bg-dark-800/40 hover:text-white border border-transparent'
          }`}
          title={isCollapsed ? "Paramètres" : ""}
        >
          <Settings className={`h-4 w-4 shrink-0 ${isSettingsActive ? 'text-white' : 'text-dark-400 group-hover:text-white transition-colors'}`} />
          {!isCollapsed && <span className="text-sm font-medium">Paramètres</span>}
          {isCollapsed && (
            <div className="absolute left-14 scale-0 rounded bg-dark-900 border border-dark-700 px-2 py-1 text-[10px] font-medium text-white group-hover:scale-100 transition-all duration-150 shadow-md z-30 pointer-events-none whitespace-nowrap">
              Paramètres
            </div>
          )}
        </Link>
      </nav>

      {/* Collapse Trigger Button */}
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className={`w-full flex items-center justify-center gap-2 p-2 rounded-md border border-dark-800 bg-dark-950/20 text-dark-400 hover:text-white hover:bg-dark-800 hover:border-dark-700 transition-all cursor-pointer mt-4 shrink-0`}
        title={isCollapsed ? "Déplier le menu" : "Replier le menu"}
      >
        {isCollapsed ? (
          <ChevronRight className="h-4 w-4" />
        ) : (
          <>
            <ChevronLeft className="h-4 w-4" />
            <span className="text-[10px] font-semibold uppercase tracking-wider">Replier</span>
          </>
        )}
      </button>

      {/* Footer copyright */}
      {!isCollapsed && (
        <div className="pt-3 mt-3 border-t border-dark-800/60 text-[9px] font-mono text-dark-400 text-center animate-fadeIn shrink-0">
          v1.2.0 • Powered by DeepMind
        </div>
      )}
    </aside>
  );
};

export default MainSidebar;
