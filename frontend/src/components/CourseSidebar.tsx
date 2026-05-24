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
      <div className="relative flex flex-col items-center w-16 border-r border-dark-900 bg-dark-900/90 py-6 transition-all duration-300">
        <button
          onClick={() => setIsCollapsed(false)}
          className="absolute -right-3 top-6 flex h-6 w-6 items-center justify-center rounded-full border border-dark-900 bg-dark-800 text-dark-400 hover:text-white transition-all shadow-md"
        >
          <ChevronRight className="h-4 w-4" />
        </button>

        <div className="flex flex-col items-center gap-6 mt-8">
          <BookOpen className="h-6 w-6 text-brand-500" />
          
          {/* Mini progress circle */}
          <div className="relative flex items-center justify-center h-10 w-10">
            <svg className="w-full h-full transform -rotate-90">
              <circle
                cx="20"
                cy="20"
                r="16"
                className="stroke-dark-800 fill-transparent"
                strokeWidth="3.5"
              />
              <circle
                cx="20"
                cy="20"
                r="16"
                className="stroke-brand-500 fill-transparent transition-all duration-300"
                strokeWidth="3.5"
                strokeDasharray={`${2 * Math.PI * 16}`}
                strokeDashoffset={`${2 * Math.PI * 16 * (1 - progressPercent / 100)}`}
              />
            </svg>
            <span className="absolute text-[10px] font-mono text-dark-200 font-bold">
              {Math.round(progressPercent)}%
            </span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex flex-col w-80 border-r border-dark-900 bg-dark-900/90 transition-all duration-300 h-full max-h-screen">
      {/* Collapse Trigger */}
      <button
        onClick={() => setIsCollapsed(true)}
        className="absolute -right-3 top-6 flex h-6 w-6 items-center justify-center rounded-full border border-dark-900 bg-dark-800 text-dark-400 hover:text-white transition-all shadow-md z-10"
      >
        <ChevronLeft className="h-4 w-4" />
      </button>

      {/* Header Info */}
      <div className="p-6 border-b border-dark-900/60 bg-dark-950/20">
        <h2 className="text-sm font-semibold text-white uppercase tracking-wider mb-1 line-clamp-1">
          {toc.title}
        </h2>
        <p className="text-xs text-dark-400 line-clamp-2 mb-4">
          {toc.description}
        </p>

        {/* Progress Bar */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs font-mono">
            <span className="text-dark-400">Progression</span>
            <span className="text-white font-semibold">{completedCount}/{totalSubmodules} chap. ({Math.round(progressPercent)}%)</span>
          </div>
          <div className="h-1.5 w-full bg-dark-800 rounded-full overflow-hidden border border-dark-900">
            <div 
              className="h-full bg-brand-500 rounded-full transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      </div>

      {/* Course Curriculum list */}
      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-6">
        {/* Navigation Option for RAW Files */}
        <div className="mb-4 border-b border-dark-800 pb-4">
          <button
            onClick={() => onSelectTab('raw_files')}
            className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all duration-200 select-none ${
              activeTab === 'raw_files'
                ? 'bg-brand-600/10 text-white border-l-2 border-brand-500 pl-2'
                : 'text-dark-400 hover:bg-dark-800 hover:text-white'
            }`}
          >
            <FolderOpen className="h-4 w-4 text-indigo-400 shrink-0" />
            <span className="truncate">Explorateur RAW</span>
          </button>
        </div>

        {toc.modules.map((module, mIdx) => (
          <div key={module.id} className="space-y-2">
            {/* Module header */}
            <div className="flex items-center gap-2 text-xs font-bold text-dark-400 uppercase tracking-wider px-2">
              <FolderOpen className="h-3.5 w-3.5 text-brand-500/80 shrink-0" />
              <span className="truncate">
                Module {mIdx + 1} : {module.title}
              </span>
            </div>

            {/* Submodule list */}
            <div className="space-y-1 ml-1 border-l border-dark-900 pl-2">
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
                    className={`group flex items-center justify-between gap-2 px-3 py-2.5 rounded-lg cursor-pointer text-sm transition-all duration-200 ${
                      isActive
                        ? 'bg-brand-600/10 text-white font-medium border-l-2 border-brand-500 pl-2'
                        : 'text-dark-400 hover:bg-dark-800 hover:text-white'
                    }`}
                  >
                    <span className="line-clamp-2 pr-1">{submodule.title}</span>
                    
                    {/* Completion Checkbox */}
                    <button
                      onClick={(e) => toggleCompleted(submodule.id, e)}
                      className={`flex items-center justify-center rounded-full shrink-0 transition-colors ${
                        isCompleted 
                          ? 'text-emerald-500' 
                          : 'text-dark-600 group-hover:text-dark-400'
                      }`}
                    >
                      {isCompleted ? (
                        <CheckCircle2 className="h-4.5 w-4.5 fill-emerald-500/10" />
                      ) : (
                        <Circle className="h-4.5 w-4.5" />
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
        <div className="p-4 border-t border-dark-900 bg-emerald-950/10 flex items-center gap-3">
          <Award className="h-8 w-8 text-emerald-500 shrink-0 animate-bounce" />
          <div className="space-y-0.5">
            <h4 className="text-xs font-semibold text-emerald-400">Cours complété !</h4>
            <p className="text-[10px] text-emerald-500/80">Félicitations, vous maîtrisez ce sujet.</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default CourseSidebar;
