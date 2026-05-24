import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, Plus, Search, BookOpen, Clock, ChevronRight, Upload, Loader2, Pin, Archive, Trash2, Download, AlertTriangle, X, GraduationCap } from 'lucide-react';
import { GenerateCourseModal } from '../components/GenerateCourseModal';
import { MainSidebar } from '../components/MainSidebar';
import { useToast } from '../components/ToastProvider';

interface Course {
  id: string;
  title: string;
  description: string;
  created_at: number;
  status?: string;
  partial?: boolean;
  error?: string;
  job_id?: string | null;
  pinned?: boolean;
  archived?: boolean;
  total_submodules?: number;
}

export const Home: React.FC = () => {
  const { addToast } = useToast();
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [importing, setImporting] = useState(false);
  const [reconnectJobId, setReconnectJobId] = useState<string | null>(null);
  
  const [currentTab, setCurrentTab] = useState<'all' | 'archived'>('all');
  const [courseToDelete, setCourseToDelete] = useState<Course | null>(null);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  
  const navigate = useNavigate();

  const handlePinToggle = async (e: React.MouseEvent, course: Course) => {
    e.stopPropagation();
    const action = course.pinned ? 'unpin' : 'pin';
    try {
      const res = await fetch(`/api/courses/${course.id}/${action}`, { method: 'POST' });
      if (res.ok) {
        addToast({
          title: course.pinned ? 'Désépinglé' : 'Épinglé !',
          description: course.pinned 
            ? `Le cours "${course.title}" a été retiré des favoris.`
            : `Le cours "${course.title}" sera affiché en haut de votre tableau de bord.`,
          type: 'success'
        });
        fetchCourses();
      }
    } catch (err) {
      console.error('Error toggling pin:', err);
    }
  };

  const handleArchiveToggle = async (e: React.MouseEvent, course: Course) => {
    e.stopPropagation();
    const action = course.archived ? 'unarchive' : 'archive';
    try {
      const res = await fetch(`/api/courses/${course.id}/${action}`, { method: 'POST' });
      if (res.ok) {
        addToast({
          title: course.archived ? 'Cours restauré' : 'Cours archivé',
          description: course.archived 
            ? `Le cours "${course.title}" a été replacé dans vos cours actifs.`
            : `Le cours "${course.title}" a été archivé.`,
          type: 'success'
        });
        fetchCourses();
      }
    } catch (err) {
      console.error('Error toggling archive:', err);
    }
  };

  const handleExport = (e: React.MouseEvent, course: Course) => {
    e.stopPropagation();
    addToast({
      title: 'Export du cours...',
      description: `Préparation du fichier d'export zip pour "${course.title}".`,
      type: 'info'
    });
    window.location.href = `/api/courses/${course.id}/export`;
  };

  const getCompletedCount = (courseId: string): number => {
    const stored = localStorage.getItem(`completed_submodules_${courseId}`);
    if (!stored) return 0;
    try {
      const completedIds = JSON.parse(stored);
      return Array.isArray(completedIds) ? completedIds.length : 0;
    } catch (e) {
      return 0;
    }
  };

  const handleResume = async (e: React.MouseEvent, course: Course) => {
    e.stopPropagation();
    try {
      addToast({
        title: 'Reprise du cours...',
        description: `Initialisation de la reprise pour "${course.title}".`,
        type: 'info'
      });
      const res = await fetch(`/api/courses/${course.id}/resume`, { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        setReconnectJobId(data.job_id);
        setIsModalOpen(true);
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

  const handleDeleteClick = (e: React.MouseEvent, course: Course) => {
    e.stopPropagation();
    setCourseToDelete(course);
    setDeleteConfirmText('');
  };

  const handleConfirmDelete = async () => {
    if (!courseToDelete || deleteConfirmText !== 'SUPPRIMER') return;
    try {
      const res = await fetch(`/api/courses/${courseToDelete.id}`, { method: 'DELETE' });
      if (res.ok) {
        addToast({
          title: 'Cours supprimé',
          description: `Le cours "${courseToDelete.title}" a été supprimé définitivement.`,
          type: 'success'
        });
        setCourseToDelete(null);
        fetchCourses();
      }
    } catch (err) {
      console.error('Error deleting course:', err);
    }
  };

  const handleZipImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    
    setImporting(true);
    
    const formData = new FormData();
    formData.append('file', file);
    
    try {
      const res = await fetch('/api/courses/import', {
        method: 'POST',
        body: formData,
      });
      
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.detail || "Erreur lors de l'importation du cours.");
      }
      
      const data = await res.json();
      await fetchCourses();
      if (data.course_id) {
        navigate(`/course/${data.course_id}`);
      }
    } catch (err: any) {
      console.error(err);
      alert(err.message || "Une erreur inconnue est survenue.");
    } finally {
      setImporting(false);
      e.target.value = '';
    }
  };

  const fetchCourses = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/courses');
      if (res.ok) {
        const data = await res.json();
        setCourses(data);
      }
    } catch (err) {
      console.error('Error fetching courses:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCourses();
  }, []);

  const handleGenerationSuccess = (courseId: string) => {
    navigate(`/course/${courseId}`);
  };

  // Filter courses based on query and tab archived status
  const filteredCourses = courses.filter((course) => {
    const query = searchQuery.toLowerCase();
    const matchesSearch = course.title.toLowerCase().includes(query) ||
      course.description.toLowerCase().includes(query);
      
    if (currentTab === 'all') {
      return matchesSearch && !course.archived;
    } else {
      return matchesSearch && course.archived;
    }
  });

  const formatDate = (mtime: number) => {
    return new Date(mtime * 1000).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  return (
    <div className="flex h-screen w-screen bg-dark-950 text-dark-200 overflow-hidden font-sans relative">
      {/* 1. Global Left Sidebar */}
      <MainSidebar />

      {/* 2. Main content container */}
      <div className="flex-1 flex flex-col h-full overflow-hidden relative bg-dark-950">
        {/* Decorative background grid */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#18181b_1px,transparent_1px),linear-gradient(to_bottom,#18181b_1px,transparent_1px)] bg-[size:4rem_4rem] opacity-30 pointer-events-none" />

        <div className="flex-1 overflow-y-auto px-6 py-8 relative custom-scrollbar">
          <div className="max-w-5xl mx-auto space-y-8">
            
            {/* Top Navbar */}
            <header className="flex items-center justify-between border-b border-dark-850 pb-4 shrink-0">
              <div>
                <h1 className="text-base font-semibold text-white tracking-tight flex items-center m-0">
                  <GraduationCap className="h-4.5 w-4.5 text-white mr-2" />
                  Mes Cursus Académiques
                </h1>
                <p className="text-[10px] text-dark-400 font-mono mt-0.5">Gérez vos manuels planifiés et rédigés par l'IA</p>
              </div>

              <div className="flex items-center gap-2.5">
                <label className="flex items-center gap-1.5 rounded-md border border-dark-800 bg-dark-900/60 hover:bg-dark-800 px-3 py-1.5 text-xs font-medium text-dark-300 hover:text-white transition-all cursor-pointer">
                  {importing ? (
                    <Loader2 className="h-3.5 w-3.5 text-white animate-spin" />
                  ) : (
                    <Upload className="h-3.5 w-3.5 text-dark-400" />
                  )}
                  <span>{importing ? 'Importation...' : 'Importer (.zip)'}</span>
                  <input
                    type="file"
                    accept=".zip"
                    onChange={handleZipImport}
                    className="hidden"
                    disabled={importing}
                  />
                </label>

                <button
                  onClick={() => setIsModalOpen(true)}
                  className="flex items-center gap-1.5 rounded-md bg-zinc-100 hover:bg-zinc-200 px-3.5 py-1.5 text-xs font-semibold text-zinc-950 transition-all cursor-pointer shadow-sm"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Nouveau cours</span>
                </button>
              </div>
            </header>

            {/* Compact Header Pitch instead of giant Hero */}
            <div className="bg-dark-900/40 border border-dark-850 rounded-md p-4 max-w-3xl">
              <h2 className="text-sm font-semibold text-zinc-100 mb-1 flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-white animate-pulse" />
                Créateur de Cursus Académique Local
              </h2>
              <p className="text-xs text-dark-400 leading-relaxed">
                Saisissez n'importe quel sujet technique ou conceptuel. Notre système rédigera pour vous un cours rigoureux, structuré en modules denses, accompagné de cahiers d'exercices progressifs et d'un visualiseur de code.
              </p>
            </div>

            {/* Action & Filter Bar */}
            <div className="flex flex-col sm:flex-row gap-3 justify-between items-center bg-dark-900/20 p-2.5 rounded-md border border-dark-850/40">
              <div className="relative w-full sm:max-w-xs">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-dark-500" />
                <input
                  type="text"
                  placeholder="Rechercher un manuel..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full rounded-md border border-dark-800 bg-dark-950 pl-8 pr-3 py-1 text-xs text-white placeholder-dark-500 focus:border-dark-700 focus:outline-none transition-all"
                />
              </div>
              
              <div className="text-[10px] font-mono text-dark-400">
                {courses.filter(c => !c.archived).length} manuel{courses.filter(c => !c.archived).length > 1 ? 's' : ''} actif{courses.filter(c => !c.archived).length > 1 ? 's' : ''} au total
              </div>
            </div>

            {/* Tab Selector (Active vs Archived) */}
            <div className="flex border-b border-dark-850 gap-4 select-none">
              <button
                onClick={() => setCurrentTab('all')}
                className={`pb-2 text-xs font-semibold relative transition-colors ${
                  currentTab === 'all' ? 'text-white' : 'text-dark-400 hover:text-white'
                }`}
              >
                Actifs ({courses.filter(c => !c.archived).length})
                {currentTab === 'all' && <div className="absolute bottom-0 left-0 right-0 h-[1.5px] bg-white rounded-full" />}
              </button>
              <button
                onClick={() => setCurrentTab('archived')}
                className={`pb-2 text-xs font-semibold relative transition-colors ${
                  currentTab === 'archived' ? 'text-white' : 'text-dark-400 hover:text-white'
                }`}
              >
                Archives ({courses.filter(c => c.archived).length})
                {currentTab === 'archived' && <div className="absolute bottom-0 left-0 right-0 h-[1.5px] bg-white rounded-full" />}
              </button>
            </div>

            {/* Courses Listing Grid */}
            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[1, 2, 3].map((n) => (
                  <div key={n} className="rounded-md border border-dark-850 bg-dark-900/40 p-4 space-y-3 animate-pulse">
                    <div className="h-4 w-2/3 bg-dark-800 rounded" />
                    <div className="space-y-1.5">
                      <div className="h-3 w-full bg-dark-800 rounded" />
                      <div className="h-3 w-5/6 bg-dark-800 rounded" />
                    </div>
                    <div className="pt-3 flex items-center justify-between border-t border-dark-850/60">
                      <div className="h-3 w-1/3 bg-dark-800 rounded" />
                      <div className="h-3 w-1/4 bg-dark-800 rounded" />
                    </div>
                  </div>
                ))}
              </div>
            ) : filteredCourses.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredCourses.map((course) => (
                  <div
                    key={course.id}
                    onClick={() => {
                      if (course.status === 'generating' && course.job_id) {
                        setReconnectJobId(course.job_id);
                        setIsModalOpen(true);
                      } else {
                        navigate(`/course/${course.id}`);
                      }
                    }}
                    className="group relative flex flex-col justify-between rounded-md border border-dark-850 bg-dark-900/50 p-4 hover:border-dark-700 cursor-pointer overflow-hidden transition-all duration-200"
                  >
                    {/* Quick Action Buttons */}
                    <div className="absolute top-3 right-3 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-150 z-10">
                      {course.partial && (
                        <button
                          onClick={(e) => handleResume(e, course)}
                          className="p-1 rounded bg-dark-800 border border-dark-700/60 text-dark-300 hover:text-white transition-all"
                          title="Reprendre la génération"
                        >
                          <Sparkles className="h-3.5 w-3.5" />
                        </button>
                      )}
                      <button
                        onClick={(e) => handlePinToggle(e, course)}
                        className="p-1 rounded bg-dark-800 border border-dark-700/60 text-dark-300 hover:text-white transition-all"
                        title={course.pinned ? "Désépingler" : "Épingler"}
                      >
                        <Pin className={`h-3.5 w-3.5 ${course.pinned ? 'fill-white text-white' : ''}`} />
                      </button>
                      <button
                        onClick={(e) => handleArchiveToggle(e, course)}
                        className="p-1 rounded bg-dark-800 border border-dark-700/60 text-dark-300 hover:text-white transition-all"
                        title={course.archived ? "Désarchiver" : "Archiver"}
                      >
                        <Archive className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={(e) => handleExport(e, course)}
                        className="p-1 rounded bg-dark-800 border border-dark-700/60 text-dark-300 hover:text-white transition-all"
                        title="Exporter (.zip)"
                      >
                        <Download className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={(e) => handleDeleteClick(e, course)}
                        className="p-1 rounded bg-dark-800 border border-dark-700/60 text-dark-300 hover:text-rose-500 transition-all"
                        title="Supprimer"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>

                    {/* Status Indicators when not hovered */}
                    <div className="absolute top-3 right-3 flex items-center gap-1 group-hover:opacity-0 transition-opacity duration-150 select-none z-10">
                      {course.pinned && (
                        <div className="h-5 w-5 flex items-center justify-center rounded bg-dark-800 text-white border border-dark-700/50 shadow-sm">
                          <Pin className="h-3 w-3 fill-white text-white" />
                        </div>
                      )}
                    </div>

                    <div className="space-y-2.5">
                      <div className="flex items-center gap-2">
                        <div className="flex h-7 w-7 items-center justify-center rounded-md bg-dark-800 text-dark-300 shrink-0">
                          {course.status === 'generating' ? (
                            <Loader2 className="h-4.5 w-4.5 text-white animate-spin" />
                          ) : (
                            <BookOpen className="h-4 w-4" />
                          )}
                        </div>

                        {/* Group status badges & progress percentages next to the icon */}
                        <div className="flex items-center gap-1.5">
                          {course.status === 'generating' ? (
                            <span className="text-[9px] font-semibold text-white bg-dark-850 border border-dark-700 rounded-sm px-2 py-0.5 font-mono select-none tracking-wide animate-pulse">
                              Rédaction...
                            </span>
                          ) : course.partial ? (
                            <span className="text-[9px] font-semibold text-amber-500 bg-amber-950/20 border border-amber-900/30 rounded-sm px-2 py-0.5 font-mono select-none tracking-wide">
                              Génération Partielle
                            </span>
                          ) : null}

                          {course.status !== 'generating' && course.total_submodules ? (
                            <div className="h-5 px-1.5 flex items-center justify-center rounded-sm bg-dark-800 text-zinc-300 border border-dark-700/50 font-mono text-[9px] font-medium shadow-sm">
                              {(() => {
                                const total = course.total_submodules || 0;
                                const completed = getCompletedCount(course.id);
                                return total > 0 ? Math.round((completed / total) * 100) : 0;
                              })()}%
                            </div>
                          ) : null}
                        </div>
                      </div>
                      
                      <div className="space-y-0.5">
                        <h3 className="text-sm font-semibold text-white group-hover:text-zinc-300 line-clamp-1 transition-colors">
                          {course.title}
                        </h3>
                      </div>

                      <p className="text-xs text-dark-400 line-clamp-3 leading-relaxed">
                        {course.status === 'generating'
                          ? "Le cours est actuellement planifié et en cours de rédaction active par l'intelligence artificielle..."
                          : (course.description || "Aucune description générée pour ce cours.")
                        }
                      </p>
                    </div>

                    <div className="pt-4 mt-4 border-t border-dark-850/60 flex items-center justify-between text-[10px] text-dark-400 font-mono">
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        <span>{formatDate(course.created_at)}</span>
                      </div>
                      <div className="flex items-center gap-0.5 text-white font-medium">
                        {course.status === 'generating' ? (
                          <>
                            Suivre
                            <Loader2 className="h-3 w-3 animate-spin ml-0.5" />
                          </>
                        ) : (
                          <>
                            Étudier
                            <ChevronRight className="h-3 w-3" />
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              /* Empty State */
              <div className="flex flex-col items-center justify-center border border-dashed border-dark-800 rounded-md bg-dark-900/10 py-12 px-4 text-center max-w-md mx-auto">
                <div className="flex h-10 w-10 items-center justify-center rounded-md bg-dark-800 text-dark-300 mb-3">
                  <Sparkles className="h-5 w-5" />
                </div>
                
                <h3 className="text-xs font-semibold text-white mb-1">
                  {searchQuery ? 'Aucun résultat trouvé' : 'Commencez votre voyage pédagogique'}
                </h3>
                
                <p className="text-[11px] text-dark-400 mb-4 max-w-xs leading-relaxed">
                  {searchQuery
                    ? `Aucun cours ne correspond à la recherche "${searchQuery}". Essayez un autre terme.`
                    : 'Vous n\'avez pas encore généré de cours. Créez votre premier manuel personnalisé en cliquant sur le bouton ci-dessous.'}
                </p>

                {searchQuery ? (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="rounded-md border border-dark-800 bg-transparent px-3 py-1 text-xs font-medium text-white hover:bg-dark-800 transition-all cursor-pointer"
                  >
                    Réinitialiser la recherche
                  </button>
                ) : (
                  <button
                    onClick={() => setIsModalOpen(true)}
                    className="flex items-center gap-1.5 rounded-md bg-zinc-100 px-4 py-1.5 text-xs font-semibold text-zinc-950 hover:bg-zinc-200 transition-all cursor-pointer"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Générer mon premier cours
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Course Generation Modal */}
      <GenerateCourseModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setReconnectJobId(null);
          fetchCourses();
        }}
        onSuccess={handleGenerationSuccess}
        reconnectJobId={reconnectJobId}
      />

      {/* Delete Confirmation Modal */}
      {courseToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
          <div className="relative w-full max-w-sm rounded-md border border-dark-800 bg-dark-900 p-5 shadow-xl animate-in fade-in zoom-in-95 duration-150">
            <button
              onClick={() => setCourseToDelete(null)}
              className="absolute top-3 right-3 h-6 w-6 flex items-center justify-center rounded-md border border-dark-800 bg-dark-950/40 text-dark-400 hover:text-white hover:bg-dark-800 transition-all cursor-pointer"
            >
              <X className="h-3.5 w-3.5" />
            </button>

            <div className="flex flex-col items-center text-center space-y-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-rose-950/30 text-rose-500 border border-rose-900/45">
                <AlertTriangle className="h-5 w-5" />
              </div>
              
              <div>
                <h3 className="text-sm font-semibold text-white">Supprimer définitivement ?</h3>
                <p className="text-xs text-dark-400 mt-1.5 leading-relaxed">
                  Cette action est irréversible. Le cours <span className="text-white font-mono font-medium">"{courseToDelete.title}"</span> sera supprimé de votre disque.
                </p>
              </div>

              <div className="w-full text-left space-y-1.5 mt-2">
                <label className="text-[10px] font-semibold text-dark-400 uppercase tracking-wider font-mono">
                  Saisissez <span className="text-rose-500 font-bold select-none">SUPPRIMER</span> pour confirmer :
                </label>
                <input
                  type="text"
                  placeholder="Tapez SUPPRIMER..."
                  value={deleteConfirmText}
                  onChange={(e) => setDeleteConfirmText(e.target.value)}
                  className="w-full rounded-md border border-dark-800 bg-dark-950 px-3 py-1.5 text-xs text-white placeholder-dark-500 focus:border-rose-500 focus:outline-none transition-all font-mono uppercase"
                />
              </div>

              <div className="flex gap-2.5 w-full pt-3">
                <button
                  onClick={() => setCourseToDelete(null)}
                  className="flex-1 rounded-md border border-dark-800 bg-transparent py-1.5 text-xs font-semibold text-dark-300 hover:bg-dark-800 hover:text-white transition-all cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  onClick={handleConfirmDelete}
                  disabled={deleteConfirmText !== 'SUPPRIMER'}
                  className="flex-1 rounded-md bg-rose-600 hover:bg-rose-500 disabled:opacity-40 disabled:hover:bg-rose-600 disabled:cursor-not-allowed py-1.5 text-xs font-semibold text-white transition-all shadow-md flex items-center justify-center gap-1 cursor-pointer"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Supprimer
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Home;
