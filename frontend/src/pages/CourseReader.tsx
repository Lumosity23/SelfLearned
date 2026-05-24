import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ChevronLeft, ArrowLeft, Download, BookOpen, PenTool, CheckCircle2, ChevronRight, Loader2, FileText, AlertCircle, Sparkles } from 'lucide-react';
import { CourseSidebar } from '../components/CourseSidebar';
import { MarkdownViewer } from '../components/MarkdownViewer';
import { FileExplorer } from '../components/FileExplorer';
import { GenerateCourseModal } from '../components/GenerateCourseModal';
import { useToast } from '../components/ToastProvider';

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
  partial?: boolean;
  status?: string;
  error?: string;
}

export const CourseReader: React.FC = () => {
  const { courseId, submoduleId } = useParams<{ courseId: string; submoduleId: string }>();
  const { addToast } = useToast();
  const navigate = useNavigate();
  
  const [toc, setToc] = useState<TOC | null>(null);
  const [activeSubmodule, setActiveSubmodule] = useState<Submodule | null>(null);
  const [activeTab, setActiveTab] = useState<'theory' | 'exercises' | 'raw_files'>('theory');
  
  const [theoryContent, setTheoryContent] = useState<string>('');
  const [exerciseContent, setExerciseContent] = useState<string>('');
  const [hasExercises, setHasExercises] = useState<boolean>(false);
  
  const [loadingTOC, setLoadingTOC] = useState<boolean>(true);
  const [loadingContent, setLoadingContent] = useState<boolean>(false);
  const [exportingPDF, setExportingPDF] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Resumption modal states
  const [isGenModalOpen, setIsGenModalOpen] = useState(false);
  const [reconnectJobId, setReconnectJobId] = useState<string | null>(null);

  const fetchTOC = async () => {
    if (!courseId) return;
    try {
      setError(null);
      const res = await fetch(`/api/courses/${courseId}/toc`);
      if (!res.ok) {
        throw new Error('Impossible de charger le plan du cours.');
      }
      const data = await res.json();
      setToc(data);
      
      // Select submodule from url parameter or fallback to first submodule
      if (submoduleId) {
        const allSub = data.modules.flatMap((m: any) => m.submodules);
        const found = allSub.find((s: any) => s.id === submoduleId);
        if (found) {
          setActiveSubmodule(found);
          if (submoduleId === 'raw') {
            setActiveTab('raw_files');
          }
        } else if (data.modules[0]?.submodules[0]) {
          setActiveSubmodule(data.modules[0].submodules[0]);
        }
      } else if (data.modules[0]?.submodules[0]) {
        setActiveSubmodule(data.modules[0].submodules[0]);
      }
    } catch (err: any) {
      console.error('Error fetching TOC:', err);
      setError(err.message || 'Une erreur est survenue lors du chargement.');
    }
  };

  // 1. Fetch TOC on mount/courseId change
  useEffect(() => {
    const initTOC = async () => {
      setLoadingTOC(true);
      await fetchTOC();
      setLoadingTOC(false);
    };
    initTOC();
  }, [courseId]);

  // Reactively select submodule when submoduleId parameter in URL changes
  useEffect(() => {
    if (toc && submoduleId) {
      const allSub = toc.modules.flatMap((m) => m.submodules);
      const found = allSub.find((s) => s.id === submoduleId);
      if (found) {
        setActiveSubmodule(found);
        if (submoduleId === 'raw') {
          setActiveTab('raw_files');
        } else {
          setActiveTab('theory');
        }
      }
    }
  }, [submoduleId, toc]);

  // Log reading activity to backend decentralized course.log
  useEffect(() => {
    if (courseId && activeSubmodule) {
      const logRead = async () => {
        try {
          await fetch(`/api/courses/${courseId}/log`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: `Lecture du chapitre : '${activeSubmodule.title}'` }),
          });
        } catch (e) {
          // Fail silently
        }
      };
      logRead();
    }
  }, [courseId, activeSubmodule]);

  const handleResume = async () => {
    if (!courseId || !toc) return;
    try {
      addToast({
        title: 'Reprise du cours...',
        description: `Initialisation de la reprise pour "${toc.title}".`,
        type: 'info'
      });
      const res = await fetch(`/api/courses/${courseId}/resume`, { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        setReconnectJobId(data.job_id);
        setIsGenModalOpen(true);
      } else {
        const errorData = await res.json();
        throw new Error(errorData.detail || 'Erreur lors de la reprise de génération.');
      }
    } catch (err: any) {
      console.error(err);
      addToast({
        title: 'Impossible de reprendre',
        description: err.message || 'Une erreur est survenue lors de la reprise.',
        type: 'error'
      });
    }
  };

  // 2. Fetch content when active submodule or tab changes
  useEffect(() => {
    const fetchContent = async () => {
      if (!courseId || !activeSubmodule) return;
      
      setLoadingContent(true);
      setTheoryContent('');
      setExerciseContent('');
      setHasExercises(false);

      try {
        // Fetch theoretical content
        const resTheory = await fetch(`/api/courses/${courseId}/content/${activeSubmodule.file}`);
        if (!resTheory.ok) {
          throw new Error('Échec du chargement du contenu théorique.');
        }
        const dataTheory = await resTheory.json();
        setTheoryContent(dataTheory.content);

        // Try to fetch exercises (silent fail if not found)
        try {
          const resExercise = await fetch(`/api/courses/${courseId}/content/exo_${activeSubmodule.file}`);
          if (resExercise.ok) {
            const dataExercise = await resExercise.json();
            setExerciseContent(dataExercise.content);
            setHasExercises(true);
          }
        } catch (e) {
          console.log('No exercises available for this module.');
        }

      } catch (err: any) {
        console.error('Error fetching content:', err);
        setTheoryContent(`### Erreur de chargement\n\nImpossible de charger le contenu de ce chapitre : ${err.message}`);
      } finally {
        setLoadingContent(false);
      }
    };

    fetchContent();
  }, [courseId, activeSubmodule]);

  // Pre-calculate flattened submodules list for next/prev navigation
  const getSubmodulesList = (): Submodule[] => {
    if (!toc) return [];
    return toc.modules.flatMap((m) => m.submodules);
  };

  const submodulesList = getSubmodulesList();
  const currentIndex = activeSubmodule 
    ? submodulesList.findIndex((s) => s.id === activeSubmodule.id) 
    : -1;

  const handlePrev = () => {
    if (currentIndex > 0) {
      const prevSub = submodulesList[currentIndex - 1];
      navigate(`/course/${courseId}/read/${prevSub.id}`);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleNext = () => {
    if (currentIndex < submodulesList.length - 1) {
      const nextSub = submodulesList[currentIndex + 1];
      navigate(`/course/${courseId}/read/${nextSub.id}`);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleExportPDF = async () => {
    if (!courseId) return;
    try {
      setExportingPDF(true);
      window.location.href = `/api/courses/${courseId}/export-pdf`;
      setTimeout(() => setExportingPDF(false), 2000);
    } catch (err) {
      console.error('Error triggering PDF download:', err);
      setExportingPDF(false);
    }
  };

  if (loadingTOC) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-dark-950 text-white">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 text-white animate-spin" />
          <p className="text-xs text-dark-400 font-mono">Chargement du cours...</p>
        </div>
      </div>
    );
  }

  if (error || !toc) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-dark-950 text-white p-6">
        <div className="flex flex-col items-center text-center max-w-sm p-5 rounded-md border border-dark-850 bg-dark-900/50 space-y-3">
          <AlertCircle className="h-10 w-10 text-rose-500" />
          <h3 className="text-sm font-semibold text-white">Une erreur est survenue</h3>
          <p className="text-xs text-dark-400 leading-relaxed">{error || 'Le cours demandé est introuvable.'}</p>
          <Link 
            to="/" 
            className="flex items-center gap-1.5 rounded-md bg-zinc-100 hover:bg-zinc-200 px-3.5 py-1.5 text-xs font-semibold text-zinc-950 transition-all cursor-pointer"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Retour à l'accueil
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-screen bg-dark-950 overflow-hidden text-dark-200">
      {/* 1. Sidebar Component */}
      <CourseSidebar
        toc={toc}
        courseId={courseId || ''}
        activeSubmoduleId={activeSubmodule?.id || null}
        onSelectSubmodule={(s) => navigate(`/course/${courseId}/read/${s.id}`)}
        activeTab={activeTab}
        onSelectTab={(tab) => {
          if (tab === 'raw_files') {
            navigate(`/course/${courseId}/read/raw`);
          } else {
            setActiveTab(tab);
          }
        }}
      />

      {/* 2. Main Reader Area */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        {/* Top Header Bar */}
        <header className="flex items-center justify-between border-b border-dark-850 px-6 py-3 bg-dark-900/40 backdrop-blur-md shrink-0">
          <div className="flex items-center gap-3">
            <Link
              to={`/course/${courseId}`}
              className="flex items-center gap-1.5 text-[11px] text-dark-400 hover:text-white transition-colors bg-dark-800/50 px-2.5 py-1.5 rounded-md border border-dark-850 font-medium"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Syllabus
            </Link>
            <div className="h-3.5 w-px bg-dark-800" />
            <span className="text-xs font-mono text-dark-400 font-medium truncate max-w-[150px] sm:max-w-[300px]">
              {toc.title}
            </span>
          </div>

          <button
            onClick={handleExportPDF}
            disabled={exportingPDF}
            className="flex items-center gap-1.5 rounded-md border border-dark-800 bg-dark-900 hover:bg-dark-800 px-3 py-1.5 text-xs font-medium text-white transition-all disabled:opacity-50 whitespace-nowrap shrink-0 cursor-pointer"
          >
            {exportingPDF ? (
              <Loader2 className="h-3.5 w-3.5 text-white animate-spin shrink-0" />
            ) : (
              <Download className="h-3.5 w-3.5 text-dark-400 shrink-0" />
            )}
            PDF Complet
          </button>
        </header>

        {/* Reader Core Content Panel */}
        <div className="flex-1 overflow-y-auto px-6 md:px-10 py-8 custom-scrollbar">
          <div className="max-w-2.5xl mx-auto">
            {activeTab === 'raw_files' ? (
              <div className="space-y-4 animate-fadeIn">
                <div className="flex items-center gap-2 mb-1 select-none border-b border-dark-850 pb-2">
                  <FileText className="h-4.5 w-4.5 text-dark-400" />
                  <h2 className="text-xs font-semibold text-white">Explorateur physique des fichiers (RAW)</h2>
                </div>
                <FileExplorer courseId={courseId || ''} />
              </div>
            ) : activeSubmodule ? (
              <>
                {/* Partial Generation Warning Banner */}
                {toc.partial && (
                  <div className="mb-6 rounded-md border border-amber-500/20 bg-amber-950/15 p-4 text-left relative overflow-hidden">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <AlertCircle className="h-4.5 w-4.5 text-amber-500 shrink-0 mt-0.5" />
                        <div className="space-y-0.5">
                          <h4 className="text-xs font-semibold text-white">Génération Interrompue (Mode RAW)</h4>
                          <p className="text-[11px] text-dark-400 leading-relaxed max-w-xl">
                            La génération de ce cours a été interrompue en cours de route. Les chapitres rédigés restent lisibles. Vous pouvez relancer la génération pour la compléter !
                          </p>
                          {toc.error && (
                            <div className="mt-1.5 rounded bg-dark-950/60 border border-dark-850/50 p-2 font-mono text-[9px] text-amber-400/90 overflow-x-auto select-text">
                              Erreur : {toc.error}
                            </div>
                          )}
                        </div>
                      </div>
                      
                      <button
                        onClick={handleResume}
                        className="shrink-0 flex items-center gap-1 rounded-md bg-amber-600 hover:bg-amber-500 px-3 py-1.5 text-xs font-semibold text-white transition-all cursor-pointer"
                      >
                        <Sparkles className="h-3.5 w-3.5" />
                        Reprendre
                      </button>
                    </div>
                  </div>
                )}

                {/* Module Breadcrumb & Chapter Title */}
                <div className="space-y-2 mb-6">
                  <div className="text-[10px] font-mono text-dark-400 font-medium">
                    CHAPITRE {currentIndex + 1} SUR {submodulesList.length}
                  </div>
                  <h1 className="text-2xl font-semibold text-white tracking-tight">
                    {activeSubmodule.title}
                  </h1>

                  {/* Tabs Selector (Theory vs Exercises ONLY, RAW is in sidebar) */}
                  {hasExercises && (
                    <div className="flex border-b border-dark-850 pt-3 gap-4 select-none">
                      <button
                        onClick={() => setActiveTab('theory')}
                        className={`flex items-center gap-1.5 pb-2 text-xs font-semibold transition-all relative ${
                          activeTab === 'theory' ? 'text-white' : 'text-dark-400 hover:text-white'
                        }`}
                      >
                        <BookOpen className="h-3.5 w-3.5" />
                        Cours Théorique
                        {activeTab === 'theory' && (
                          <div className="absolute bottom-0 left-0 right-0 h-[1.5px] bg-white rounded-full" />
                        )}
                      </button>

                      <button
                        onClick={() => setActiveTab('exercises')}
                        className={`flex items-center gap-1.5 pb-2 text-xs font-semibold transition-all relative ${
                          activeTab === 'exercises' ? 'text-white font-semibold' : 'text-dark-400 hover:text-white'
                        }`}
                      >
                        <PenTool className="h-3.5 w-3.5" />
                        Exercices Pratiques
                        {activeTab === 'exercises' && (
                          <div className="absolute bottom-0 left-0 right-0 h-[1.5px] bg-white rounded-full" />
                        )}
                      </button>
                    </div>
                  )}
                </div>

                {/* Main Text Content */}
                <div className="relative min-h-[40vh] pb-10">
                  {loadingContent ? (
                    <div className="space-y-4 py-4 animate-pulse">
                      <div className="h-5 w-1/4 bg-dark-800 rounded" />
                      <div className="space-y-2">
                        <div className="h-3.5 w-full bg-dark-800 rounded" />
                        <div className="h-3.5 w-full bg-dark-800 rounded" />
                        <div className="h-3.5 w-5/6 bg-dark-800 rounded" />
                      </div>
                      <div className="h-36 w-full bg-dark-900 rounded border border-dark-850" />
                      <div className="space-y-2">
                        <div className="h-3.5 w-full bg-dark-800 rounded" />
                        <div className="h-3.5 w-4/5 bg-dark-800 rounded" />
                      </div>
                    </div>
                  ) : activeTab === 'theory' ? (
                    <MarkdownViewer content={theoryContent} />
                  ) : (
                    <MarkdownViewer content={exerciseContent} />
                  )}
                </div>

                {/* Footer Navigation Bar */}
                <div className="flex items-center justify-between border-t border-dark-850 pt-6 mt-8 pb-12">
                  <button
                    onClick={handlePrev}
                    disabled={currentIndex === 0}
                    className="flex items-center gap-0.5 text-xs font-medium text-dark-400 hover:text-white disabled:opacity-30 disabled:hover:text-dark-400 transition-colors cursor-pointer"
                  >
                    <ChevronLeft className="h-4.5 w-4.5" />
                    Précédent
                  </button>

                  {currentIndex < submodulesList.length - 1 ? (
                    <button
                      onClick={handleNext}
                      className="flex items-center gap-1 rounded-md bg-dark-800 border border-dark-700/60 hover:bg-dark-700 px-3.5 py-1.5 text-xs font-medium text-white transition-all cursor-pointer"
                    >
                      Suivant
                      <ChevronRight className="h-4.5 w-4.5" />
                    </button>
                  ) : (
                    <Link
                      to="/"
                      className="flex items-center gap-1.5 rounded-md bg-zinc-100 hover:bg-zinc-200 px-4 py-1.5 text-xs font-semibold text-zinc-950 transition-all shadow-sm"
                    >
                      Terminer le cours
                      <CheckCircle2 className="h-4 w-4" />
                    </Link>
                  )}
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center text-center h-[50vh] space-y-3 select-none">
                <FileText className="h-10 w-10 text-dark-600" />
                <h3 className="text-xs font-semibold text-white">Aucun chapitre sélectionné</h3>
                <p className="text-[11px] text-dark-400 max-w-xs leading-relaxed">
                  Veuillez sélectionner un chapitre dans le plan de cours sur la gauche pour commencer la lecture.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Course Generation Modal (Resume Reconnection) */}
      <GenerateCourseModal
        isOpen={isGenModalOpen}
        onClose={() => {
          setIsGenModalOpen(false);
          setReconnectJobId(null);
          fetchTOC();
        }}
        onSuccess={() => {
          setIsGenModalOpen(false);
          setReconnectJobId(null);
          fetchTOC();
        }}
        reconnectJobId={reconnectJobId}
      />
    </div>
  );
};

export default CourseReader;
