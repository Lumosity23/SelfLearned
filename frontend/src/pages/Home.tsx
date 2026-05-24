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
    // Redirect to the newly generated course
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
    // python mtime is in seconds, javascript expects milliseconds
    return new Date(mtime * 1000).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="flex h-screen w-screen bg-dark-950 text-dark-200 overflow-hidden font-sans relative">
      {/* 1. Global Left Sidebar */}
      <MainSidebar />

      {/* 2. Main content container */}
      <div className="flex-1 flex flex-col h-full overflow-hidden relative">
        {/* Decorative background grid & radial glow */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#1a1a1e_1px,transparent_1px),linear-gradient(to_bottom,#1a1a1e_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] opacity-35 pointer-events-none" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 h-[350px] w-[600px] bg-brand-500/10 blur-[120px] rounded-full pointer-events-none" />

        <div className="flex-1 overflow-y-auto px-8 py-12 relative">
          <div className="max-w-5xl mx-auto">
            {/* Top Navbar */}
            <header className="flex items-center justify-between border-b border-dark-800/60 pb-6 mb-10 shrink-0">
              <div>
                <h1 className="text-xl font-bold text-white tracking-tight m-0 leading-none">
                  <GraduationCap className="inline-block h-5 w-5 text-brand-500 mr-2.5 -mt-1" />
                  Mes Cursus Académiques
                </h1>
                <p className="text-[10px] text-dark-400 font-mono mt-1.5">Gérez vos manuels planifiés et rédigés par l'IA</p>
              </div>

              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2 rounded-lg border border-dark-900 bg-dark-900/60 hover:bg-dark-800 px-4 py-2.5 text-xs font-semibold text-dark-200 hover:text-white transition-all cursor-pointer">
                  {importing ? (
                    <Loader2 className="h-3.5 w-3.5 text-brand-500 animate-spin" />
                  ) : (
                    <Upload className="h-3.5 w-3.5 text-brand-500" />
                  )}
                  {importing ? 'Importation...' : 'Importer (.zip)'}
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
                  className="flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-brand-500 transition-all shadow-md shadow-brand-600/10 hover:shadow-brand-600/20 cursor-pointer"
                >
                  <Plus className="h-4 w-4" />
                  Nouveau Cours
                </button>
              </div>
            </header>

        {/* Hero Section */}
        <div className="text-center max-w-2xl mx-auto mb-16">
          <h2 className="text-4xl md:text-5xl font-extrabold text-white tracking-tight mb-4">
            Générez votre <span className="bg-gradient-to-r from-blue-400 via-indigo-400 to-brand-500 bg-clip-text text-transparent">savoir</span> sur mesure
          </h2>
          <p className="text-dark-400 text-lg">
            Saisissez n'importe quel sujet académique ou technique. Notre intelligence artificielle rédigera pour vous un livre de cours complet avec des exercices de validation et un export PDF au pixel près.
          </p>
        </div>

        {/* Action & Filter Bar */}
        <div className="flex flex-col sm:flex-row gap-4 justify-between items-center mb-8">
          <div className="relative w-full sm:max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-dark-400" />
            <input
              type="text"
              placeholder="Rechercher parmi vos cours..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-lg border border-dark-900 bg-dark-900/60 pl-10 pr-4 py-2.5 text-sm text-white placeholder-dark-400 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 transition-all"
            />
          </div>
          
          <div className="text-xs font-mono text-dark-400 self-end sm:self-center">
            {courses.filter(c => !c.archived).length} actif{courses.filter(c => !c.archived).length > 1 ? 's' : ''} au total
          </div>
        </div>

        {/* Tab Selector (Active vs Archived) */}
        <div className="flex border-b border-dark-900/60 gap-6 mb-8 select-none">
          <button
            onClick={() => setCurrentTab('all')}
            className={`pb-3 text-xs font-bold uppercase tracking-wider relative transition-colors ${
              currentTab === 'all' ? 'text-white' : 'text-dark-400 hover:text-white'
            }`}
          >
            Tous vos cours ({courses.filter(c => !c.archived).length})
            {currentTab === 'all' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand-500 rounded-full" />}
          </button>
          <button
            onClick={() => setCurrentTab('archived')}
            className={`pb-3 text-xs font-bold uppercase tracking-wider relative transition-colors ${
              currentTab === 'archived' ? 'text-white' : 'text-dark-400 hover:text-white'
            }`}
          >
            Archives ({courses.filter(c => c.archived).length})
            {currentTab === 'archived' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand-500 rounded-full" />}
          </button>
        </div>

        {/* Courses Listing Grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((n) => (
              <div key={n} className="rounded-xl border border-dark-900 bg-dark-900/40 p-6 space-y-4 animate-pulse">
                <div className="h-5 w-2/3 bg-dark-800 rounded" />
                <div className="space-y-2">
                  <div className="h-3.5 w-full bg-dark-800 rounded" />
                  <div className="h-3.5 w-5/6 bg-dark-800 rounded" />
                </div>
                <div className="pt-4 flex items-center justify-between border-t border-dark-900">
                  <div className="h-3 w-1/3 bg-dark-800 rounded" />
                  <div className="h-3 w-1/4 bg-dark-800 rounded" />
                </div>
              </div>
            ))}
          </div>
        ) : filteredCourses.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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
                className="group relative flex flex-col justify-between rounded-xl border border-dark-900 bg-dark-900/40 p-6 glow-hover cursor-pointer overflow-hidden transition-all duration-300"
              >
                {/* Course Card Glow */}
                <div className="absolute top-0 right-0 -mr-16 -mt-16 h-32 w-32 bg-brand-500/5 blur-3xl rounded-full group-hover:bg-brand-500/10 transition-all duration-300 pointer-events-none" />

                {/* Pin Badge & Quick Action Buttons */}
                <div className="absolute top-4 right-4 flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-10">
                  {course.partial && (
                    <button
                      onClick={(e) => handleResume(e, course)}
                      className="p-1.5 rounded-lg border border-dark-900 bg-dark-900/90 text-brand-400 hover:text-brand-300 hover:border-brand-500/30 transition-all shadow-md"
                      title="Reprendre la génération"
                    >
                      <Sparkles className="h-3.5 w-3.5 fill-brand-500/10 text-brand-400" />
                    </button>
                  )}
                  <button
                    onClick={(e) => handlePinToggle(e, course)}
                    className="p-1.5 rounded-lg border border-dark-900 bg-dark-900/90 text-dark-300 hover:text-brand-400 hover:border-brand-500/30 transition-all shadow-md"
                    title={course.pinned ? "Désépingler" : "Épingler"}
                  >
                    <Pin className={`h-3.5 w-3.5 ${course.pinned ? 'fill-brand-500 text-brand-500' : ''}`} />
                  </button>
                  <button
                    onClick={(e) => handleArchiveToggle(e, course)}
                    className="p-1.5 rounded-lg border border-dark-900 bg-dark-900/90 text-dark-300 hover:text-purple-400 hover:border-purple-500/30 transition-all shadow-md"
                    title={course.archived ? "Désarchiver" : "Archiver"}
                  >
                    <Archive className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={(e) => handleExport(e, course)}
                    className="p-1.5 rounded-lg border border-dark-900 bg-dark-900/90 text-dark-300 hover:text-emerald-400 hover:border-emerald-500/30 transition-all shadow-md"
                    title="Exporter (.zip)"
                  >
                    <Download className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={(e) => handleDeleteClick(e, course)}
                    className="p-1.5 rounded-lg border border-dark-900 bg-dark-900/90 text-dark-300 hover:text-rose-500 hover:border-rose-500/30 transition-all shadow-md"
                    title="Supprimer"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>

                {/* Pinned Indicator when not hovered */}
                {/* Status / Pinned Indicators when not hovered */}
                <div className="absolute top-4 right-4 flex items-center gap-1.5 group-hover:opacity-0 transition-opacity duration-300 select-none z-10">
                  {course.pinned && (
                    <div className="h-7 w-7 flex items-center justify-center rounded-xl bg-brand-500/10 text-brand-500 border border-brand-500/20 shadow-sm">
                      <Pin className="h-3.5 w-3.5 fill-brand-500 text-brand-500" />
                    </div>
                  )}
                  {course.status !== 'generating' && course.total_submodules ? (
                    <div className="h-7 px-2.5 flex items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/25 font-mono text-[10px] font-extrabold shadow-sm">
                      {(() => {
                        const total = course.total_submodules || 0;
                        const completed = getCompletedCount(course.id);
                        return total > 0 ? Math.round((completed / total) * 100) : 0;
                      })()}%
                    </div>
                  ) : null}
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-dark-800 group-hover:bg-brand-500/10 text-dark-400 group-hover:text-brand-500 transition-colors shrink-0">
                      {course.status === 'generating' ? (
                        <Loader2 className="h-5 w-5 text-brand-500 animate-spin" />
                      ) : (
                        <BookOpen className="h-5 w-5" />
                      )}
                    </div>
                    {course.status === 'generating' ? (
                      <span className="text-[10px] font-semibold text-brand-400 bg-brand-500/10 border border-brand-500/30 rounded-full px-2.5 py-0.5 font-mono select-none tracking-wide animate-pulse">
                        Rédaction en cours...
                      </span>
                    ) : course.partial && (
                      <span className="text-[10px] font-semibold text-amber-500 bg-amber-500/10 border border-amber-500/30 rounded-full px-2.5 py-0.5 font-mono select-none tracking-wide animate-pulse">
                        Génération Partielle / RAW
                      </span>
                    )}
                  </div>
                  
                  <div className="space-y-1">
                    <h3 className="text-base font-bold text-white group-hover:text-brand-500 line-clamp-1 transition-colors">
                      {course.title}
                    </h3>
                  </div>

                  <p className="text-sm text-dark-400 line-clamp-3 leading-relaxed">
                    {course.status === 'generating'
                      ? "Le cours est actuellement planifié et en cours de rédaction active par l'intelligence artificielle..."
                      : (course.description || "Aucune description générée pour ce cours.")
                    }
                  </p>
                </div>

                <div className="pt-6 mt-6 border-t border-dark-900/40 flex items-center justify-between text-xs text-dark-400 font-mono">
                  <div className="flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5" />
                    <span>{formatDate(course.created_at)}</span>
                  </div>
                  <div className="flex items-center gap-0.5 text-brand-500 font-bold group-hover:translate-x-1 transition-transform">
                    {course.status === 'generating' ? (
                      <>
                        Suivre
                        <Loader2 className="h-3.5 w-3.5 animate-spin ml-1" />
                      </>
                    ) : (
                      <>
                        Étudier
                        <ChevronRight className="h-3.5 w-3.5" />
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* Empty State */
          <div className="flex flex-col items-center justify-center border border-dashed border-dark-850 rounded-2xl bg-dark-900/20 py-16 px-6 text-center max-w-xl mx-auto">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-600/10 text-brand-500 mb-4 animate-bounce">
              <Sparkles className="h-6 w-6" />
            </div>
            
            <h3 className="text-lg font-bold text-white mb-2">
              {searchQuery ? 'Aucun résultat trouvé' : 'Commencez votre voyage pédagogique'}
            </h3>
            
            <p className="text-sm text-dark-400 mb-6 max-w-sm">
              {searchQuery
                ? `Aucun cours ne correspond à la recherche "${searchQuery}". Essayez un autre terme.`
                : 'Vous n\'avez pas encore généré de cours. Créez votre premier manuel personnalisé en cliquant sur le bouton ci-dessous.'}
            </p>

            {searchQuery ? (
              <button
                onClick={() => setSearchQuery('')}
                className="rounded-lg border border-dark-900 bg-transparent px-4 py-2 text-sm font-medium text-white hover:bg-dark-800 transition-all"
              >
                Réinitialiser la recherche
              </button>
            ) : (
              <button
                onClick={() => setIsModalOpen(true)}
                className="flex items-center gap-2 rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-500 transition-all shadow-lg shadow-brand-600/10 hover:shadow-brand-600/20"
              >
                <Plus className="h-4.5 w-4.5" />
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
          fetchCourses(); // Re-fetch courses list when closed
        }}
        onSuccess={handleGenerationSuccess}
        reconnectJobId={reconnectJobId}
      />

      {/* Delete Confirmation Modal */}
      {courseToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="relative w-full max-w-md rounded-2xl border border-dark-900 bg-dark-900/80 backdrop-blur-xl p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <button
              onClick={() => setCourseToDelete(null)}
              className="absolute top-4 right-4 h-8 w-8 flex items-center justify-center rounded-lg border border-dark-900 bg-dark-950/40 text-dark-400 hover:text-white hover:bg-dark-800 transition-all"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="flex flex-col items-center text-center space-y-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-rose-500/10 text-rose-500 border border-rose-500/20">
                <AlertTriangle className="h-6 w-6 animate-pulse" />
              </div>
              
              <div>
                <h3 className="text-lg font-bold text-white">Supprimer définitivement ?</h3>
                <p className="text-sm text-dark-400 mt-2">
                  Cette action est irréversible. Le cours <span className="text-white font-semibold font-mono">"{courseToDelete.title}"</span> sera supprimé de votre disque.
                </p>
              </div>

              <div className="w-full text-left space-y-2 mt-2">
                <label className="text-[10px] font-bold text-dark-400 uppercase tracking-wider font-mono">
                  Saisissez le mot <span className="text-rose-500 font-bold select-none">SUPPRIMER</span> pour confirmer :
                </label>
                <input
                  type="text"
                  placeholder="Tapez SUPPRIMER..."
                  value={deleteConfirmText}
                  onChange={(e) => setDeleteConfirmText(e.target.value)}
                  className="w-full rounded-lg border border-dark-900 bg-dark-950/60 px-4 py-2.5 text-sm text-white placeholder-dark-500 focus:border-rose-500 focus:outline-none focus:ring-1 focus:ring-rose-500 transition-all font-mono uppercase"
                />
              </div>

              <div className="flex gap-3 w-full pt-4">
                <button
                  onClick={() => setCourseToDelete(null)}
                  className="flex-1 rounded-lg border border-dark-900 bg-transparent py-2.5 text-sm font-semibold text-dark-300 hover:bg-dark-800 hover:text-white transition-all"
                >
                  Annuler
                </button>
                <button
                  onClick={handleConfirmDelete}
                  disabled={deleteConfirmText !== 'SUPPRIMER'}
                  className="flex-1 rounded-lg bg-rose-600 hover:bg-rose-500 disabled:opacity-40 disabled:hover:bg-rose-600 disabled:cursor-not-allowed py-2.5 text-sm font-semibold text-white transition-all shadow-md shadow-rose-600/15 flex items-center justify-center gap-1.5"
                >
                  <Trash2 className="h-4 w-4" />
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
