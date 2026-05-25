import React, { useState, useEffect, useRef } from 'react';
import { X, Sparkles, Loader2, CheckCircle2, AlertTriangle, BookOpen, ChevronRight, Layers, Settings, Info, GraduationCap, ChevronDown, RefreshCw } from 'lucide-react';
import { useToast } from './ToastProvider';

interface GenerateCourseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (courseId: string) => void;
  reconnectJobId?: string | null;
  preloadedCourseId?: string | null;
  initialGenMode?: 'quick' | 'custom' | 'documents';
}

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

interface JobStatus {
  job_id: string;
  status: 'pending' | 'generating' | 'completed' | 'failed' | 'starting' | 'generating_toc' | 'generating_modules';
  progress: number;
  current_task: string;
  course_id?: string;
  error?: string;
  logs?: string[];
  total_expected_requests?: number;
  completed_requests?: number;
  current_submodule_index?: number;
  toc?: TOC;
  subject?: string;
}

interface LLMProfile {
  id: string;
  name: string;
  type: string;
  is_active: boolean;
}

export const GenerateCourseModal: React.FC<GenerateCourseModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  reconnectJobId,
  preloadedCourseId,
  initialGenMode,
}) => {
  const { addToast } = useToast();

  const [genMode, setGenMode] = useState<'quick' | 'custom' | 'documents'>('quick');
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadingDocs, setUploadingDocs] = useState(false);
  const [subject, setSubject] = useState('');
  const [includeExercises, setIncludeExercises] = useState(true);
  const [state, setState] = useState<'idle' | 'planning_toc' | 'toc_planned' | 'submitting' | 'generating' | 'completed' | 'error'>('idle');
  
  // Custom Mode states
  const [customInstructions, setCustomInstructions] = useState('');
  const [tocMarkdown, setTocMarkdown] = useState('');
  const [selectedLevel, setSelectedLevel] = useState<string>('débutant');

  // Dynamic categories state
  interface LevelCategory {
    id: string;
    name: string;
    description: string;
    directive: string;
  }
  const [levelCategories, setLevelCategories] = useState<LevelCategory[]>([]);

  // System Prompt Templates states
  interface SystemPromptTemplate {
    id: string;
    name: string;
    description: string;
  }
  const [systemPromptTemplates, setSystemPromptTemplates] = useState<SystemPromptTemplate[]>([]);
  const [selectedSystemPromptId, setSelectedSystemPromptId] = useState<string>('');

  // Fetch dynamic level categories & system prompt templates on mount/open
  useEffect(() => {
    const fetchLevelCategories = async () => {
      try {
        const res = await fetch('/api/settings/prompt-categories');
        if (res.ok) {
          const data = await res.json();
          const list = Object.entries(data).map(([id, cat]: [string, any]) => ({
            id,
            name: cat.name,
            description: cat.description,
            directive: cat.directive,
          }));
          setLevelCategories(list);
          if (list.length > 0) {
            setSelectedLevel(list[0].id);
          }
        }
      } catch (err) {
        console.error('Error fetching dynamic prompt categories in modal:', err);
      }
    };

    const fetchSystemPromptTemplates = async () => {
      try {
        const res = await fetch('/api/settings/system-prompts');
        if (res.ok) {
          const data = await res.json();
          const list = Object.entries(data).map(([id, tpl]: [string, any]) => ({
            id,
            name: tpl.name,
            description: tpl.description,
          }));
          setSystemPromptTemplates(list);
          if (list.length > 0) {
            setSelectedSystemPromptId(list[0].id);
          }
        }
      } catch (err) {
        console.error('Error fetching system prompt templates in modal:', err);
      }
    };

    if (isOpen) {
      fetchLevelCategories();
      fetchSystemPromptTemplates();
    }
  }, [isOpen]);

  // Dynamic model selections
  const [profiles, setProfiles] = useState<LLMProfile[]>([]);
  const [selectedProfileId, setSelectedProfileId] = useState('');
  const [selectedModel, setSelectedModel] = useState('gemini-flash-latest');
  const [availableModels, setAvailableModels] = useState<string[]>([]);
  const [loadingModels, setLoadingModels] = useState(false);
  const [isCustomModel, setIsCustomModel] = useState(false);
  const [activeJobId, setActiveJobId] = useState<string | null>(null);

  // Custom dropdown open states (ShadCN style)
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);
  const [isModelDropdownOpen, setIsModelDropdownOpen] = useState(false);
  const [isLevelDropdownOpen, setIsLevelDropdownOpen] = useState(false);
  const [isPromptDropdownOpen, setIsPromptDropdownOpen] = useState(false);

  // SSE tracking states
  const [progress, setProgress] = useState(0);
  const [currentTask, setCurrentTask] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [generatedCourseId, setGeneratedCourseId] = useState<string | null>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const [totalExpectedRequests, setTotalExpectedRequests] = useState(0);
  const [completedRequests, setCompletedRequests] = useState(0);
  const [showLogs, setShowLogs] = useState(false);
  const [jobTOC, setJobTOC] = useState<TOC | null>(null);
  const [currentSubmoduleIndex, setCurrentSubmoduleIndex] = useState(-1);

  // Time remaining estimation states
  const [timeLeftStr, setTimeLeftStr] = useState<string | null>(null);
  const lastCompletedRequestsRef = useRef<number>(0);
  const lastTimeRef = useRef<number | null>(null);
  const requestDurationsRef = useRef<number[]>([]);

  const eventSourceRef = useRef<EventSource | null>(null);
  const consoleEndRef = useRef<HTMLDivElement | null>(null);
  const hasFinishedRef = useRef<boolean>(false);

  // Load profiles from settings
  useEffect(() => {
    const fetchProfiles = async () => {
      try {
        const res = await fetch('/api/settings');
        if (res.ok) {
          const data = await res.json();
          setProfiles(data.profiles || []);
          const active = data.profiles.find((p: any) => p.is_active);
          if (active) {
            setSelectedProfileId(active.id);
            // Default model values based on active provider
            if (active.type === 'gemini') setSelectedModel('gemini-flash-latest');
            else if (active.type === 'openrouter') setSelectedModel('nousresearch/hermes-3-llama-3.1-405b:free');
            else if (active.type === 'openai') setSelectedModel('gpt-4o-mini');
            else if (active.type === 'ollama') setSelectedModel('llama3');
            else if (active.type === 'aws_bedrock') setSelectedModel('amazon.nova-pro-v1:0');
          }
        }
      } catch (err) {
        console.error('Error fetching settings for modal:', err);
      }
    };
    fetchProfiles();
  }, [isOpen]);

  // Load models dynamically when profile changes
  useEffect(() => {
    const fetchModels = async () => {
      if (!selectedProfileId) return;
      setLoadingModels(true);
      setIsCustomModel(false);
      try {
        const res = await fetch(`/api/settings/profile/${selectedProfileId}/models`);
        if (res.ok) {
          const data = await res.json();
          const modelsList = data.models || [];
          setAvailableModels(modelsList);
          
          if (modelsList.length > 0) {
            const currentProf = profiles.find(p => p.id === selectedProfileId);
            let defaultModel = modelsList[0];
            if (currentProf) {
              if (currentProf.type === 'gemini' && modelsList.includes('gemini-flash-latest')) defaultModel = 'gemini-flash-latest';
              else if (currentProf.type === 'openrouter' && modelsList.includes('nousresearch/hermes-3-llama-3.1-405b:free')) defaultModel = 'nousresearch/hermes-3-llama-3.1-405b:free';
              else if (currentProf.type === 'openai' && modelsList.includes('gpt-4o-mini')) defaultModel = 'gpt-4o-mini';
              else if (currentProf.type === 'ollama' && modelsList.includes('llama3')) defaultModel = 'llama3';
              else if (currentProf.type === 'aws_bedrock' && modelsList.includes('amazon.nova-pro-v1:0')) defaultModel = 'amazon.nova-pro-v1:0';
            }
            setSelectedModel(defaultModel);
          }
        }
      } catch (err) {
        console.error('Error fetching models for selected profile:', err);
      } finally {
        setLoadingModels(false);
      }
    };
    fetchModels();
  }, [selectedProfileId, profiles]);

  // Reconnect handling
  useEffect(() => {
    if (reconnectJobId) {
      setState('generating');
      hasFinishedRef.current = false;
      startProgressStream(reconnectJobId);
    }
  }, [reconnectJobId]);

  // Synchronize initial mode when modal is opened
  useEffect(() => {
    if (isOpen) {
      setGenMode(initialGenMode || 'quick');
      setUploadedFiles([]);
    }
  }, [isOpen, initialGenMode]);

  // Preloaded course plan structure handling
  useEffect(() => {
    if (isOpen && preloadedCourseId) {
      const fetchPreloadedTOC = async () => {
        try {
          const res = await fetch(`/api/courses/${preloadedCourseId}/toc`);
          if (res.ok) {
            const toc = await res.json();
            setSubject(toc.title || '');
            
            // Convert to Markdown
            const lines: string[] = [];
            lines.push(`# Nom du Cours : ${toc.title || ''}`);
            if (toc.description) {
              lines.push(`${toc.description}\n`);
            }
            (toc.modules || []).forEach((m: any) => {
              lines.push(`- Module : ${m.title || ''}`);
              (m.submodules || []).forEach((sm: any) => {
                lines.push(`  - ${sm.title || ''}`);
              });
            });
            setTocMarkdown(lines.join('\n'));
            
            // Set level & other specs if stored in TOC
            if (toc.level) setSelectedLevel(toc.level);
            if (toc.custom_instructions) setCustomInstructions(toc.custom_instructions);
            if (toc.profile_id) setSelectedProfileId(toc.profile_id);
            if (toc.model) setSelectedModel(toc.model);
            
            // Set mode to custom so they see the editor
            setGenMode('custom');
            setState('idle');
          }
        } catch (err) {
          console.error('Error preloading TOC:', err);
        }
      };
      fetchPreloadedTOC();
    }
  }, [isOpen, preloadedCourseId]);

  // Auto-scroll logs terminal
  useEffect(() => {
    if (showLogs && consoleEndRef.current) {
      consoleEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs, showLogs]);

  // Cleanup SSE on unmount
  useEffect(() => {
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
    };
  }, []);

  const handleProfileChange = (profileId: string) => {
    setSelectedProfileId(profileId);
  };

  // Generate TOC only (Custom Mode Step 1)
  const handleGenerateTOC = async () => {
    if (!subject.trim()) return;
    setState('planning_toc');
    setErrorMessage('');
    
    try {
      const response = await fetch('/api/generate/toc', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sujet: subject.trim(),
          profile_id: selectedProfileId,
          model: selectedModel
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Erreur lors de la génération de la structure.');
      }

      const data = await response.json();
      setTocMarkdown(data.toc_markdown);
      setState('toc_planned');
    } catch (err: any) {
      console.error(err);
      setState('idle');
      alert(err.message || 'Impossible de planifier le cours.');
    }
  };

  const handleUploadDocsAndGeneratePlan = async () => {
    if (uploadedFiles.length === 0) return;
    
    setUploadingDocs(true);
    setState('planning_toc');
    
    try {
      const formData = new FormData();
      uploadedFiles.forEach(file => {
        formData.append('files', file);
      });
      if (selectedProfileId) {
        formData.append('profile_id', selectedProfileId);
      }
      if (selectedModel) {
        formData.append('model', selectedModel);
      }
      
      const res = await fetch('/api/upload-docs', {
        method: 'POST',
        body: formData,
      });
      
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.detail || "Échec de l'analyse des documents");
      }
      
      const data = await res.json();
      
      // Load generated TOC into markdown editor and set subject
      setTocMarkdown(data.toc_markdown);
      setSubject(data.toc_json.title);
      
      // Transition to Custom Mode so they can edit it in wide screen!
      setGenMode('custom');
      setState('idle');
      addToast({
        title: "Plan généré",
        description: "Plan de révision généré à partir de vos documents avec succès ! Vous pouvez maintenant le modifier ou lancer la génération complète.",
        type: 'success'
      });
    } catch (err: any) {
      console.error(err);
      addToast({
        title: "Erreur lors de l'analyse",
        description: err.message || "Impossible d'analyser vos documents.",
        type: 'error'
      });
      setState('idle');
    } finally {
      setUploadingDocs(false);
    }
  };

  // Launch course generation (Quick Mode & Custom Mode Step 2)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim() && !tocMarkdown.trim()) return;

    setState('submitting');
    setErrorMessage('');
    setProgress(0);
    setCurrentTask('Initialisation de la génération...');
    requestDurationsRef.current = [];
    lastTimeRef.current = Date.now();
    lastCompletedRequestsRef.current = 0;
    setTimeLeftStr(null);
    hasFinishedRef.current = false;

    const payload = {
      sujet: subject.trim(),
      avec_exercices: includeExercises,
      profile_id: selectedProfileId,
      model: selectedModel,
      custom_toc_markdown: genMode === 'custom' ? tocMarkdown : null,
      custom_instructions: genMode === 'custom' ? customInstructions : null,
      level: selectedLevel,
      system_prompt_id: selectedSystemPromptId
    };

    try {
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Erreur lors du lancement de la génération.');
      }

      const data = await response.json();
      startProgressStream(data.job_id);
    } catch (err: any) {
      console.error(err);
      setState('error');
      setErrorMessage(err.message || 'Une erreur inattendue est survenue.');
    }
  };

  const startProgressStream = (jobId: string) => {
    setState('generating');
    setActiveJobId(jobId);
    
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    const eventSource = new EventSource(`/api/generate/status/${jobId}/stream`);
    eventSourceRef.current = eventSource;

    eventSource.onmessage = (event) => {
      try {
        const job: JobStatus = JSON.parse(event.data);
        setProgress(job.progress);
        setCurrentTask(job.current_task);
        
        if (job.logs) setLogs(job.logs);
        if (job.toc) setJobTOC(job.toc);
        if (job.current_submodule_index !== undefined) {
          setCurrentSubmoduleIndex(job.current_submodule_index);
        }
        if (job.total_expected_requests !== undefined) {
          setTotalExpectedRequests(job.total_expected_requests);
        }
        
        if (job.completed_requests !== undefined) {
          const prevCompleted = lastCompletedRequestsRef.current;
          setCompletedRequests(job.completed_requests);
          
          if (job.completed_requests > prevCompleted) {
            const now = Date.now();
            if (lastTimeRef.current !== null) {
              const elapsed = (now - lastTimeRef.current) / 1000; // seconds
              requestDurationsRef.current.push(elapsed);
              
              // Calculate average duration
              const avg = requestDurationsRef.current.reduce((a, b) => a + b, 0) / requestDurationsRef.current.length;
              
              // Estimate remaining time
              const remainingRequests = (job.total_expected_requests || 0) - job.completed_requests;
              if (remainingRequests > 0) {
                const totalSecondsLeft = Math.round(avg * remainingRequests);
                const minutes = Math.floor(totalSecondsLeft / 60);
                const seconds = totalSecondsLeft % 60;
                setTimeLeftStr(`${minutes} min ${seconds} s`);
              } else {
                setTimeLeftStr('Finition...');
              }
            }
            lastTimeRef.current = now;
            lastCompletedRequestsRef.current = job.completed_requests;
          }
        }

        if (job.status === 'completed') {
          setState('completed');
          if (job.course_id) {
            setGeneratedCourseId(job.course_id);
            
            // Trigger toast notification if modal is closed / minimized
            if (!hasFinishedRef.current) {
              hasFinishedRef.current = true;
              addToast({
                title: 'Votre cours est prêt !',
                description: `Le manuel académique complet sur "${jobTOC?.title || job.subject || 'votre sujet'}" a été généré avec succès en arrière-plan.`,
                type: 'success',
                courseId: job.course_id
              });
            }
          }
          eventSource.close();
        } else if (job.status === 'failed') {
          setState('error');
          setErrorMessage(job.error || 'La génération a échoué.');
          eventSource.close();
        }
      } catch (err) {
        console.error('Error parsing SSE data:', err);
      }
    };

    eventSource.onerror = (err) => {
      console.error('SSE connection error:', err);
    };
  };

  const handleFinish = () => {
    if (generatedCourseId) {
      onSuccess(generatedCourseId);
    }
    handleClose();
  };

  const handleClose = () => {
    setSubject('');
    setIncludeExercises(true);
    setCustomInstructions('');
    setTocMarkdown('');
    setJobTOC(null);
    setCurrentSubmoduleIndex(-1);
    setState('idle');
    setProgress(0);
    setCurrentTask('');
    setErrorMessage('');
    setGeneratedCourseId(null);
    setLogs([]);
    setTotalExpectedRequests(0);
    setCompletedRequests(0);
    setShowLogs(false);
    setTimeLeftStr(null);
    setActiveJobId(null);
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    onClose();
  };

  const renderLogLine = (log: string, idx: number) => {
    let colorClass = 'text-dark-300';
    let label = '';
    let content = log;

    // Detect tags in logs
    if (log.includes('[DÉMARRAGE]')) {
      colorClass = 'text-blue-400 font-semibold';
      label = 'START';
      content = log.substring(log.indexOf('[DÉMARRAGE]') + 11);
    } else if (log.includes('[CONFIG]')) {
      colorClass = 'text-indigo-400';
      label = 'CONFIG';
      content = log.substring(log.indexOf('[CONFIG]') + 8);
    } else if (log.includes('[REQUÊTE]')) {
      colorClass = 'text-amber-400/90';
      label = 'CALL';
      content = log.substring(log.indexOf('[REQUÊTE]') + 9);
    } else if (log.includes('[SUCCÈS]')) {
      colorClass = 'text-emerald-400';
      label = 'OK';
      content = log.substring(log.indexOf('[SUCCÈS]') + 8);
    } else if (log.includes('[ERREUR FATALE]')) {
      colorClass = 'text-rose-500 font-bold';
      label = 'FATAL';
      content = log.substring(log.indexOf('[ERREUR FATALE]') + 15);
    } else if (log.includes('[ERREUR]')) {
      colorClass = 'text-rose-400';
      label = 'FAIL';
      content = log.substring(log.indexOf('[ERREUR]') + 8);
    } else if (log.includes('[INTERRUPTION]')) {
      colorClass = 'text-amber-500 font-semibold';
      label = 'WARN';
      content = log.substring(log.indexOf('[INTERRUPTION]') + 14);
    }

    return (
      <div key={idx} className="flex items-start gap-2 py-0.5 leading-relaxed font-mono">
        {label && (
          <span className={`inline-block px-1.5 py-0.5 rounded text-[8px] font-bold select-none shrink-0 tracking-wider bg-dark-900 border border-dark-800 ${colorClass}`}>
            {label}
          </span>
        )}
        <span className={colorClass}>{content.trim()}</span>
      </div>
    );
  };

  // Build list of all submodules for complex progress check
  const getSubmodulesList = (tocObj: TOC | null) => {
    if (!tocObj) return [];
    return tocObj.modules.flatMap(m => m.submodules);
  };
  const flatSubmodules = getSubmodulesList(jobTOC);

  const isWide = genMode === 'custom';

  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center p-4 transition-all duration-300 ${
      isOpen ? 'opacity-100 pointer-events-auto scale-100' : 'opacity-0 pointer-events-none scale-95 select-none'
    }`}>
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-dark-950/80 backdrop-blur-md"
        onClick={state === 'generating' || state === 'submitting' || state === 'planning_toc' ? undefined : handleClose}
      />

      {/* Modal Card */}
      <div className="relative w-[92vw] max-w-[92vw] h-[90vh] max-h-[90vh] overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900 shadow-2xl transition-all duration-300 transform flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-zinc-900 shrink-0">
          <div className="flex items-center gap-2 animate-fadeIn">
            <Sparkles className="h-4 w-4 text-white animate-pulse" />
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">
              Conception du Cours Académique
            </h3>
          </div>
          {state !== 'generating' && state !== 'submitting' && state !== 'planning_toc' && (
            <button
              onClick={handleClose}
              className="rounded p-1 text-dark-400 hover:bg-dark-800 hover:text-white transition-all select-none"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 min-h-0">
          {/* A. Idle state (Quick Mode Only) */}
          {state === 'idle' && genMode === 'quick' && (
            <div className="space-y-6 animate-fadeIn">
              {/* Quick vs Custom vs Documents Tab Selector */}
              <div className="flex border-b border-zinc-900/60 gap-4 shrink-0">
                <button
                  type="button"
                  onClick={() => setGenMode('quick')}
                  className={`pb-2.5 text-xs font-semibold uppercase tracking-wider relative transition-colors ${
                    (genMode as string) === 'quick' ? 'text-white' : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  Mode Rapide (Quick)
                  {(genMode as string) === 'quick' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-zinc-500 rounded-full" />}
                </button>
                <button
                  type="button"
                  onClick={() => setGenMode('custom')}
                  className={`pb-2.5 text-xs font-semibold uppercase tracking-wider relative transition-colors ${
                    (genMode as string) === 'custom' ? 'text-white' : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  Personnalisé (Custom)
                  {(genMode as string) === 'custom' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-zinc-500 rounded-full" />}
                </button>
                <button
                  type="button"
                  onClick={() => setGenMode('documents')}
                  className={`pb-2.5 text-xs font-semibold uppercase tracking-wider relative transition-colors ${
                    (genMode as string) === 'documents' ? 'text-white' : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  Depuis Documents
                  {(genMode as string) === 'documents' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-zinc-500 rounded-full" />}
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
                {/* Profile selection & model runtime override */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                      <Layers className="h-3.5 w-3.5 text-zinc-400" />
                      Clé d'API / Profil
                    </label>
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => setIsProfileDropdownOpen(!isProfileDropdownOpen)}
                        className="w-full h-10 flex items-center justify-between rounded-xl border border-zinc-800 bg-zinc-900/50 px-3.5 text-xs text-zinc-200 hover:text-white hover:bg-zinc-800/80 transition-all font-sans cursor-pointer shadow-sm select-none"
                      >
                        <span className="truncate">
                          {profiles.find(p => p.id === selectedProfileId)?.name 
                            ? `${profiles.find(p => p.id === selectedProfileId)?.name} (${profiles.find(p => p.id === selectedProfileId)?.type})`
                            : "Aucun profil (par défaut)"}
                        </span>
                        <ChevronDown className={`h-3.5 w-3.5 text-dark-400 transition-transform duration-200 ${isProfileDropdownOpen ? 'rotate-180' : ''}`} />
                      </button>

                      {isProfileDropdownOpen && (
                        <>
                          <div className="fixed inset-0 z-20" onClick={() => setIsProfileDropdownOpen(false)} />
                          <div className="absolute left-0 right-0 mt-1.5 rounded-xl border border-zinc-800 bg-zinc-900 p-1 shadow-2xl z-30 animate-in fade-in duration-150 max-h-60 overflow-y-auto custom-scrollbar">
                            {profiles.map((p) => (
                              <button
                                key={p.id}
                                type="button"
                                onClick={() => {
                                  handleProfileChange(p.id);
                                  setIsProfileDropdownOpen(false);
                                }}
                                className={`w-full px-3 py-2 text-left text-xs transition-all font-sans truncate cursor-pointer rounded-lg hover:bg-zinc-850 hover:text-white ${
                                  selectedProfileId === p.id ? 'bg-zinc-800/60 text-white font-semibold' : 'text-zinc-300'
                                }`}
                              >
                                {p.name} ({p.type})
                              </button>
                            ))}
                            {profiles.length === 0 && (
                              <button
                                type="button"
                                onClick={() => {
                                  handleProfileChange('');
                                  setIsProfileDropdownOpen(false);
                                }}
                                className="w-full px-3 py-2 text-left text-xs transition-all font-sans truncate cursor-pointer rounded-lg hover:bg-zinc-850 hover:text-white text-zinc-300 bg-zinc-800/60 font-semibold"
                              >
                                Aucun profil (par défaut)
                              </button>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                      <Settings className="h-3.5 w-3.5 text-zinc-400" />
                      Modèle IA
                    </label>
                    {loadingModels ? (
                      <div className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3.5 py-2.5 text-xs text-dark-400 flex items-center gap-1.5 font-sans">
                        <Loader2 className="h-3.5 w-3.5 animate-spin text-zinc-500" />
                        Chargement des modèles...
                      </div>
                    ) : (
                      <div className="relative">
                        <button
                          type="button"
                          onClick={() => setIsModelDropdownOpen(!isModelDropdownOpen)}
                          className="w-full h-10 flex items-center justify-between rounded-xl border border-zinc-800 bg-zinc-900/50 px-3.5 text-xs text-zinc-200 hover:text-white hover:bg-zinc-800/80 transition-all font-sans cursor-pointer shadow-sm select-none"
                        >
                          <span className="truncate">
                            {isCustomModel ? `Autre modèle: ${selectedModel || '(saisir)'}` : selectedModel || 'Sélectionner un modèle'}
                          </span>
                          <ChevronDown className={`h-3.5 w-3.5 text-dark-400 transition-transform duration-200 ${isModelDropdownOpen ? 'rotate-180' : ''}`} />
                        </button>

                        {isModelDropdownOpen && (
                          <>
                            <div className="fixed inset-0 z-20" onClick={() => setIsModelDropdownOpen(false)} />
                            <div className="absolute left-0 right-0 mt-1.5 rounded-xl border border-zinc-800 bg-zinc-900 p-1 shadow-2xl z-30 animate-in fade-in duration-150 max-h-60 overflow-y-auto custom-scrollbar">
                              {availableModels.map((m) => (
                                <button
                                  key={m}
                                  type="button"
                                  onClick={() => {
                                    setIsCustomModel(false);
                                    setSelectedModel(m);
                                    setIsModelDropdownOpen(false);
                                  }}
                                  className={`w-full px-3 py-2 text-left text-xs transition-all font-sans truncate cursor-pointer rounded-lg hover:bg-zinc-850 hover:text-white ${
                                    !isCustomModel && selectedModel === m ? 'bg-zinc-800/60 text-white font-semibold' : 'text-zinc-300'
                                  }`}
                                >
                                  {m}
                                </button>
                              ))}
                              <button
                                type="button"
                                onClick={() => {
                                  setIsCustomModel(true);
                                  setSelectedModel('');
                                  setIsModelDropdownOpen(false);
                                }}
                                className={`w-full px-3 py-2 text-left text-xs transition-all font-sans truncate cursor-pointer rounded-lg hover:bg-zinc-850 hover:text-white ${
                                  isCustomModel ? 'bg-zinc-800/60 text-white font-semibold' : 'text-zinc-350'
                                }`}
                              >
                                Autre modèle (Saisie libre)...
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {isCustomModel && (
                  <div className="space-y-1.5 animate-slideDown">
                    <label className="text-[9px] font-bold text-dark-300 uppercase tracking-wider">
                      Identifiant du modèle personnalisé
                    </label>
                    <input
                      type="text"
                      value={selectedModel}
                      onChange={(e) => setSelectedModel(e.target.value)}
                      placeholder="Ex: gemini-1.5-pro-exp-0827, ft:gpt-4o-mini:..."
                      className="w-full rounded-xl border border-zinc-800 bg-zinc-900/40 px-3.5 py-2 text-xs text-white placeholder-dark-505 focus:border-zinc-700/80 focus:outline-none font-mono transition-all"
                      required
                    />
                  </div>
                )}

                {/* Subject */}
                <div className="space-y-1.5">
                  <label htmlFor="subject" className="text-[10px] font-bold text-white uppercase tracking-wider">
                    Sujet académique ou technique
                  </label>
                  <input
                    type="text"
                    id="subject"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder="Ex: Architecture de Microservices, Algorithmique en C, CSS Grid & Flexbox..."
                    className="w-full rounded-xl border border-zinc-800 bg-zinc-900/40 px-4 py-2.5 text-xs text-white placeholder-dark-505 focus:border-zinc-700/80 focus:outline-none transition-all font-sans"
                    required
                  />
                </div>

                {/* Level & Personality Stacked Vertically */}
                <div className="flex flex-col gap-4">
                  {/* Level */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                      <GraduationCap className="h-3.5 w-3.5 text-zinc-400" />
                      Niveau d'apprentissage cible
                    </label>
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => setIsLevelDropdownOpen(!isLevelDropdownOpen)}
                        className="w-full h-10 flex items-center justify-between rounded-xl border border-zinc-800 bg-zinc-900/50 px-3.5 text-xs text-zinc-200 hover:text-white hover:bg-zinc-800/80 transition-all font-sans cursor-pointer shadow-sm select-none"
                      >
                        <span className="truncate">
                          {levelCategories.find(cat => cat.id === selectedLevel)?.name 
                            ? `${levelCategories.find(cat => cat.id === selectedLevel)?.name} (${levelCategories.find(cat => cat.id === selectedLevel)?.description || levelCategories.find(cat => cat.id === selectedLevel)?.id})`
                            : selectedLevel === 'débutant'
                            ? 'Débutant (Introduction complète)'
                            : selectedLevel === 'intermédiaire'
                            ? 'Intermédiaire (Consolidation)'
                            : selectedLevel === 'professionnel'
                            ? 'Professionnel (Concepts avancés)'
                            : selectedLevel}
                        </span>
                        <ChevronDown className={`h-3.5 w-3.5 text-dark-400 transition-transform duration-200 ${isLevelDropdownOpen ? 'rotate-180' : ''}`} />
                      </button>

                      {isLevelDropdownOpen && (
                        <>
                          <div className="fixed inset-0 z-20" onClick={() => setIsLevelDropdownOpen(false)} />
                          <div className="absolute left-0 right-0 mt-1.5 rounded-xl border border-zinc-800 bg-zinc-900 p-1 shadow-2xl z-30 animate-in fade-in duration-150 max-h-60 overflow-y-auto custom-scrollbar">
                            {levelCategories.map((cat) => (
                              <button
                                key={cat.id}
                                type="button"
                                onClick={() => {
                                  setSelectedLevel(cat.id);
                                  setIsLevelDropdownOpen(false);
                                }}
                                className={`w-full px-3 py-2 text-left text-xs transition-all font-sans truncate cursor-pointer rounded-lg hover:bg-zinc-850 hover:text-white ${
                                  selectedLevel === cat.id ? 'bg-zinc-800/60 text-white font-semibold' : 'text-zinc-300'
                                }`}
                              >
                                {cat.name} ({cat.description || cat.id})
                              </button>
                            ))}
                            {levelCategories.length === 0 && (
                              <>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSelectedLevel('débutant');
                                    setIsLevelDropdownOpen(false);
                                  }}
                                  className={`w-full px-3 py-2 text-left text-xs transition-all font-sans truncate cursor-pointer rounded-lg hover:bg-zinc-850 hover:text-white ${
                                    selectedLevel === 'débutant' ? 'bg-zinc-800/60 text-white font-semibold' : 'text-zinc-300'
                                  }`}
                                >
                                  Débutant (Introduction complète, analogies simples)
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSelectedLevel('intermédiaire');
                                    setIsLevelDropdownOpen(false);
                                  }}
                                  className={`w-full px-3 py-2 text-left text-xs transition-all font-sans truncate cursor-pointer rounded-lg hover:bg-zinc-850 hover:text-white ${
                                    selectedLevel === 'intermédiaire' ? 'bg-zinc-800/60 text-white font-semibold' : 'text-zinc-300'
                                  }`}
                                >
                                  Intermédiaire (Consolidation, exemples approfondis)
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSelectedLevel('professionnel');
                                    setIsLevelDropdownOpen(false);
                                  }}
                                  className={`w-full px-3 py-2 text-left text-xs transition-all font-sans truncate cursor-pointer rounded-lg hover:bg-zinc-850 hover:text-white ${
                                    selectedLevel === 'professionnel' ? 'bg-zinc-800/60 text-white font-semibold' : 'text-zinc-300'
                                  }`}
                                >
                                  Professionnel (Concepts avancés, orienté expert, sans blabla)
                                </button>
                              </>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Personality Template Selector */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                      <Sparkles className="h-3.5 w-3.5 text-zinc-400" />
                      Gabarit de Personnalité
                    </label>
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => setIsPromptDropdownOpen(!isPromptDropdownOpen)}
                        className="w-full h-10 flex items-center justify-between rounded-xl border border-zinc-800 bg-zinc-900/50 px-3.5 text-xs text-zinc-200 hover:text-white hover:bg-zinc-800/80 transition-all font-sans cursor-pointer shadow-sm select-none"
                      >
                        <span className="truncate">
                          {systemPromptTemplates.find(tpl => tpl.id === selectedSystemPromptId)?.name || "Gabarit standard (Professeur)"}
                        </span>
                        <ChevronDown className={`h-3.5 w-3.5 text-dark-400 transition-transform duration-200 ${isPromptDropdownOpen ? 'rotate-180' : ''}`} />
                      </button>

                      {isPromptDropdownOpen && (
                        <>
                          <div className="fixed inset-0 z-20" onClick={() => setIsPromptDropdownOpen(false)} />
                          <div className="absolute left-0 right-0 mt-1.5 rounded-xl border border-zinc-800 bg-zinc-900 p-1 shadow-2xl z-30 animate-in fade-in duration-150 max-h-60 overflow-y-auto custom-scrollbar">
                            {systemPromptTemplates.map((tpl) => (
                              <button
                                key={tpl.id}
                                type="button"
                                onClick={() => {
                                  setSelectedSystemPromptId(tpl.id);
                                  setIsPromptDropdownOpen(false);
                                }}
                                className={`w-full px-3 py-2 text-left text-xs transition-all font-sans truncate cursor-pointer rounded-lg hover:bg-zinc-855 hover:text-white ${
                                  selectedSystemPromptId === tpl.id ? 'bg-zinc-800/60 text-white font-semibold' : 'text-zinc-300'
                                }`}
                              >
                                {tpl.name}
                              </button>
                            ))}
                            {systemPromptTemplates.length === 0 && (
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedSystemPromptId('');
                                  setIsPromptDropdownOpen(false);
                                }}
                                className="w-full px-3 py-2 text-left text-xs transition-all font-sans truncate cursor-pointer rounded-lg hover:bg-zinc-855 hover:text-white text-zinc-300 bg-zinc-800/60 font-semibold"
                              >
                                Gabarit standard (Professeur)
                              </button>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* include exercises */}
                <div className="flex items-center space-x-3 rounded-xl border border-zinc-800 bg-zinc-900/20 p-3.5">
                  <input
                    type="checkbox"
                    id="includeExercises"
                    checked={includeExercises}
                    onChange={(e) => setIncludeExercises(e.target.checked)}
                    className="h-4 w-4 rounded border-zinc-800 bg-zinc-905 text-zinc-300 focus:ring-zinc-800 focus:ring-offset-dark-950 accent-zinc-300"
                  />
                  <div className="space-y-0.5">
                    <label htmlFor="includeExercises" className="text-xs font-semibold text-white cursor-pointer">
                      Générer des exercices d'évaluation pratiques
                    </label>
                    <p className="text-[10px] text-dark-400">
                      Génère des cahiers d'exercices progressifs et leurs corrections à la fin de chaque sous-chapitre.
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={handleClose}
                    className="rounded-xl border border-zinc-800 bg-zinc-900/80 hover:bg-zinc-800 px-4 py-2 text-xs font-semibold text-zinc-300 transition-all select-none cursor-pointer"
                  >
                    Annuler
                  </button>

                  <button
                    type="submit"
                    className="flex items-center gap-2 rounded-xl bg-zinc-900 border border-zinc-800/80 text-zinc-200 hover:bg-zinc-850 hover:text-white px-5 py-2 text-xs font-semibold transition-all shadow-sm select-none cursor-pointer"
                  >
                    <Sparkles className="h-3.5 w-3.5" />
                    Générer le cours
                  </button>
                </div>
              </form>
            </div>
          )}

          {state === 'idle' && genMode === 'documents' && (
            <div className="space-y-6 animate-fadeIn">
              {/* Tab Selector */}
              <div className="flex border-b border-zinc-900/60 gap-4 shrink-0">
                <button
                  type="button"
                  onClick={() => setGenMode('quick')}
                  className={`pb-2.5 text-xs font-semibold uppercase tracking-wider relative transition-colors ${
                    (genMode as string) === 'quick' ? 'text-white' : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  Mode Rapide (Quick)
                </button>
                <button
                  type="button"
                  onClick={() => setGenMode('custom')}
                  className={`pb-2.5 text-xs font-semibold uppercase tracking-wider relative transition-colors ${
                    (genMode as string) === 'custom' ? 'text-white' : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  Personnalisé (Custom)
                </button>
                <button
                  type="button"
                  onClick={() => setGenMode('documents')}
                  className={`pb-2.5 text-xs font-semibold uppercase tracking-wider relative transition-colors ${
                    (genMode as string) === 'documents' ? 'text-white' : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  Depuis Documents
                  {(genMode as string) === 'documents' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-zinc-500 rounded-full" />}
                </button>
              </div>

              {/* Profile selection & model runtime override */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                    <Layers className="h-3.5 w-3.5 text-zinc-400" />
                    Clé d'API / Profil
                  </label>
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setIsProfileDropdownOpen(!isProfileDropdownOpen)}
                      className="w-full h-10 flex items-center justify-between rounded-xl border border-zinc-800 bg-zinc-900/50 px-3.5 text-xs text-zinc-200 hover:text-white hover:bg-zinc-800/80 transition-all font-sans cursor-pointer shadow-sm select-none"
                    >
                      <span className="truncate">
                        {profiles.find(p => p.id === selectedProfileId)?.name 
                          ? `${profiles.find(p => p.id === selectedProfileId)?.name} (${profiles.find(p => p.id === selectedProfileId)?.type})`
                          : "Aucun profil (par défaut)"}
                      </span>
                      <ChevronDown className={`h-3.5 w-3.5 text-dark-400 transition-transform duration-200 ${isProfileDropdownOpen ? 'rotate-180' : ''}`} />
                    </button>

                    {isProfileDropdownOpen && (
                      <>
                        <div className="fixed inset-0 z-20" onClick={() => setIsProfileDropdownOpen(false)} />
                        <div className="absolute left-0 right-0 mt-1.5 rounded-xl border border-zinc-800 bg-zinc-900 p-1 shadow-2xl z-30 animate-in fade-in duration-150 max-h-60 overflow-y-auto custom-scrollbar">
                          {profiles.map((p) => (
                            <button
                              key={p.id}
                              type="button"
                              onClick={() => {
                                handleProfileChange(p.id);
                                setIsProfileDropdownOpen(false);
                              }}
                              className={`w-full px-3 py-2 text-left text-xs transition-all font-sans truncate cursor-pointer rounded-lg hover:bg-zinc-850 hover:text-white ${
                                selectedProfileId === p.id ? 'bg-zinc-800/60 text-white font-semibold' : 'text-zinc-300'
                              }`}
                            >
                              {p.name} ({p.type})
                            </button>
                          ))}
                          {profiles.length === 0 && (
                            <button
                              type="button"
                              onClick={() => {
                                handleProfileChange('');
                                setIsProfileDropdownOpen(false);
                              }}
                              className="w-full px-3 py-2 text-left text-xs transition-all font-sans truncate cursor-pointer rounded-lg hover:bg-zinc-850 hover:text-white text-zinc-300 bg-zinc-800/60 font-semibold"
                            >
                              Aucun profil (par défaut)
                            </button>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                    <Settings className="h-3.5 w-3.5 text-zinc-400" />
                    Modèle IA
                  </label>
                  {loadingModels ? (
                    <div className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3.5 py-2.5 text-xs text-dark-400 flex items-center gap-1.5 font-sans">
                      <Loader2 className="h-3.5 w-3.5 animate-spin text-zinc-500" />
                      Chargement des modèles...
                    </div>
                  ) : (
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => setIsModelDropdownOpen(!isModelDropdownOpen)}
                        className="w-full h-10 flex items-center justify-between rounded-xl border border-zinc-800 bg-zinc-900/50 px-3.5 text-xs text-zinc-200 hover:text-white hover:bg-zinc-800/80 transition-all font-sans cursor-pointer shadow-sm select-none"
                      >
                        <span className="truncate">
                          {isCustomModel ? `Autre modèle: ${selectedModel || '(saisir)'}` : selectedModel || 'Sélectionner un modèle'}
                        </span>
                        <ChevronDown className={`h-3.5 w-3.5 text-dark-400 transition-transform duration-200 ${isModelDropdownOpen ? 'rotate-180' : ''}`} />
                      </button>

                      {isModelDropdownOpen && (
                        <>
                          <div className="fixed inset-0 z-20" onClick={() => setIsModelDropdownOpen(false)} />
                          <div className="absolute left-0 right-0 mt-1.5 rounded-xl border border-zinc-800 bg-zinc-900 p-1 shadow-2xl z-30 animate-in fade-in duration-150 max-h-60 overflow-y-auto custom-scrollbar">
                            {availableModels.map((m) => (
                              <button
                                key={m}
                                type="button"
                                onClick={() => {
                                  setIsCustomModel(false);
                                  setSelectedModel(m);
                                  setIsModelDropdownOpen(false);
                                }}
                                className={`w-full px-3 py-2 text-left text-xs transition-all font-sans truncate cursor-pointer rounded-lg hover:bg-zinc-850 hover:text-white ${
                                  !isCustomModel && selectedModel === m ? 'bg-zinc-800/60 text-white font-semibold' : 'text-zinc-300'
                                }`}
                              >
                                {m}
                              </button>
                            ))}
                            <button
                              type="button"
                              onClick={() => {
                                setIsCustomModel(true);
                                setSelectedModel('');
                                setIsModelDropdownOpen(false);
                              }}
                              className={`w-full px-3 py-2 text-left text-xs transition-all font-sans truncate cursor-pointer rounded-lg hover:bg-zinc-850 hover:text-white ${
                                isCustomModel ? 'bg-zinc-800/60 text-white font-semibold' : 'text-zinc-350'
                              }`}
                            >
                              Autre modèle (Saisie libre)...
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {isCustomModel && (
                <div className="space-y-1.5 animate-slideDown">
                  <label className="text-[9px] font-bold text-dark-300 uppercase tracking-wider">
                    Identifiant du modèle personnalisé
                  </label>
                  <input
                    type="text"
                    value={selectedModel}
                    onChange={(e) => setSelectedModel(e.target.value)}
                    placeholder="Ex: gemini-1.5-pro..."
                    className="w-full rounded-xl border border-zinc-800 bg-zinc-900/40 px-3.5 py-2 text-xs text-white placeholder-dark-505 focus:border-zinc-700/80 focus:outline-none font-mono transition-all"
                    required
                  />
                </div>
              )}

              {/* Drag and Drop Zone */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-white uppercase tracking-wider">
                  Documents sources pour la révision (.txt, .md, .pdf, .png, .jpg, .jpeg)
                </label>
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsDragging(true);
                  }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setIsDragging(false);
                    if (e.dataTransfer.files) {
                      const filesArray = Array.from(e.dataTransfer.files);
                      setUploadedFiles(prev => [...prev, ...filesArray]);
                    }
                  }}
                  onClick={() => document.getElementById('fileInput')?.click()}
                  className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all ${
                    isDragging
                      ? 'border-zinc-500 bg-zinc-800/40 text-white'
                      : 'border-zinc-800 bg-zinc-900/30 text-zinc-400 hover:border-zinc-700/80 hover:bg-zinc-900/50'
                  }`}
                >
                  <input
                    type="file"
                    id="fileInput"
                    multiple
                    accept=".txt,.md,.pdf,.png,.jpg,.jpeg"
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files) {
                        const filesArray = Array.from(e.target.files);
                        setUploadedFiles(prev => [...prev, ...filesArray]);
                      }
                    }}
                  />
                  <div className="flex flex-col items-center justify-center space-y-2">
                    <svg className="h-8 w-8 text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                    <span className="text-xs font-semibold text-zinc-300">
                      Glissez-déposez vos fichiers ici, ou cliquez pour parcourir
                    </span>
                    <span className="text-[10px] text-zinc-500">
                      Fichiers pris en charge : PDFs de cours, notes Markdown, images de schémas, textes bruts.
                    </span>
                  </div>
                </div>
              </div>

              {/* Uploaded Files List */}
              {uploadedFiles.length > 0 && (
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <label className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider">
                      Fichiers ajoutés ({uploadedFiles.length})
                    </label>
                    <button
                      type="button"
                      onClick={() => setUploadedFiles([])}
                      className="text-[9px] text-red-400 hover:text-red-300 cursor-pointer font-semibold uppercase tracking-wider bg-transparent border-none"
                    >
                      Tout vider
                    </button>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-40 overflow-y-auto custom-scrollbar p-1">
                    {uploadedFiles.map((file, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between p-2.5 rounded-xl border border-zinc-800 bg-zinc-900/40 text-xs text-zinc-300 hover:border-zinc-700/60 transition-all select-none"
                      >
                        <div className="flex items-center space-x-2 truncate">
                          <svg className="h-4 w-4 text-zinc-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                          <span className="truncate pr-2 font-medium">{file.name}</span>
                          <span className="text-[9px] text-zinc-500 font-mono shrink-0">
                            ({(file.size / 1024).toFixed(0)} KB)
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setUploadedFiles(prev => prev.filter((_, idx) => idx !== i))}
                          className="text-zinc-500 hover:text-red-400 p-0.5 rounded transition-colors cursor-pointer bg-transparent border-none"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* include exercises */}
              <div className="flex items-center space-x-3 rounded-xl border border-zinc-800 bg-zinc-900/20 p-3.5">
                <input
                  type="checkbox"
                  id="includeExercisesDocs"
                  checked={includeExercises}
                  onChange={(e) => setIncludeExercises(e.target.checked)}
                  className="h-4 w-4 rounded border-zinc-800 bg-zinc-905 text-zinc-300 focus:ring-zinc-800 focus:ring-offset-dark-950 accent-zinc-300"
                />
                <div className="space-y-0.5">
                  <label htmlFor="includeExercisesDocs" className="text-xs font-semibold text-white cursor-pointer">
                    Générer des exercices d'évaluation pratiques
                  </label>
                  <p className="text-[10px] text-dark-400">
                    Génère des cahiers d'exercices progressifs et leurs corrections à la fin de chaque sous-chapitre.
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleClose}
                  className="rounded-xl border border-zinc-800 bg-zinc-900/80 hover:bg-zinc-800 px-4 py-2 text-xs font-semibold text-zinc-300 transition-all select-none cursor-pointer"
                >
                  Annuler
                </button>

                <button
                  type="button"
                  onClick={handleUploadDocsAndGeneratePlan}
                  disabled={uploadedFiles.length === 0 || uploadingDocs}
                  className="flex items-center gap-2 rounded-xl bg-zinc-900 border border-zinc-800/80 text-zinc-200 hover:bg-zinc-850 hover:text-white px-5 py-2 text-xs font-semibold transition-all shadow-sm select-none cursor-pointer disabled:opacity-50"
                >
                  {uploadingDocs ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      <span>Analyse en cours...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-3.5 w-3.5" />
                      <span>Générer le plan de révision</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* B. Wide Layout (Custom Mode in Idle OR TOC Planned) */}
          {isWide && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 overflow-hidden h-full min-h-0 animate-fadeIn">
              {/* Column 1: Settings & Parameters (w-1/4) */}
              <div className="col-span-1 lg:col-span-3 flex flex-col justify-between overflow-y-auto pr-2 custom-scrollbar space-y-4 h-full border-r border-zinc-800/40 pr-4">
                <div className="space-y-4">
                  {/* Mode Tab Selector */}
                  <div className="flex border-b border-zinc-800/60 gap-4 shrink-0">
                    <button
                      type="button"
                      onClick={() => {
                        setGenMode('quick');
                        setTocMarkdown('');
                        setState('idle');
                      }}
                      className={`pb-2.5 text-xs font-semibold uppercase tracking-wider relative transition-colors ${
                        (genMode as string) === 'quick' ? 'text-white' : 'text-dark-400 hover:text-white'
                      }`}
                    >
                      Mode Rapide
                    </button>
                    <button
                      type="button"
                      onClick={() => setGenMode('custom')}
                      className={`pb-2.5 text-xs font-semibold uppercase tracking-wider relative transition-colors ${
                        (genMode as string) === 'custom' ? 'text-white' : 'text-dark-400 hover:text-white'
                      }`}
                    >
                      Personnalisé
                      {(genMode as string) === 'custom' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-zinc-500 rounded-full" />}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setGenMode('documents');
                        setState('idle');
                      }}
                      className={`pb-2.5 text-xs font-semibold uppercase tracking-wider relative transition-colors ${
                        (genMode as string) === 'documents' ? 'text-white' : 'text-dark-400 hover:text-white'
                      }`}
                    >
                      Documents
                      {(genMode as string) === 'documents' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-zinc-500 rounded-full" />}
                    </button>
                  </div>

                  <form className="space-y-4" onSubmit={handleSubmit}>
                    {/* Profile selection & model runtime override */}
                    <div className="space-y-4">
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                          <Layers className="h-3.5 w-3.5 text-zinc-400" />
                          Clé d'API / Profil
                        </label>
                        <div className="relative">
                          <button
                            type="button"
                            onClick={() => setIsProfileDropdownOpen(!isProfileDropdownOpen)}
                            className="w-full h-10 flex items-center justify-between rounded-xl border border-zinc-800 bg-zinc-900/50 px-3.5 text-xs text-zinc-200 hover:text-white hover:bg-zinc-800/80 transition-all font-sans cursor-pointer shadow-sm select-none"
                          >
                            <span className="truncate">
                              {profiles.find(p => p.id === selectedProfileId)?.name 
                                ? `${profiles.find(p => p.id === selectedProfileId)?.name} (${profiles.find(p => p.id === selectedProfileId)?.type})`
                                : "Aucun profil (par défaut)"}
                            </span>
                            <ChevronDown className={`h-3.5 w-3.5 text-dark-400 transition-transform duration-200 ${isProfileDropdownOpen ? 'rotate-180' : ''}`} />
                          </button>

                          {isProfileDropdownOpen && (
                            <>
                              <div className="fixed inset-0 z-20" onClick={() => setIsProfileDropdownOpen(false)} />
                              <div className="absolute left-0 right-0 mt-1.5 rounded-xl border border-zinc-800 bg-zinc-900 p-1 shadow-2xl z-30 animate-in fade-in duration-150 max-h-60 overflow-y-auto custom-scrollbar">
                                {profiles.map((p) => (
                                  <button
                                    key={p.id}
                                    type="button"
                                    onClick={() => {
                                      handleProfileChange(p.id);
                                      setIsProfileDropdownOpen(false);
                                    }}
                                    className={`w-full px-3 py-2 text-left text-xs transition-all font-sans truncate cursor-pointer rounded-lg hover:bg-zinc-850 hover:text-white ${
                                      selectedProfileId === p.id ? 'bg-zinc-800/60 text-white font-semibold' : 'text-zinc-300'
                                    }`}
                                  >
                                    {p.name} ({p.type})
                                  </button>
                                ))}
                                {profiles.length === 0 && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      handleProfileChange('');
                                      setIsProfileDropdownOpen(false);
                                    }}
                                    className="w-full px-3 py-2 text-left text-xs transition-all font-sans truncate cursor-pointer rounded-lg hover:bg-zinc-850 hover:text-white text-zinc-300 bg-zinc-800/60 font-semibold"
                                  >
                                    Aucun profil (par défaut)
                                  </button>
                                )}
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                      
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                          <Settings className="h-3.5 w-3.5 text-zinc-400" />
                          Modèle IA
                        </label>
                        {loadingModels ? (
                          <div className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3.5 py-2.5 text-xs text-dark-400 flex items-center gap-1.5 font-sans">
                            <Loader2 className="h-3.5 w-3.5 animate-spin text-zinc-550" />
                            Chargement des modèles...
                          </div>
                        ) : (
                          <div className="relative">
                            <button
                              type="button"
                              onClick={() => setIsModelDropdownOpen(!isModelDropdownOpen)}
                              className="w-full h-10 flex items-center justify-between rounded-xl border border-zinc-800 bg-zinc-900/50 px-3.5 text-xs text-zinc-200 hover:text-white hover:bg-zinc-800/80 transition-all font-sans cursor-pointer shadow-sm select-none"
                            >
                              <span className="truncate">
                                {isCustomModel ? `Autre modèle: ${selectedModel || '(saisir)'}` : selectedModel || 'Sélectionner un modèle'}
                              </span>
                              <ChevronDown className={`h-3.5 w-3.5 text-dark-400 transition-transform duration-200 ${isModelDropdownOpen ? 'rotate-180' : ''}`} />
                            </button>

                            {isModelDropdownOpen && (
                              <>
                                <div className="fixed inset-0 z-20" onClick={() => setIsModelDropdownOpen(false)} />
                                <div className="absolute left-0 right-0 mt-1.5 rounded-xl border border-zinc-800 bg-zinc-900 p-1 shadow-2xl z-30 animate-in fade-in duration-150 max-h-60 overflow-y-auto custom-scrollbar">
                                  {availableModels.map((m) => (
                                    <button
                                      key={m}
                                      type="button"
                                      onClick={() => {
                                        setIsCustomModel(false);
                                        setSelectedModel(m);
                                        setIsModelDropdownOpen(false);
                                      }}
                                      className={`w-full px-3 py-2 text-left text-xs transition-all font-sans truncate cursor-pointer rounded-lg hover:bg-zinc-855 hover:text-white ${
                                        !isCustomModel && selectedModel === m ? 'bg-zinc-800/60 text-white font-semibold' : 'text-zinc-300'
                                      }`}
                                    >
                                      {m}
                                    </button>
                                  ))}
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setIsCustomModel(true);
                                      setSelectedModel('');
                                      setIsModelDropdownOpen(false);
                                    }}
                                    className={`w-full px-3 py-2 text-left text-xs transition-all font-sans truncate cursor-pointer rounded-lg hover:bg-zinc-855 hover:text-white ${
                                      isCustomModel ? 'bg-zinc-800/60 text-white font-semibold' : 'text-zinc-350'
                                    }`}
                                  >
                                    Autre modèle (Saisie libre)...
                                  </button>
                                </div>
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    {isCustomModel && (
                      <div className="space-y-1.5 animate-slideDown">
                        <label className="text-[9px] font-bold text-dark-300 uppercase tracking-wider">
                          Identifiant du modèle personnalisé
                        </label>
                        <input
                          type="text"
                          value={selectedModel}
                          onChange={(e) => setSelectedModel(e.target.value)}
                          placeholder="Ex: gemini-1.5-pro..."
                          className="w-full rounded-xl border border-zinc-800 bg-zinc-900/40 px-3.5 py-2 text-xs text-white placeholder-dark-505 focus:border-zinc-700/80 focus:outline-none font-mono transition-all"
                          required
                        />
                      </div>
                    )}

                    {/* Subject */}
                    <div className="space-y-1.5">
                      <label htmlFor="subject" className="text-[10px] font-bold text-white uppercase tracking-wider">
                        Sujet académique ou technique
                      </label>
                      <input
                        type="text"
                        id="subject"
                        value={subject}
                        onChange={(e) => setSubject(e.target.value)}
                        placeholder="Ex: Architecture de Microservices, Algorithmique..."
                        className="w-full rounded-xl border border-zinc-800 bg-zinc-900/40 px-4 py-2.5 text-xs text-white placeholder-dark-505 focus:border-zinc-700/80 focus:outline-none transition-all font-sans"
                        required
                      />
                    </div>

                    {/* Level & Personality Stacked Vertically */}
                    <div className="flex flex-col gap-4">
                      {/* Level */}
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                          <GraduationCap className="h-3.5 w-3.5 text-zinc-400" />
                          Niveau cible
                        </label>
                        <div className="relative">
                          <button
                            type="button"
                            onClick={() => setIsLevelDropdownOpen(!isLevelDropdownOpen)}
                            className="w-full h-10 flex items-center justify-between rounded-xl border border-zinc-800 bg-zinc-900/50 px-3.5 text-xs text-zinc-200 hover:text-white hover:bg-zinc-800/80 transition-all font-sans cursor-pointer shadow-sm select-none"
                          >
                            <span className="truncate">
                              {levelCategories.find(cat => cat.id === selectedLevel)?.name 
                                ? `${levelCategories.find(cat => cat.id === selectedLevel)?.name} (${levelCategories.find(cat => cat.id === selectedLevel)?.description || levelCategories.find(cat => cat.id === selectedLevel)?.id})`
                                : selectedLevel === 'débutant'
                                ? 'Débutant (Introduction complète)'
                                : selectedLevel === 'intermédiaire'
                                ? 'Intermédiaire (Consolidation)'
                                : selectedLevel === 'professionnel'
                                ? 'Professionnel (Concepts avancés)'
                                : selectedLevel}
                            </span>
                            <ChevronDown className={`h-3.5 w-3.5 text-dark-400 transition-transform duration-200 ${isLevelDropdownOpen ? 'rotate-180' : ''}`} />
                          </button>

                          {isLevelDropdownOpen && (
                            <>
                              <div className="fixed inset-0 z-20" onClick={() => setIsLevelDropdownOpen(false)} />
                              <div className="absolute left-0 right-0 mt-1.5 rounded-xl border border-zinc-800 bg-zinc-900 p-1 shadow-2xl z-30 animate-in fade-in duration-150 max-h-60 overflow-y-auto custom-scrollbar">
                                {levelCategories.map((cat) => (
                                  <button
                                    key={cat.id}
                                    type="button"
                                    onClick={() => {
                                      setSelectedLevel(cat.id);
                                      setIsLevelDropdownOpen(false);
                                    }}
                                    className={`w-full px-3 py-2 text-left text-xs transition-all font-sans truncate cursor-pointer rounded-lg hover:bg-zinc-850 hover:text-white ${
                                      selectedLevel === cat.id ? 'bg-zinc-800/60 text-white font-semibold' : 'text-zinc-300'
                                    }`}
                                  >
                                    {cat.name} ({cat.description || cat.id})
                                  </button>
                                ))}
                                {levelCategories.length === 0 && (
                                  <>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setSelectedLevel('débutant');
                                        setIsLevelDropdownOpen(false);
                                      }}
                                      className={`w-full px-3 py-2 text-left text-xs transition-all font-sans truncate cursor-pointer rounded-lg hover:bg-zinc-850 hover:text-white ${
                                        selectedLevel === 'débutant' ? 'bg-zinc-800/60 text-white font-semibold' : 'text-zinc-300'
                                      }`}
                                    >
                                      Débutant (Introduction complète, analogies simples)
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setSelectedLevel('intermédiaire');
                                        setIsLevelDropdownOpen(false);
                                      }}
                                      className={`w-full px-3 py-2 text-left text-xs transition-all font-sans truncate cursor-pointer rounded-lg hover:bg-zinc-850 hover:text-white ${
                                        selectedLevel === 'intermédiaire' ? 'bg-zinc-800/60 text-white font-semibold' : 'text-zinc-300'
                                      }`}
                                    >
                                      Intermédiaire (Consolidation, exemples approfondis)
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setSelectedLevel('professionnel');
                                        setIsLevelDropdownOpen(false);
                                      }}
                                      className={`w-full px-3 py-2 text-left text-xs transition-all font-sans truncate cursor-pointer rounded-lg hover:bg-zinc-850 hover:text-white ${
                                        selectedLevel === 'professionnel' ? 'bg-zinc-800/60 text-white font-semibold' : 'text-zinc-300'
                                      }`}
                                    >
                                      Professionnel (Concepts avancés, orienté expert, sans blabla)
                                    </button>
                                  </>
                                )}
                              </div>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Personality Template Selector */}
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                          <Sparkles className="h-3.5 w-3.5 text-zinc-400" />
                          Gabarit de Personnalité
                        </label>
                        <div className="relative">
                          <button
                            type="button"
                            onClick={() => setIsPromptDropdownOpen(!isPromptDropdownOpen)}
                            className="w-full h-10 flex items-center justify-between rounded-xl border border-zinc-800 bg-zinc-900/50 px-3.5 text-xs text-zinc-200 hover:text-white hover:bg-zinc-800/80 transition-all font-sans cursor-pointer shadow-sm select-none"
                          >
                            <span className="truncate">
                              {systemPromptTemplates.find(tpl => tpl.id === selectedSystemPromptId)?.name || "Gabarit standard (Professeur)"}
                            </span>
                            <ChevronDown className={`h-3.5 w-3.5 text-dark-400 transition-transform duration-200 ${isPromptDropdownOpen ? 'rotate-180' : ''}`} />
                          </button>

                          {isPromptDropdownOpen && (
                            <>
                              <div className="fixed inset-0 z-20" onClick={() => setIsPromptDropdownOpen(false)} />
                              <div className="absolute left-0 right-0 mt-1.5 rounded-xl border border-zinc-800 bg-zinc-900 p-1 shadow-2xl z-30 animate-in fade-in duration-150 max-h-60 overflow-y-auto custom-scrollbar">
                                {systemPromptTemplates.map((tpl) => (
                                  <button
                                    key={tpl.id}
                                    type="button"
                                    onClick={() => {
                                      setSelectedSystemPromptId(tpl.id);
                                      setIsPromptDropdownOpen(false);
                                    }}
                                    className={`w-full px-3 py-2 text-left text-xs transition-all font-sans truncate cursor-pointer rounded-lg hover:bg-zinc-855 hover:text-white ${
                                      selectedSystemPromptId === tpl.id ? 'bg-zinc-800/60 text-white font-semibold' : 'text-zinc-300'
                                    }`}
                                  >
                                    {tpl.name}
                                  </button>
                                ))}
                                {systemPromptTemplates.length === 0 && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setSelectedSystemPromptId('');
                                      setIsPromptDropdownOpen(false);
                                    }}
                                    className="w-full px-3 py-2 text-left text-xs transition-all font-sans truncate cursor-pointer rounded-lg hover:bg-zinc-855 hover:text-white text-zinc-300 bg-zinc-800/60 font-semibold"
                                  >
                                    Gabarit standard (Professeur)
                                  </button>
                                )}
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* include exercises */}
                    <div className="flex items-center space-x-3 rounded-xl border border-zinc-800 bg-zinc-900/20 p-3">
                      <input
                        type="checkbox"
                        id="includeExercises"
                        checked={includeExercises}
                        onChange={(e) => setIncludeExercises(e.target.checked)}
                        className="h-4 w-4 rounded border-zinc-800 bg-zinc-905 text-zinc-300 focus:ring-zinc-800 focus:ring-offset-dark-950 accent-zinc-300"
                      />
                      <div className="space-y-0.5">
                        <label htmlFor="includeExercises" className="text-xs font-semibold text-white cursor-pointer">
                          Générer les exercices
                        </label>
                      </div>
                    </div>
                  </form>
                </div>

                <div className="flex items-center gap-3 pt-4 border-t border-zinc-800/40 shrink-0">
                  <button
                    type="button"
                    onClick={handleClose}
                    className="rounded-xl border border-zinc-800 bg-zinc-900/80 hover:bg-zinc-800 px-4 py-2.5 text-xs font-semibold text-zinc-300 transition-all flex-1 select-none cursor-pointer"
                  >
                    Annuler
                  </button>
                  <button
                    type="button"
                    onClick={handleGenerateTOC}
                    disabled={!subject.trim()}
                    className="flex items-center justify-center gap-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 px-5 py-2.5 text-xs font-semibold text-zinc-200 transition-all border border-zinc-800/80 disabled:opacity-50 flex-1 select-none cursor-pointer"
                  >
                    {tocMarkdown ? (
                      <>
                        <RefreshCw className="h-3.5 w-3.5" />
                        <span>Ré-planifier</span>
                      </>
                    ) : (
                      <>
                        <Settings className="h-3.5 w-3.5" />
                        <span>Planifier</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Column 2: TOC Markdown Editor (w-5/12) */}
              <div className="col-span-1 lg:col-span-5 flex flex-col justify-between overflow-hidden h-full min-h-0 border-r border-zinc-800/40 pr-4 relative">
                <div className="flex-1 flex flex-col space-y-4 min-h-0 relative">
                  {/* Glassmorphic Overlay Blur when generating TOC */}
                  {state === 'planning_toc' && (
                    <div className="absolute inset-0 bg-dark-950/80 backdrop-blur-md z-30 flex flex-col items-center justify-center space-y-4 rounded-xl animate-fadeIn">
                      <Loader2 className="h-9 w-9 text-zinc-300 animate-spin" />
                      <div className="text-center space-y-1">
                        <h4 className="text-xs font-bold text-white uppercase tracking-wider">Planification académique...</h4>
                        <p className="text-[10px] text-dark-400 max-w-[220px] mx-auto leading-relaxed">
                          L'IA structure le cours en modules et prépare la table des matières optimale pour votre sujet.
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Banner */}
                  <div className="flex gap-2.5 items-start text-xs text-zinc-300 bg-zinc-900/20 border border-zinc-800 rounded-xl p-3 shrink-0 select-none">
                    <Info className="h-4.5 w-4.5 text-zinc-400 shrink-0 mt-0.5" />
                    <p className="leading-relaxed text-[11px]">
                      {tocMarkdown 
                        ? "Modifiez le plan ci-dessous ou importez votre propre table des matières."
                        : "Planifiez d'abord la structure ou écrivez votre propre plan."}
                    </p>
                  </div>

                  {/* TOC Editor Textarea */}
                      <label className="text-[10px] font-bold text-white uppercase tracking-wider flex items-center justify-between shrink-0">
                      <span>Plan du cours (Markdown modifiable)</span>
                      {tocMarkdown ? (
                        <span className="text-[8px] text-zinc-300 font-mono font-bold select-none bg-zinc-900 border border-zinc-800 rounded-lg px-1.5 py-0.5 uppercase">
                          Prêt à éditer
                        </span>
                      ) : (
                        <span className="text-[8px] text-zinc-505 font-mono font-bold select-none bg-zinc-900 border border-zinc-800 rounded-lg px-1.5 py-0.5 uppercase">
                          En attente
                        </span>
                      )}
                    </label>
                    <div className="flex-1 rounded-xl border border-zinc-800 bg-zinc-900/40 p-2 overflow-hidden focus-within:border-zinc-700/80 transition-colors flex flex-col min-h-0">
                      <textarea
                        value={tocMarkdown}
                        onChange={(e) => setTocMarkdown(e.target.value)}
                        placeholder="# Titre du Cours&#10;&#10;- Module 1 : Titre&#10;  - Chapitre 1.1&#10;  - Chapitre 1.2&#10;- Module 2 : Titre&#10;  - Chapitre 2.1"
                        className="flex-1 bg-transparent border-none text-[11px] font-mono leading-relaxed text-white focus:outline-none p-3 resize-none select-text overflow-y-auto custom-scrollbar"
                        required
                      />
                    </div>
                  </div>
              </div>

              {/* Column 3: Comments & Style Directives Textarea (w-1/3) */}
              <div className="col-span-1 lg:col-span-4 flex flex-col justify-between overflow-hidden h-full min-h-0">
                <div className="flex-1 flex flex-col space-y-4 min-h-0">
                  {/* Banner */}
                  <div className="flex gap-2.5 items-start text-xs text-zinc-300 bg-zinc-900/20 border border-zinc-800 rounded-xl p-3 shrink-0 select-none">
                    <Sparkles className="h-4.5 w-4.5 text-zinc-400 shrink-0 mt-0.5" />
                    <p className="leading-relaxed text-[11px]">
                      Ajoutez vos consignes spécifiques : technologies à imposer, style de rédaction ou ton pédagogique.
                    </p>
                  </div>

                  {/* Comments/Style directives Textarea */}
                  <div className="flex-1 flex flex-col min-h-0 space-y-1.5">
                    <div className="flex justify-between items-center shrink-0">
                      <label className="text-[10px] font-bold text-white uppercase tracking-wider flex items-center gap-1">
                        <Sparkles className="h-3 w-3 text-zinc-400" />
                        Commentaires & consignes de style
                      </label>
                      <span className="text-[8px] text-dark-505 font-mono">Facultatif</span>
                    </div>
                    <div className="flex-1 rounded-xl border border-zinc-800 bg-zinc-900/40 p-2 overflow-hidden focus-within:border-zinc-700/80 transition-colors flex flex-col min-h-0">
                      <textarea
                        value={customInstructions}
                        onChange={(e) => setCustomInstructions(e.target.value)}
                        placeholder="Ex:&#10;- Utiliser des exemples complets en TypeScript&#10;- Adopter un ton rigoureux mais pédagogique&#10;- Mettre l'accent sur les bonnes pratiques OWASP&#10;- Pas de raccourcis ou de '// Reste du code...'"
                        className="flex-1 bg-transparent border-none text-[11px] font-mono leading-relaxed text-white focus:outline-none p-3 resize-none select-text overflow-y-auto custom-scrollbar"
                      />
                    </div>
                  </div>
                </div>

                {/* Launch generator action */}
                <div className="pt-4 mt-4 border-t border-zinc-800/40 flex justify-end shrink-0">
                  <button
                    type="button"
                    onClick={handleSubmit}
                    disabled={!tocMarkdown.trim()}
                    className="w-full flex items-center justify-center gap-1.5 rounded-xl bg-zinc-900 border border-zinc-800/80 text-zinc-200 hover:bg-zinc-850 hover:text-white px-5 py-3 text-xs font-semibold transition-all disabled:opacity-50 shadow-sm select-none font-sans cursor-pointer"
                  >
                    <Sparkles className="h-4 w-4" />
                    Lancer la génération du cours
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* C. Planning TOC Loader state (Only used in Quick mode, since Custom Mode uses beautiful absolute overlay blur) */}
          {state === 'planning_toc' && genMode === 'quick' && (
            <div className="flex flex-col items-center justify-center py-20 space-y-4 text-center h-full">
              <Loader2 className="h-10 w-10 text-zinc-300 animate-spin" />
              <div className="space-y-1">
                <h4 className="text-sm font-semibold text-white uppercase tracking-wider">Planification académique...</h4>
                <p className="text-xs text-dark-400 max-w-xs mx-auto">
                  L'IA structure le cours en modules et prépare la table des matières optimale pour votre sujet.
                </p>
              </div>
            </div>
          )}

          {/* D. Submitting & generating states */}
          {(state === 'submitting' || state === 'generating') && (
            <div className="space-y-5 animate-fadeIn">
              {/* Spinner & progress bar */}
              <div className="flex items-center gap-4 border-b border-dark-800 pb-4">
                <div className="relative flex items-center justify-center h-12 w-12 shrink-0">
                  <div className="absolute inset-0 rounded-md border border-dark-800 border-t-zinc-300 animate-spin" />
                  <BookOpen className="h-5 w-5 text-zinc-300 animate-pulse" />
                </div>
                
                <div className="flex-1 space-y-1.5 min-w-0">
                  <div className="flex justify-between items-center text-xs font-mono">
                    <span className="font-semibold text-zinc-300 truncate max-w-[250px]">{currentTask}</span>
                    <span className="font-bold text-white">{Math.round(progress)}%</span>
                  </div>
                  <div className="h-2 w-full bg-dark-900 border border-dark-800 rounded-md overflow-hidden">
                    <div 
                      className="h-full bg-dark-400 transition-all duration-500 rounded-md"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* API Requests Counter & Time left estimation & Terminal toggle */}
              <div className="flex items-center justify-between text-xs font-mono text-dark-400 py-1 bg-dark-900/40 px-3.5 py-2 rounded-md border border-dark-800">
                <div className="flex flex-col gap-0.5">
                  {totalExpectedRequests > 0 && (
                    <span className="text-[10px] text-dark-300">
                      Requêtes API : <strong className="text-white">{completedRequests}</strong> / {totalExpectedRequests}
                    </span>
                  )}
                  {timeLeftStr && (
                    <span className="text-[9px] text-zinc-400 font-semibold">
                      Temps restant estimé : ~{timeLeftStr}
                    </span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => setShowLogs(!showLogs)}
                  className="flex items-center gap-1 px-2 py-1 rounded bg-dark-950 border border-dark-800 text-[10px] text-dark-300 hover:text-white hover:bg-dark-900 transition-all font-sans select-none"
                >
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-zinc-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-zinc-300"></span>
                  </span>
                  {showLogs ? "Masquer la console" : "Afficher la console"}
                </button>
              </div>

              {/* Glassmorphic Logs Terminal Console */}
              {showLogs && (
                <div className="w-full text-left rounded-md bg-dark-950/70 border border-dark-850 p-3 h-32 overflow-y-auto font-mono text-[10px] select-text shadow-inner transition-all duration-300">
                  <div className="space-y-1">
                    {logs.map((log, idx) => renderLogLine(log, idx))}
                    {logs.length === 0 && (
                      <div className="text-dark-500 italic py-1">En attente de logs...</div>
                    )}
                    <div ref={consoleEndRef} />
                  </div>
                </div>
              )}

              {/* Hierarchical progress tree */}
              {jobTOC ? (
                <div className="rounded-md border border-dark-800 bg-dark-900/10 p-4 space-y-4 max-h-[30vh] overflow-y-auto">
                  <h4 className="text-[10px] font-bold text-white uppercase tracking-wider border-b border-dark-800 pb-1.5">
                    {jobTOC.title}
                  </h4>
                  
                  <div className="space-y-3">
                    {jobTOC.modules.map((m, mIdx) => (
                      <div key={m.id} className="space-y-1.5">
                        <div className="text-xs font-bold text-dark-300 truncate">
                          Module {mIdx + 1} : {m.title}
                        </div>
                        
                        <div className="space-y-1.5 pl-3 border-l border-dark-800">
                          {m.submodules.map((sm) => {
                            // Find flat index
                            const flatIdx = flatSubmodules.findIndex(f => f.id === sm.id);
                            const isDone = flatIdx < currentSubmoduleIndex;
                            const isCurrent = flatIdx === currentSubmoduleIndex;
                            
                            return (
                              <div key={sm.id} className="flex items-center justify-between text-xs py-0.5">
                                <span className={`truncate pr-2 ${
                                  isDone ? 'text-dark-500 line-through' : isCurrent ? 'text-white font-medium' : 'text-dark-400'
                                }}`}>
                                  {sm.title}
                                </span>
                                <div className="shrink-0 flex items-center">
                                  {isDone ? (
                                    <CheckCircle2 className="h-3.5 w-3.5 text-zinc-400" />
                                  ) : isCurrent ? (
                                    <Loader2 className="h-3.5 w-3.5 text-zinc-300 animate-spin" />
                                  ) : (
                                    <div className="h-2 w-2 rounded-full bg-dark-800 border border-dark-900" />
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                /* Simple Flat Loader checklist while waiting for TOC */
                <div className="w-full text-left rounded-md bg-dark-900/20 border border-dark-800 p-4 space-y-3">
                  <div className="flex items-center gap-3 text-xs">
                    {progress >= 10 ? <CheckCircle2 className="h-4 w-4 text-zinc-400" /> : <Loader2 className="h-4 w-4 text-zinc-350 animate-spin" />}
                    <span className={progress >= 10 ? 'text-dark-500 line-through' : 'text-white'}>Planification et structure du cours</span>
                  </div>
                  <div className="flex items-center gap-3 text-xs">
                    {progress >= 90 ? <CheckCircle2 className="h-4 w-4 text-zinc-400" /> : progress >= 10 ? <Loader2 className="h-4 w-4 text-zinc-350 animate-spin" /> : <div className="h-4 w-4 rounded-full border border-dark-800" />}
                    <span className={progress >= 90 ? 'text-dark-500 line-through' : progress >= 10 ? 'text-white' : 'text-dark-450'}>Rédaction des modules & exercices</span>
                  </div>
                </div>
              )}

              {/* Background generation & Cancel options */}
              <div className="pt-2 flex flex-col gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="w-full py-2.5 rounded-md border border-dark-900 bg-dark-900 hover:bg-dark-800 text-xs font-semibold text-white transition-all text-center shadow-sm cursor-pointer"
                >
                  Fermer & Continuer en arrière-plan
                </button>
                
                <button
                  type="button"
                  onClick={async () => {
                    if (window.confirm("Voulez-vous vraiment interrompre la génération de ce cours ? Tous les chapitres déjà rédigés seront conservés en mode RAW.")) {
                      try {
                        const jobId = activeJobId || reconnectJobId;
                        if (jobId) {
                          const res = await fetch(`/api/generate/cancel/${jobId}`, { method: 'POST' });
                          if (res.ok) {
                            addToast({
                              title: 'Génération interrompue',
                              description: 'La génération du cours a été arrêtée à votre demande. Le cours reste disponible avec les chapitres déjà rédigés.',
                              type: 'info'
                            });
                            handleClose();
                            onSuccess(''); // trigger dashboard reload
                          }
                        }
                      } catch (err) {
                        console.error('Error canceling job:', err);
                      }
                    }
                  }}
                  className="w-full py-2 rounded-md border border-rose-950 bg-rose-950/20 hover:bg-rose-900/30 text-xs font-semibold text-rose-455 transition-all text-center cursor-pointer"
                >
                  🛑 Interrompre la génération (RAW)
                </button>
                
                <p className="text-[10px] text-dark-500 text-center mt-1">
                  Le travail continuera en arrière-plan si vous fermez le modal sans l'interrompre.
                </p>
              </div>
            </div>
          )}

          {/* E. Completed State */}
          {state === 'completed' && (
            <div className="flex flex-col items-center justify-center py-6 space-y-5 text-center animate-fadeIn">
              <div className="flex items-center justify-center h-14 w-14 rounded-md bg-dark-900 border border-zinc-800">
                <CheckCircle2 className="h-8 w-8 text-zinc-300 animate-bounce" />
              </div>

              <div className="space-y-1.5">
                <h4 className="text-sm font-bold text-white uppercase tracking-wider">Cours généré avec succès !</h4>
                <p className="text-xs text-dark-400 max-w-sm mx-auto">
                  La planification, la rédaction complète des chapitres, les exercices de validation et l'export PDF ont été achevés avec brio !
                </p>
              </div>

              <button
                onClick={handleFinish}
                className="w-full flex items-center justify-center gap-1.5 rounded-md bg-dark-800 border border-dark-750 text-zinc-200 hover:bg-dark-750 hover:text-white px-5 py-3 text-xs font-semibold transition-all shadow-sm cursor-pointer animate-pulse"
              >
                Découvrir le cours & étudier
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          )}

          {/* F. Error State */}
          {state === 'error' && (
            <div className="flex flex-col items-center justify-center py-6 space-y-5 text-center animate-fadeIn">
              <div className="flex items-center justify-center h-14 w-14 rounded-md bg-rose-950/10 border border-rose-900/40">
                <AlertTriangle className="h-8 w-8 text-rose-500" />
              </div>

              <div className="space-y-2">
                <h4 className="text-sm font-bold text-white uppercase tracking-wider">Échec de la génération</h4>
                <p className="text-xs text-rose-450 bg-rose-950/20 border border-rose-900/40 rounded-md p-3.5 text-left font-mono max-h-32 overflow-y-auto max-w-sm">
                  {errorMessage}
                </p>
              </div>

              <div className="flex items-center gap-3 w-full border-t border-dark-800 pt-4">
                <button
                  onClick={handleClose}
                  className="flex-1 rounded-md border border-dark-850 bg-transparent px-4 py-2 text-xs font-semibold text-zinc-200 hover:bg-dark-800/40 transition-all cursor-pointer"
                >
                  Fermer
                </button>
                <button
                  onClick={() => setState('idle')}
                  className="flex-1 rounded-md bg-dark-800 border border-dark-750 text-zinc-200 hover:bg-dark-750 hover:text-white px-4 py-2 text-xs font-semibold transition-all cursor-pointer"
                >
                  Réessayer
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default GenerateCourseModal;
