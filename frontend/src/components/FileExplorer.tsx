import React, { useState, useEffect } from 'react';
import { Folder, FolderOpen, FileCode, FileText, ChevronRight, ChevronDown, Copy, Check, Loader2, RefreshCw } from 'lucide-react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';

interface FileNode {
  name: string;
  path: string;
  is_dir: boolean;
  size?: number;
  children?: FileNode[];
}

interface FileExplorerProps {
  courseId: string;
}

export const FileExplorer: React.FC<FileExplorerProps> = ({ courseId }) => {
  const [filesTree, setFilesTree] = useState<FileNode[]>([]);
  const [expandedDirs, setExpandedDirs] = useState<Record<string, boolean>>({});
  const [selectedFilePath, setSelectedFilePath] = useState<string | null>(null);
  const [fileContent, setFileContent] = useState<string | null>(null);
  const [loadingTree, setLoadingTree] = useState(false);
  const [loadingFile, setLoadingFile] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchFilesTree = async () => {
    setLoadingTree(true);
    setError(null);
    try {
      const res = await fetch(`/api/courses/${courseId}/files`);
      if (!res.ok) {
        throw new Error("Impossible de charger la liste des fichiers.");
      }
      const data = await res.json();
      setFilesTree(data);
      
      // Auto-expand first level modules
      const initialExpanded: Record<string, boolean> = {};
      data.forEach((node: FileNode) => {
        if (node.is_dir) {
          initialExpanded[node.path] = true;
        }
      });
      setExpandedDirs(initialExpanded);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Une erreur est survenue.");
    } finally {
      setLoadingTree(false);
    }
  };

  useEffect(() => {
    fetchFilesTree();
  }, [courseId]);

  const toggleDirectory = (path: string) => {
    setExpandedDirs(prev => ({
      ...prev,
      [path]: !prev[path]
    }));
  };

  const handleFileClick = async (path: string) => {
    setSelectedFilePath(path);
    setLoadingFile(true);
    setFileContent(null);
    setCopied(false);
    try {
      const res = await fetch(`/api/courses/${courseId}/content/${encodeURIComponent(path)}`);
      if (!res.ok) {
        throw new Error("Impossible de charger le contenu du fichier.");
      }
      const data = await res.json();
      setFileContent(data.content);
    } catch (err: any) {
      console.error(err);
      setFileContent(`Erreur : ${err.message || "Impossible de charger le fichier."}`);
    } finally {
      setLoadingFile(false);
    }
  };

  const handleCopy = async () => {
    if (!fileContent) return;
    try {
      await navigator.clipboard.writeText(fileContent);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy: ', err);
    }
  };

  const getLanguage = (filename: string) => {
    if (filename.endsWith('.json')) return 'json';
    if (filename.endsWith('.md')) return 'markdown';
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
              className="w-full flex items-center gap-1.5 py-1.5 text-xs text-dark-300 hover:text-white hover:bg-dark-900/40 rounded transition-all text-left"
            >
              {isExpanded ? (
                <ChevronDown className="h-3.5 w-3.5 text-dark-400 shrink-0" />
              ) : (
                <ChevronRight className="h-3.5 w-3.5 text-dark-400 shrink-0" />
              )}
              {isExpanded ? (
                <FolderOpen className="h-4 w-4 text-brand-400 shrink-0" />
              ) : (
                <Folder className="h-4 w-4 text-brand-500 shrink-0" />
              )}
              <span className="truncate font-medium">{node.name}</span>
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
        return (
          <button
            key={node.path}
            onClick={() => handleFileClick(node.path)}
            style={{ paddingLeft: `${depth * 12 + 22}px` }}
            className={`w-full flex items-center justify-between py-1.5 pr-2 text-xs rounded transition-all text-left ${
              isSelected
                ? 'bg-brand-500/10 text-white border-l-2 border-brand-500 font-semibold pl-[20px]'
                : 'text-dark-400 hover:text-dark-200 hover:bg-dark-900/20'
            }`}
          >
            <div className="flex items-center gap-1.5 truncate">
              {isJson ? (
                <FileCode className="h-3.5 w-3.5 text-indigo-400 shrink-0" />
              ) : (
                <FileText className="h-3.5 w-3.5 text-sky-400 shrink-0" />
              )}
              <span className="truncate">{node.name}</span>
            </div>
            <span className="text-[9px] text-dark-500 font-mono shrink-0 select-none">
              {formatSize(node.size)}
            </span>
          </button>
        );
      }
    });
  };

  return (
    <div className="flex border border-dark-800 bg-dark-950/20 rounded-2xl overflow-hidden h-[65vh] shadow-xl backdrop-blur-md">
      {/* File Tree Sidebar */}
      <div className="w-1/3 border-r border-dark-800 flex flex-col bg-dark-950/40 select-none">
        <div className="flex items-center justify-between px-4 py-3 border-b border-dark-850">
          <span className="text-[10px] font-bold text-white uppercase tracking-wider">Arborescence physique</span>
          <button 
            onClick={fetchFilesTree}
            disabled={loadingTree}
            className="text-dark-400 hover:text-white p-1 hover:bg-dark-900 rounded transition-all"
            title="Rafraîchir"
          >
            <RefreshCw className={`h-3 w-3 ${loadingTree ? 'animate-spin' : ''}`} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-0.5 custom-scrollbar">
          {loadingTree && filesTree.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 space-y-2 text-dark-500 text-xs">
              <Loader2 className="h-4 w-4 animate-spin text-brand-500" />
              <span>Indexation en cours...</span>
            </div>
          ) : error ? (
            <div className="p-3 text-[11px] text-rose-400 text-center">
              {error}
            </div>
          ) : (
            renderTree(filesTree)
          )}
        </div>
      </div>

      {/* Raw Content Viewer */}
      <div className="w-2/3 flex flex-col bg-dark-950/20">
        {selectedFilePath ? (
          <div className="flex flex-col h-full overflow-hidden">
            {/* File Info Bar */}
            <div className="flex items-center justify-between px-5 py-3 border-b border-dark-850 bg-dark-950/40 font-mono text-[10px] text-dark-400 shrink-0">
              <span className="truncate text-white font-medium">{selectedFilePath}</span>
              <div className="flex items-center gap-3">
                <span className="text-[9px] uppercase font-bold text-brand-500 select-none bg-dark-900/60 border border-dark-800 px-1.5 py-0.5 rounded">
                  {getLanguage(selectedFilePath)}
                </span>
                <button
                  onClick={handleCopy}
                  disabled={!fileContent}
                  className="flex items-center gap-1 hover:text-white transition-colors bg-dark-900 hover:bg-dark-850 border border-dark-800 px-2 py-1 rounded text-xs select-none"
                >
                  {copied ? (
                    <>
                      <Check className="h-3 w-3 text-emerald-500" />
                      <span>Copié</span>
                    </>
                  ) : (
                    <>
                      <Copy className="h-3 w-3" />
                      <span>Copier</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Code Body */}
            <div className="flex-1 overflow-auto bg-dark-950 p-4 font-mono text-xs select-text">
              {loadingFile ? (
                <div className="flex flex-col items-center justify-center h-full space-y-2 text-dark-500">
                  <Loader2 className="h-6 w-6 animate-spin text-brand-500" />
                  <span>Chargement du fichier...</span>
                </div>
              ) : fileContent !== null ? (
                <SyntaxHighlighter
                  style={vscDarkPlus as any}
                  language={getLanguage(selectedFilePath)}
                  PreTag="div"
                  customStyle={{
                    margin: 0,
                    padding: 0,
                    background: 'transparent',
                    fontSize: '11px',
                    lineHeight: '1.6',
                    fontFamily: "'JetBrains Mono', ui-monospace, monospace",
                  }}
                >
                  {fileContent}
                </SyntaxHighlighter>
              ) : (
                <div className="text-dark-500 italic">Aucun contenu disponible.</div>
              )}
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-center p-6 space-y-3 select-none">
            <div className="h-10 w-10 rounded-full bg-dark-900 flex items-center justify-center border border-dark-800">
              <FileText className="h-5 w-5 text-dark-500" />
            </div>
            <div className="space-y-1">
              <h4 className="text-xs font-bold text-white uppercase tracking-wider">Visualiseur Brut</h4>
              <p className="text-[10px] text-dark-400 max-w-xs leading-relaxed">
                Sélectionnez un fichier dans l'arborescence physique pour afficher son code source brut avec coloration syntaxique.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default FileExplorer;
