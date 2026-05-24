import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, BookOpen, Circle, CheckCircle2, Award, FolderOpen } from 'lucide-react';

interface Submodule {
  id: string;
  title: string;
  file: string;
}

interface Module {
  id: string;
  title: string;
  submodules: Submodule[];
}

interface TOC {
  title: string;
  description: string;
  modules: Module[];
}

interface CourseSidebarProps {
  toc: TOC;
  courseId: string;
  activeSubmoduleId: string | null;
  onSelectSubmodule: (submodule: Submodule) => void;
  activeTab: 'theory' | 'exercises' | 'raw_files';
  onSelectTab: (tab: 'theory' | 'exercises' | 'raw_files') => void;
}

export const CourseSidebar: React.FC<CourseSidebarProps> = ({
  toc,
  courseId,
  activeSubmoduleId,
  onSelectSubmodule,
  activeTab,
  onSelectTab,
}) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [completedIds, setCompletedIds] = useState<string[]>([]);

  // Load completed submodules from localStorage on mount/course change
  useEffect(() => {
    const stored = localStorage.getItem(`completed_submodules_${courseId}`);
    if (stored) {
      try {
        setCompletedIds(JSON.parse(stored));
      } catch (err) {
        console.error('Error parsing completed submodules from localStorage:', err);
      }
    } else {
      setCompletedIds([]);
    }
  }, [courseId]);

  // Save completed submodules to localStorage
  const toggleCompleted = (submoduleId: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent selecting the submodule when toggling checkbox
    const updated = completedIds.includes(submoduleId)
      ? completedIds.filter((id) => id !== submoduleId)
      : [...completedIds, submoduleId];
    
    setCompletedIds(updated);
    localStorage.setItem(`completed_submodules_${courseId}`, JSON.stringify(updated));
  };

  // Get total submodules count
  const allSubmodules = toc.modules.flatMap((m) => m.submodules);
  const totalSubmodules = allSubmodules.length;
  const completedCount = allSubmodules.filter((s) => completedIds.includes(s.id)).length;
  const progressPercent = totalSubmodules > 0 ? (completedCount / totalSubmodules) * 100 : 0;

  if (isCollapsed) {
    return (
      <div className="relative flex flex-col items-center w-16 border-r border-dark-850 bg-dark-900/90 py-6 transition-all duration-350 ease-in-out shrink-0">
        <button
          onClick={() => setIsCollapsed(false)}
          className="absolute -right-3 top-6 flex h-6 w-6 items-center justify-center rounded-full border border-dark-700 bg-dark-800 text-dark-400 hover:text-white transition-all shadow-md z-10 cursor-pointer"
        >
          <ChevronRight className="h-3.5 w-3.5" />
        </button>

        <div className="flex flex-col items-center gap-6 mt-8">
          <BookOpen className="h-5 w-5 text-dark-300" />
          
          {/* Mini progress circle */}
          <div className="relative flex items-center justify-center h-10 w-10">
            <svg className="w-full h-full transform -rotate-90">
              <circle
                cx="20"
                cy="20"
                r="16"
                className="stroke-dark-800 fill-transparent"
                strokeWidth="2.5"
              />
              <circle
                cx="20"
                cy="20"
                r="16"
                className="stroke-white fill-transparent transition-all duration-300"
                strokeWidth="2.5"
                strokeDasharray={`${2 * Math.PI * 16}`}
                strokeDashoffset={`${2 * Math.PI * 16 * (1 - progressPercent / 100)}`}
              />
            </svg>
            <span className="absolute text-[9px] font-mono text-dark-300 font-medium">
              {Math.round(progressPercent)}%
            </span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex flex-col w-72 border-r border-dark-850 bg-dark-900/90 transition-all duration-350 ease-in-out h-full max-h-screen shrink-0">
      {/* Collapse Trigger */}
      <button
        onClick={() => setIsCollapsed(true)}
        className="absolute -right-3 top-6 flex h-6 w-6 items-center justify-center rounded-full border border-dark-700 bg-dark-800 text-dark-400 hover:text-white transition-all shadow-md z-10 cursor-pointer"
      >
        <ChevronLeft className="h-3.5 w-3.5" />
      </button>

      {/* Header Info */}
      <div className="p-4 border-b border-dark-850/60 bg-dark-950/20">
        <h2 className="text-sm font-semibold text-white mb-1 line-clamp-1">
          {toc.title}
        </h2>
        <p className="text-xs text-dark-400 line-clamp-2 mb-3">
          {toc.description}
        </p>

        {/* Progress Bar */}
        <div className="space-y-1">
          <div className="flex items-center justify-between text-[11px] font-mono">
            <span className="text-dark-400">Progression</span>
            <span className="text-white font-medium">{completedCount}/{totalSubmodules} ({Math.round(progressPercent)}%)</span>
          </div>
          <div className="h-1 w-full bg-dark-800 rounded-sm overflow-hidden border border-dark-850/30">
            <div 
              className="h-full bg-white rounded-sm transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      </div>

      {/* Course Curriculum list */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-4">
        {/* Navigation Option for RAW Files */}
        <div className="mb-2 border-b border-dark-850 pb-3">
          <button
            onClick={() => onSelectTab('raw_files')}
            className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md text-sm font-medium transition-all duration-150 select-none ${
              activeTab === 'raw_files'
                ? 'bg-dark-800 text-white border border-dark-700/50'
                : 'text-dark-400 hover:bg-dark-800/40 hover:text-white border border-transparent'
            }`}
          >
            <FolderOpen className="h-4 w-4 text-dark-300 shrink-0" />
            <span className="truncate">Explorateur RAW</span>
          </button>
        </div>

        {toc.modules.map((module, mIdx) => (
          <div key={module.id} className="space-y-1.5">
            {/* Module header */}
            <div className="flex items-center gap-1.5 text-xs font-semibold text-dark-300 px-1">
              <span className="text-dark-500 font-mono">M{mIdx + 1}.</span>
              <span className="truncate">{module.title}</span>
            </div>

            {/* Submodule list */}
            <div className="space-y-0.5 ml-1.5 border-l border-dark-800 pl-2">
              {module.submodules.map((submodule) => {
                const isActive = activeSubmoduleId === submodule.id && activeTab !== 'raw_files';
                const isCompleted = completedIds.includes(submodule.id);

                return (
                  <div
                    key={submodule.id}
                    onClick={() => {
                      onSelectSubmodule(submodule);
                      onSelectTab('theory');
                    }}
                    className={`group flex items-center justify-between gap-2 px-2 py-1.5 rounded-md cursor-pointer text-xs transition-all duration-150 ${
                      isActive
                        ? 'bg-dark-800 text-white font-medium border border-dark-700/50'
                        : 'text-dark-400 hover:bg-dark-800/40 hover:text-white border border-transparent'
                    }`}
                  >
                    <span className="line-clamp-2 pr-1">{submodule.title}</span>
                    
                    {/* Completion Checkbox */}
                    <button
                      onClick={(e) => toggleCompleted(submodule.id, e)}
                      className={`flex items-center justify-center rounded-full shrink-0 transition-colors cursor-pointer ${
                        isCompleted 
                          ? 'text-emerald-500' 
                          : 'text-dark-700 group-hover:text-dark-500'
                      }`}
                    >
                      {isCompleted ? (
                        <CheckCircle2 className="h-3.5 w-3.5 fill-emerald-500/10" />
                      ) : (
                        <Circle className="h-3.5 w-3.5" />
                      )}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Footer / Certificate badge */}
      {progressPercent === 100 && (
        <div className="p-3 border-t border-dark-850 bg-emerald-950/15 flex items-center gap-2.5 m-2 rounded-md">
          <Award className="h-6 w-6 text-emerald-500 shrink-0" />
          <div className="space-y-0.5">
            <h4 className="text-[11px] font-semibold text-emerald-400">Cours complété !</h4>
            <p className="text-[9px] text-emerald-500/70 leading-tight">Vous maîtrisez ce sujet avec succès.</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default CourseSidebar;
