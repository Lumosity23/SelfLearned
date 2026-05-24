import React, { useState, useEffect } from 'react';
import { 
  Folder, FolderOpen, FileCode, FileText, ChevronRight, 
  ChevronDown, Copy, Check, Loader2, RefreshCw 
} from 'lucide-react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { MainSidebar } from '../components/MainSidebar';
import { useToast } from '../components/ToastProvider';

interface Course {
  id: string;
  title: string;
  description: string;
}

interface FileNode {
  name: string;
  path: string;
  is_dir: boolean;
  size?: number;
  children?: FileNode[];
}

export const FileExplorerPage: React.FC = () => {
  const { addToast } = useToast();
  
  // Courses states
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState<string>('');
  const [loadingCourses, setLoadingCourses] = useState(true);

  // Files states
  const [filesTree, setFilesTree] = useState<FileNode[]>([]);
  const [expandedDirs, setExpandedDirs] = useState<Record<string, boolean>>({});
  const [selectedFilePath, setSelectedFilePath] = useState<string | null>(null);
  const [fileContent, setFileContent] = useState<string | null>(null);
  const [loadingTree, setLoadingTree] = useState(false);
  const [loadingFile, setLoadingFile] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Dropdown state
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  // 1. Fetch available courses on mount
  const fetchCourses = async () => {
    try {
      setLoadingCourses(true);
      const res = await fetch('/api/courses');
      if (res.ok) {
        const data = await res.json();
        // Filter out generating courses if needed, but active RAW exploration on partials is useful!
        setCourses(data);
        
        if (data.length > 0) {
          // Default to last visited course or first available
          const lastVisited = localStorage.getItem('last_visited_course_id');
          const found = data.find((c: Course) => c.id === lastVisited);
          const defaultId = found ? found.id : data[0].id;
          setSelectedCourseId(defaultId);
        }
      }
    } catch (err) {
      console.error('Error fetching courses for explorer:', err);
    } finally {
      setLoadingCourses(false);
    }
  };

  useEffect(() => {
    fetchCourses();
  }, []);

  // 2. Fetch file tree when selected course changes
  const fetchFilesTree = async () => {
    if (!selectedCourseId) return;
    setLoadingTree(true);
    setError(null);
    setSelectedFilePath(null);
    setFileContent(null);
    setCopied(false);
    try {
      const res = await fetch(`/api/courses/${selectedCourseId}/files`);
      if (!res.ok) {
        throw new Error("Impossible de charger l'arborescence physique de ce cours.");
      }
      const data = await res.json();
      setFilesTree(data);
      
      // Auto-expand first level directories
      const initialExpanded: Record<string, boolean> = {};
      data.forEach((node: FileNode) => {
        if (node.is_dir) {
          initialExpanded[node.path] = true;
        }
      });
      setExpandedDirs(initialExpanded);
      
      // Save last visited course
      localStorage.setItem('last_visited_course_id', selectedCourseId);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Une erreur est survenue lors de la lecture du disque.");
    } finally {
      setLoadingTree(false);
    }
  };

  useEffect(() => {
    fetchFilesTree();
  }, [selectedCourseId]);

  const toggleDirectory = (path: string) => {
    setExpandedDirs(prev => ({
      ...prev,
      [path]: !prev[path]
    }));
  };

  const handleFileClick = async (path: string) => {
    if (!selectedCourseId) return;
    setSelectedFilePath(path);
    setLoadingFile(true);
    setFileContent(null);
    setCopied(false);
    try {
      const res = await fetch(`/api/courses/${selectedCourseId}/content/${encodeURIComponent(path)}`);
      if (!res.ok) {
        throw new Error("Impossible de charger le contenu de ce fichier.");
      }
      const data = await res.json();
      
      // If it is JSON, format it nicely for premium output
      let content = data.content;
      if (path.endsWith('.json')) {
        try {
          content = JSON.stringify(JSON.parse(content), null, 2);
        } catch (e) {
          // Fail silent and show unformatted
        }
      }
      setFileContent(content);
    } catch (err: any) {
      console.error(err);
      setFileContent(`Erreur : ${err.message || "Impossible de lire le fichier."}`);
    } finally {
      setLoadingFile(false);
    }
  };

  const handleCopy = async () => {
    if (!fileContent) return;
    try {
      await navigator.clipboard.writeText(fileContent);
      setCopied(true);
      addToast({
        title: 'Fichier copié',
        description: 'Le contenu brut a été copié dans votre presse-papier.',
        type: 'success'
      });
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy: ', err);
    }
  };

  const getLanguage = (filename: string) => {
    if (filename.endsWith('.json')) return 'json';
    if (filename.endsWith('.md')) return 'markdown';
    if (filename.endsWith('.log')) return 'text';
    return 'text';
  };

  const formatSize = (bytes?: number) => {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const renderTree = (nodes: FileNode[], depth = 0) => {
    return nodes.map((node) => {
      const isExpanded = !!expandedDirs[node.path];
      const isSelected = selectedFilePath === node.path;
      const paddingLeft = `${depth * 12 + 8}px`;

      if (node.is_dir) {
        return (
          <div key={node.path} className="select-none">
            <button
              onClick={() => toggleDirectory(node.path)}
              style={{ paddingLeft }}
              className="w-full flex items-center gap-1.5 py-1.5 text-xs text-dark-300 hover:text-white hover:bg-dark-800/40 rounded-md transition-all text-left cursor-pointer"
            >
              {isExpanded ? (
                <ChevronDown className="h-3.5 w-3.5 text-dark-400 shrink-0" />
              ) : (
                <ChevronRight className="h-3.5 w-3.5 text-dark-400 shrink-0" />
              )}
              {isExpanded ? (
                <FolderOpen className="h-4 w-4 text-zinc-400 shrink-0" />
              ) : (
                <Folder className="h-4 w-4 text-zinc-500 shrink-0" />
              )}
              <span className="truncate font-semibold">{node.name}</span>
            </button>
            {isExpanded && node.children && (
              <div className="mt-0.5">
                {renderTree(node.children, depth + 1)}
              </div>
            )}
          </div>
        );
      } else {
        const isJson = node.name.endsWith('.json');
        const isLog = node.name.endsWith('.log');
        return (
          <button
            key={node.path}
            onClick={() => handleFileClick(node.path)}
            style={{ paddingLeft: `${depth * 12 + 22}px` }}
            className={`w-full flex items-center justify-between py-1.5 pr-2.5 text-xs rounded-md transition-all text-left cursor-pointer ${
              isSelected
                ? 'bg-dark-800 text-white border-l border-zinc-500 font-semibold pl-[20px]'
                : 'text-dark-400 hover:text-dark-200 hover:bg-dark-800/20'
            }`}
          >
            <div className="flex items-center gap-1.5 truncate">
              {isJson ? (
                <FileCode className="h-3.5 w-3.5 text-zinc-400 shrink-0" />
              ) : isLog ? (
                <FileText className="h-3.5 w-3.5 text-zinc-450 shrink-0" />
              ) : (
                <FileText className="h-3.5 w-3.5 text-zinc-400 shrink-0" />
              )}
              <span className="truncate">{node.name}</span>
            </div>
            <span className="text-[9px] font-mono text-dark-500 font-bold shrink-0 select-none">
              {formatSize(node.size)}
            </span>
          </button>
        );
      }
    });
  };

  return (
    <div className="flex h-screen w-screen bg-dark-950 text-dark-200 overflow-hidden font-sans relative">
      {/* 1. Global Left Sidebar */}
      <MainSidebar />

      {/* 2. Main content container */}
      <div className="flex-1 flex flex-col h-full overflow-hidden relative">
        {/* Decorative background grid & neutral background glow */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#141417_1px,transparent_1px),linear-gradient(to_bottom,#141417_1px,transparent_1px)] bg-[size:4rem_4rem] opacity-35 pointer-events-none" />

        {/* Top Header Bar */}
        <header className="relative flex items-center justify-between border-b border-dark-850 px-8 py-5 bg-dark-900/20 backdrop-blur-md shrink-0">
          <div>
            <h1 className="text-sm font-semibold text-white tracking-tight m-0 leading-none flex items-center">
              <FolderOpen className="inline-block h-4.5 w-4.5 text-zinc-400 mr-2" />
              Explorateur de fichiers RAW
            </h1>
            <p className="text-[10px] text-dark-400 font-mono mt-1">Consultez en temps réel l'arborescence physique et le code source de vos cours</p>
          </div>

          {/* Custom ShadCN Dropdown Select Course Selector */}
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold text-dark-400 uppercase tracking-wider font-mono">Cursus :</span>
            {loadingCourses ? (
              <div className="h-9 w-64 rounded-md border border-dark-900 bg-dark-900/60 backdrop-blur-md flex items-center px-4 gap-2 text-xs text-dark-400">
                <Loader2 className="h-3.5 w-3.5 animate-spin text-zinc-500" />
                Chargement...
              </div>
            ) : (
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  className="h-9 w-64 flex items-center justify-between rounded-md border border-dark-800 bg-dark-900 px-3.5 text-xs text-zinc-200 hover:text-white hover:bg-dark-850 hover:border-dark-750 transition-all font-sans cursor-pointer shadow-sm select-none"
                >
                  <span className="truncate">
                    {courses.find(c => c.id === selectedCourseId)?.title || "Aucun manuel disponible"}
                  </span>
                  <ChevronDown className={`h-3.5 w-3.5 text-dark-400 transition-transform duration-200 ${isDropdownOpen ? 'rotate-180' : ''}`} />
                </button>

                {isDropdownOpen && (
                  <>
                    <div 
                      className="fixed inset-0 z-20" 
                      onClick={() => setIsDropdownOpen(false)}
                    />
                    <div className="absolute right-0 mt-1 w-64 rounded-md border border-dark-800 bg-dark-900 py-1 shadow-xl z-30 animate-in fade-in slide-in-from-top-1 duration-150">
                      {courses.map((c) => (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => {
                            setSelectedCourseId(c.id);
                            setIsDropdownOpen(false);
                          }}
                          className={`w-full px-3.5 py-2.5 text-left text-xs transition-all font-sans truncate cursor-pointer hover:bg-dark-800 hover:text-white ${
                            selectedCourseId === c.id ? 'bg-dark-850 text-white font-semibold' : 'text-dark-300'
                          }`}
                        >
                          {c.title}
                        </button>
                      ))}
                      {courses.length === 0 && (
                        <div className="px-3.5 py-2.5 text-xs text-dark-500 italic">
                          Aucun manuel disponible
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </header>

        {/* Dual Pane File Explorer Layout */}
        <div className="flex-1 p-6 overflow-hidden">
          {selectedCourseId ? (
            <div className="flex border border-dark-800 bg-dark-900/25 rounded-2xl overflow-hidden h-[calc(100vh-170px)] shadow-2xl backdrop-blur-md">
              {/* Left Pane: Directory Tree */}
              <div className="w-80 border-r border-dark-800 flex flex-col bg-dark-950/40 select-none">
                <div className="flex items-center justify-between px-5 py-3.5 border-b border-dark-850 bg-dark-950/20 shrink-0">
                  <span className="text-[10px] font-extrabold text-white uppercase tracking-wider">Arborescence physique</span>
                  <button 
                    onClick={fetchFilesTree}
                    disabled={loadingTree}
                    className="text-dark-400 hover:text-white p-1 hover:bg-dark-800 rounded-lg border border-transparent hover:border-dark-850 transition-all cursor-pointer"
                    title="Actualiser le disque"
                  >
                    <RefreshCw className={`h-3.5 w-3.5 ${loadingTree ? 'animate-spin' : ''}`} />
                  </button>
                </div>
                <div className="flex-1 overflow-y-auto p-3 space-y-1 custom-scrollbar">
                  {loadingTree && filesTree.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-48 space-y-2 text-dark-500 text-xs">
                      <Loader2 className="h-5 w-5 animate-spin text-zinc-500" />
                      <span className="font-mono">Indexation disque...</span>
                    </div>
                  ) : error ? (
                    <div className="p-4 text-xs text-rose-400 text-center font-semibold bg-rose-950/5 border border-rose-500/20 rounded-xl">
                      {error}
                    </div>
                  ) : (
                    renderTree(filesTree)
                  )}
                </div>
              </div>

              {/* Right Pane: Source Code Viewer */}
              <div className="flex-1 flex flex-col bg-dark-950/20 overflow-hidden">
                {selectedFilePath ? (
                  <div className="flex flex-col h-full overflow-hidden">
                    {/* File Header Bar */}
                    <div className="flex items-center justify-between px-6 py-3 border-b border-dark-850 bg-dark-950/40 font-mono text-[10px] text-dark-400 shrink-0 select-none">
                      <div className="flex items-center gap-2.5 truncate pr-4">
                        <span className="text-dark-500 font-bold uppercase select-none font-mono text-[8px] bg-dark-900 border border-dark-800 px-1.5 py-0.5 rounded">PATH</span>
                        <span className="truncate text-white font-bold text-[11px] font-mono">{selectedFilePath}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-[9px] uppercase font-semibold text-zinc-400 bg-dark-900 border border-dark-800 px-2 py-0.5 rounded select-none">
                          {getLanguage(selectedFilePath)}
                        </span>
                        <button
                          onClick={handleCopy}
                          disabled={!fileContent}
                          className="flex items-center gap-1.5 hover:text-white transition-all bg-dark-900 hover:bg-dark-800 border border-dark-800 hover:border-dark-850 px-3 py-1.5 rounded-lg text-xs font-bold select-none cursor-pointer"
                        >
                          {copied ? (
                            <>
                              <Check className="h-3.5 w-3.5 text-zinc-400" />
                              <span>Copié</span>
                            </>
                          ) : (
                            <>
                              <Copy className="h-3.5 w-3.5" />
                              <span>Copier brut</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Source Code Container */}
                    <div className="flex-1 overflow-auto bg-dark-950/60 p-5 font-mono text-xs select-text custom-scrollbar">
                      {loadingFile ? (
                        <div className="flex flex-col items-center justify-center h-full space-y-2 text-dark-500">
                          <Loader2 className="h-6 w-6 animate-spin text-zinc-500" />
                          <span>Chargement de la ressource...</span>
                        </div>
                      ) : fileContent !== null ? (
                        <SyntaxHighlighter
                          style={vscDarkPlus as any}
                          language={getLanguage(selectedFilePath)}
                          PreTag="div"
                          showLineNumbers={true}
                          wrapLines={true}
                          lineNumberStyle={{ color: '#4b5563', paddingRight: '12px', userSelect: 'none' }}
                          customStyle={{
                            margin: 0,
                            padding: 0,
                            background: 'transparent',
                            fontSize: '11px',
                            lineHeight: '1.65',
                            fontFamily: "'JetBrains Mono', ui-monospace, monospace",
                          }}
                        >
                          {fileContent}
                        </SyntaxHighlighter>
                      ) : (
                        <div className="text-dark-500 italic p-2 select-none">Fichier vide ou illisible.</div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-center p-8 space-y-4 select-none animate-fadeIn">
                    <div className="h-12 w-12 rounded-md bg-dark-900/60 flex items-center justify-center border border-dark-800 shadow-lg shadow-black/10 text-zinc-400">
                      <FileText className="h-6 w-6" />
                    </div>
                    <div className="space-y-1.5 max-w-sm">
                      <h4 className="text-sm font-bold text-white uppercase tracking-wider">Visualiseur de code source</h4>
                      <p className="text-xs text-dark-400 leading-relaxed">
                        Sélectionnez n'importe quel fichier sur l'arborescence de gauche (manuels Markdown, Table des Matières JSON, ou fichiers de logs) pour inspecter son code brut.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* Empty State when no courses generated yet */
            <div className="flex flex-col items-center justify-center border border-dashed border-dark-850 rounded-2xl bg-dark-900/20 py-24 px-6 text-center max-w-md mx-auto mt-16 shadow-lg select-none">
              <FileCode className="h-12 w-12 text-dark-500 mb-4 animate-pulse" />
              <h3 className="text-base font-bold text-white mb-1.5">Aucun espace de travail disponible</h3>
              <p className="text-xs text-dark-400 leading-relaxed mb-6">
                Vous n'avez pas encore généré de manuels d'étude. Créez un premier cours depuis le tableau de bord pour pouvoir explorer ses fichiers RAW.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default FileExplorerPage;
