import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { 
  BookOpen, Clock, ChevronRight, GraduationCap, Loader2, ArrowLeft,
  Sparkles, Save, FileText, CheckCircle2, Circle, AlertTriangle 
} from 'lucide-react';
import { MainSidebar } from '../components/MainSidebar';
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
  created_at?: number;
  level?: string;
}

export const CoursePresentation: React.FC = () => {
  const { courseId } = useParams<{ courseId: string }>();
  const { addToast } = useToast();
  const navigate = useNavigate();

  const [toc, setToc] = useState<TOC | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Completed chapters tracking state
  const [completedIds, setCompletedIds] = useState<string[]>([]);

  // Personal notes states
  const [notes, setNotes] = useState<string>('');
  const [savingNotes, setSavingNotes] = useState(false);

  // Resume modal states
  const [isGenModalOpen, setIsGenModalOpen] = useState(false);
  const [reconnectJobId, setReconnectJobId] = useState<string | null>(null);

  // 1. Fetch TOC on mount
  const fetchTOC = async () => {
    if (!courseId) return;
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`/api/courses/${courseId}/toc`);
      if (!res.ok) {
        throw new Error("Impossible de charger le plan de ce cours.");
      }
      const data = await res.json();
      setToc(data);
      
      // Save last visited course
      localStorage.setItem('last_visited_course_id', courseId);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Une erreur est survenue.");
    } finally {
      setLoading(false);
    }
  };

  // 2. Fetch Personal Notes from metadata
  const fetchNotes = async () => {
    if (!courseId) return;
    try {
      const res = await fetch(`/api/courses/${courseId}/metadata`);
      if (res.ok) {
        const data = await res.json();
        setNotes(data.notes || '');
      }
    } catch (err) {
      console.error("Error loading course notes:", err);
    }
  };

  // Load completed submodules from localStorage
  const loadCompletedChapters = () => {
    if (!courseId) return;
    const stored = localStorage.getItem(`completed_submodules_${courseId}`);
    if (stored) {
      try {
        setCompletedIds(JSON.parse(stored));
      } catch (e) {
        setCompletedIds([]);
      }
    } else {
      setCompletedIds([]);
    }
  };

  useEffect(() => {
    fetchTOC();
    fetchNotes();
    loadCompletedChapters();
  }, [courseId]);

  const handleSaveNotes = async () => {
    if (!courseId) return;
    setSavingNotes(true);
    try {
      const res = await fetch(`/api/courses/${courseId}/metadata`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes }),
      });
      if (res.ok) {
        addToast({
          title: 'Notes enregistrées',
          description: 'Vos notes de cours ont été sauvegardées sur le disque.',
          type: 'success'
        });
      } else {
        throw new Error("Échec de l'enregistrement.");
      }
    } catch (err: any) {
      console.error(err);
      addToast({
        title: 'Impossible de sauvegarder',
        description: err.message || 'Une erreur est survenue.',
        type: 'error'
      });
    } finally {
      setSavingNotes(false);
    }
  };

  const handleResume = async () => {
    if (!courseId || !toc) return;
    try {
      addToast({
        title: 'Reprise de la génération...',
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
        throw new Error(errorData.detail || 'Erreur lors de la reprise.');
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

  // Find first uncompleted chapter to let the user "Continue Reading"
  const getNextChapterUrl = () => {
    if (!toc) return null;
    const submodules = toc.modules.flatMap(m => m.submodules);
    if (submodules.length === 0) return null;
    
    const uncompleted = submodules.find(sm => !completedIds.includes(sm.id));
    if (uncompleted) {
      return `/course/${courseId}/read/${uncompleted.id}`;
    }
    // If all completed, return first chapter
    return `/course/${courseId}/read/${submodules[0].id}`;
  };

  const formatDate = (mtime?: number) => {
    if (!mtime) return '';
    return new Date(mtime * 1000).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="flex h-screen w-screen bg-dark-950 text-dark-200 overflow-hidden font-sans">
        <MainSidebar />
        <div className="flex-1 flex flex-col items-center justify-center">
          <Loader2 className="h-10 w-10 text-zinc-500 animate-spin" />
          <p className="text-xs text-dark-400 font-mono mt-4">Chargement du cursus...</p>
        </div>
      </div>
    );
  }

  if (error || !toc) {
    return (
      <div className="flex h-screen w-screen bg-dark-950 text-dark-200 overflow-hidden font-sans">
        <MainSidebar />
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center space-y-4">
          <AlertTriangle className="h-12 w-12 text-rose-500" />
          <h3 className="text-lg font-bold text-white">Une erreur est survenue</h3>
          <p className="text-sm text-dark-400 font-sans max-w-sm">{error || 'Le cours demandé est introuvable.'}</p>
          <Link 
            to="/" 
            className="flex items-center gap-2 rounded-xl bg-dark-800 border border-dark-750 px-4 py-2.5 text-xs font-bold text-zinc-200 hover:bg-dark-750 hover:text-white transition-all cursor-pointer"
          >
            <ArrowLeft className="h-4 w-4" />
            Retour à l'accueil
          </Link>
        </div>
      </div>
    );
  }

  const allSubmodules = toc.modules.flatMap(m => m.submodules);
  const totalChapters = allSubmodules.length;
  const completedCount = allSubmodules.filter(s => completedIds.includes(s.id)).length;
  const progressPercent = totalChapters > 0 ? Math.round((completedCount / totalChapters) * 100) : 0;
  const nextChapterUrl = getNextChapterUrl();

  return (
    <div className="flex h-screen w-screen bg-dark-950 text-dark-200 overflow-hidden font-sans relative">
      {/* 1. Global Left Sidebar */}
      <MainSidebar />

      {/* 2. Main content container */}
      <div className="flex-1 flex flex-col h-full overflow-hidden relative">
        {/* Decorative background grid & radial glow */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#1a1a1e_1px,transparent_1px),linear-gradient(to_bottom,#1a1a1e_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] opacity-35 pointer-events-none" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 h-[350px] w-[600px] bg-dark-500/5 blur-[120px] rounded-full pointer-events-none" />

        {/* Top Header Bar */}
        <header className="relative flex items-center justify-between px-8 py-5 shrink-0">
          <div className="flex items-center gap-4">
            <Link
              to="/"
              className="flex items-center justify-center h-9 w-9 rounded-xl border border-zinc-900 bg-zinc-900/40 text-dark-400 hover:text-white hover:bg-zinc-800 transition-all cursor-pointer shadow"
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <div>
              <h1 className="text-xl font-bold text-white tracking-tight m-0 leading-none">
                <BookOpen className="inline-block h-5 w-5 text-zinc-400 mr-2.5 -mt-1" />
                Cursus Académique
              </h1>
              <p className="text-[10px] text-dark-400 font-mono mt-1.5">Consultez le syllabus, étudiez les chapitres et enregistrez vos notes de cours</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {nextChapterUrl && (
              <Link
                to={nextChapterUrl}
                className="flex items-center gap-2 rounded-xl bg-zinc-900 border border-zinc-800/80 px-5 py-2.5 text-xs font-bold text-zinc-200 hover:bg-zinc-800 hover:text-white transition-all shadow-lg cursor-pointer animate-in fade-in"
              >
                <BookOpen className="h-4 w-4 text-zinc-400" />
                {completedCount === 0 ? "Commencer le cours" : "Continuer l'apprentissage"}
              </Link>
            )}
          </div>
        </header>

        {/* Scrollable details container */}
        <div className="flex-1 overflow-y-auto px-8 py-10 relative">
          <div className="max-w-5xl mx-auto space-y-6">

            {/* Warning banner for partial generations */}
            {toc.partial && (
              <div className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 animate-pulse shadow-[0_0_15px_rgba(245,158,11,0.02)]">
                <div className="flex gap-3">
                  <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-xs font-bold text-white uppercase tracking-wider">Génération Partielle / RAW</h4>
                    <p className="text-xs text-dark-300 mt-1 max-w-xl leading-relaxed">
                      Ce cours a été interrompu ou s'est arrêté de façon prématurée. Certains chapitres manquent sur le disque. Vous pouvez relancer la génération pour compléter les chapitres restants.
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleResume}
                  className="flex items-center gap-1.5 rounded-xl bg-amber-500/10 hover:bg-amber-500 text-amber-400 hover:text-white border border-amber-500/30 hover:border-transparent px-4 py-2 text-xs font-bold transition-all shrink-0 cursor-pointer"
                >
                  <Sparkles className="h-3.5 w-3.5 fill-amber-500/15" />
                  Reprendre la génération
                </button>
              </div>
            )}

            {/* Course presentation card */}
            <div className="rounded-2xl border border-zinc-900 bg-zinc-900/10 p-6 flex flex-col md:flex-row justify-between gap-6 shadow-md relative">
              <div className="space-y-4 flex-1">
                <div>
                  <div className="flex items-center gap-2 flex-wrap mb-2">
                    <span className="text-[9px] px-2 py-0.5 rounded-lg font-extrabold uppercase tracking-wider bg-zinc-900 text-zinc-300 border border-zinc-800/80">
                      Manuel Planifié
                    </span>
                    {toc.level && (
                      <span className="text-[9px] px-2 py-0.5 rounded-lg font-extrabold uppercase tracking-wider bg-zinc-900 text-zinc-300 border border-zinc-800/80">
                        Niveau {toc.level}
                      </span>
                    )}
                  </div>
                  <h2 className="text-2xl font-extrabold text-white tracking-tight">{toc.title}</h2>
                </div>

                <p className="text-sm text-dark-300 leading-relaxed max-w-2xl font-sans">
                  {toc.description || "Aucune description fournie pour ce manuel d'étude."}
                </p>

                <div className="flex items-center gap-4 text-xs font-mono text-dark-500 select-none">
                  {toc.created_at && (
                    <div className="flex items-center gap-1.5">
                      <Clock className="h-3.5 w-3.5 text-dark-500" />
                      <span>Créé le {formatDate(toc.created_at)}</span>
                    </div>
                  )}
                  <div className="h-3 w-px bg-dark-800" />
                  <div>{totalChapters} Chapitres pédagogiques</div>
                </div>
              </div>

              {/* Progress Circle Badge in Top Right */}
              <div className="flex flex-col items-center justify-center shrink-0 p-2 select-none self-center md:self-auto">
                <div className="relative flex items-center justify-center h-24 w-24">
                  <svg className="w-full h-full transform -rotate-90">
                    <circle
                      cx="48"
                      cy="48"
                      r="40"
                      className="stroke-dark-800 fill-transparent"
                      strokeWidth="5"
                    />
                    <circle
                      cx="48"
                      cy="48"
                      r="40"
                      className="stroke-zinc-500 fill-transparent transition-all duration-500"
                      strokeWidth="5.5"
                      strokeDasharray={`${2 * Math.PI * 40}`}
                      strokeDashoffset={`${2 * Math.PI * 40 * (1 - progressPercent / 100)}`}
                    />
                  </svg>
                  <div className="absolute flex flex-col items-center justify-center">
                    <span className="text-lg font-extrabold text-white leading-none">{progressPercent}%</span>
                    <span className="text-[8px] font-mono font-bold text-dark-400 mt-1 uppercase tracking-wide">Progression</span>
                  </div>
                </div>
                <div className="text-[10px] font-mono text-dark-400 font-bold mt-2.5">
                  {completedCount} / {totalChapters} Chapitres lus
                </div>
              </div>
            </div>

            {/* Split layout: Syllabus at Left, Personal Notes at Right */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              
              {/* Left Pane: Detailed Curriculum Structure (Syllabus) */}
              <div className="lg:col-span-7 space-y-4">
                <div className="flex items-center gap-2 border-b border-zinc-900/60 pb-2 mb-3">
                  <GraduationCap className="h-4.5 w-4.5 text-zinc-400" />
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider">Plan d'étude et chapitres</h3>
                </div>

                <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
                  {toc.modules.map((module, mIdx) => (
                    <div key={module.id} className="rounded-xl border border-zinc-800/60 bg-zinc-900/10 p-4 space-y-3">
                      <h4 className="text-xs font-extrabold text-dark-300 uppercase tracking-wider flex items-center gap-2 select-none">
                        <span className="text-[10px] font-mono text-zinc-400">Module {mIdx + 1}</span>
                        <span className="h-1 w-1 bg-zinc-700 rounded-full" />
                        <span className="truncate text-white">{module.title}</span>
                      </h4>

                      <div className="space-y-1.5 pl-2 border-l border-zinc-900/40">
                        {module.submodules.map((submodule) => {
                          const isCompleted = completedIds.includes(submodule.id);
                          return (
                            <div
                              key={submodule.id}
                              onClick={() => navigate(`/course/${courseId}/read/${submodule.id}`)}
                              className="group flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg border border-zinc-800/80 hover:border-zinc-700/80 bg-zinc-900/10 hover:bg-zinc-900/30 cursor-pointer transition-all duration-200"
                            >
                              <span className="text-xs font-semibold text-dark-300 group-hover:text-white transition-colors line-clamp-2">
                                {submodule.title}
                              </span>
                              
                              <div className="flex items-center gap-2 shrink-0 select-none">
                                {isCompleted ? (
                                  <CheckCircle2 className="h-4.5 w-4.5 text-emerald-500 fill-emerald-500/10" />
                                ) : (
                                  <Circle className="h-4.5 w-4.5 text-dark-600 group-hover:text-dark-400 transition-colors" />
                                )}
                                <ChevronRight className="h-3.5 w-3.5 text-dark-500 group-hover:text-white transition-all transform group-hover:translate-x-0.5" />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Right Pane: Personal Study Notes (Scratchpad) */}
              <div className="lg:col-span-5 space-y-4">
                <div className="flex items-center justify-between border-b border-zinc-900/60 pb-2 mb-3">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4.5 w-4.5 text-zinc-400" />
                    <h3 className="text-xs font-bold text-white uppercase tracking-wider">Notes d'étude personnelles</h3>
                  </div>
                  
                  <button
                    onClick={handleSaveNotes}
                    disabled={savingNotes}
                    className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-zinc-900 border border-zinc-800/80 hover:bg-zinc-800 text-[10px] font-bold text-zinc-300 transition-all disabled:opacity-50 cursor-pointer select-none shadow-md"
                  >
                    {savingNotes ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
                    Sauvegarder
                  </button>
                </div>

                <div className="rounded-xl border border-zinc-800 bg-zinc-900/10 p-4 space-y-3.5 shadow-sm">
                  <p className="text-[10px] text-dark-400 leading-relaxed font-sans select-none">
                    Ce cahier d'étude vous permet de prendre des notes, de résumer des chapitres ou de noter vos questions. Les notes sont sauvegardées dans votre espace disque pour rester disponibles à chaque séance.
                  </p>
                  
                  <div className="rounded-xl border border-zinc-800 bg-zinc-950/40 p-1.5 focus-within:border-zinc-700 transition-colors">
                    <textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Saisissez vos notes d'étude ici pour ce cours... (raccourcis techniques, définitions, rappels)"
                      rows={14}
                      className="w-full bg-transparent border-none text-xs leading-relaxed text-dark-100 placeholder-dark-600 focus:outline-none p-3 resize-none font-sans select-text"
                    />
                  </div>
                </div>
              </div>

            </div>

          </div>
        </div>
      </div>

      {/* Generation Pipeline Modal for Resumption */}
      <GenerateCourseModal
        isOpen={isGenModalOpen}
        onClose={() => {
          setIsGenModalOpen(false);
          setReconnectJobId(null);
          fetchTOC(); // Re-fetch plan on closure
        }}
        onSuccess={() => fetchTOC()}
        reconnectJobId={reconnectJobId}
      />
    </div>
  );
};

export default CoursePresentation;
