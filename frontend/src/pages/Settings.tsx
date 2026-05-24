import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { 
  Save, Eye, EyeOff, Cpu, Database, Sparkles, Copy, Check,
  Plus, Trash2, Edit3, CheckCircle2, Power, X, Layers, FileText, Download, Upload, AlertCircle,
  Palette, Settings as SettingsIcon
} from 'lucide-react';
import { MainSidebar } from '../components/MainSidebar';
import { useToast } from '../components/ToastProvider';
import { useTheme } from '../components/ThemeContext';

interface LLMProfile {
  id: string;
  name: string;
  type: string; // 'openai' | 'openrouter' | 'gemini' | 'ollama' | 'aws_bedrock' | 'custom'
  api_key: string;
  base_url: string;
  model: string;
  is_active: boolean;
}

interface SettingsResponse {
  llm_api_key: string;
  llm_base_url: string;
  llm_model: string;
  data_dir: string;
  profiles: LLMProfile[];
  active_profile_id: string;
}

export const Settings: React.FC = () => {
  const { addToast } = useToast();
  const { preset, themeProperties, setThemePreset, updateThemeProperty, importTheme, exportTheme } = useTheme();
  const [searchParams] = useSearchParams();
  const tab = searchParams.get('tab') || 'api_keys';
  const activeSection = (tab === 'system_prompt' || tab === 'api_keys' || tab === 'personalization') ? tab : 'api_keys';

  // API profiles states
  const [profiles, setProfiles] = useState<LLMProfile[]>([]);
  const [activeProfileId, setActiveProfileId] = useState('');
  const [dataDir, setDataDir] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Form states for creating/editing profile
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingProfileId, setEditingProfileId] = useState<string | null>(null);
  const [formName, setFormName] = useState('');
  const [formType, setFormType] = useState('openai');
  const [formApiKey, setFormApiKey] = useState('');
  const [formBaseUrl, setFormBaseUrl] = useState('https://api.openai.com/v1');
  const [showFormKey, setShowFormKey] = useState(false);

  // System Prompt Templates States
  interface SystemPromptTemplate {
    name: string;
    description: string;
    content: string;
  }
  const [templates, setTemplates] = useState<Record<string, SystemPromptTemplate>>({});
  const [loadingPrompt, setLoadingPrompt] = useState(false);
  const [isTplFormOpen, setIsTplFormOpen] = useState(false);
  const [editingTplId, setEditingTplId] = useState<string | null>(null);
  const [tplName, setTplName] = useState('');
  const [tplDescription, setTplDescription] = useState('');
  const [tplContent, setTplContent] = useState('');

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [visibleKeys, setVisibleKeys] = useState<Record<string, boolean>>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Dynamic Prompt Categories States
  interface PromptCategory {
    name: string;
    description: string;
    directive: string;
  }
  const [categories, setCategories] = useState<Record<string, PromptCategory>>({});
  const [isCatFormOpen, setIsCatFormOpen] = useState(false);
  const [editingCatId, setEditingCatId] = useState<string | null>(null);
  const [catName, setCatName] = useState('');
  const [catDescription, setCatDescription] = useState('');
  const [catDirective, setCatDirective] = useState('');

  // Load profiles from backend
  const fetchSettings = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/settings');
      if (res.ok) {
        const data: SettingsResponse = await res.json();
        setProfiles(data.profiles || []);
        setActiveProfileId(data.active_profile_id || '');
        setDataDir(data.data_dir || '');
      } else {
        throw new Error('Erreur lors du chargement des paramètres');
      }
    } catch (err) {
      console.error('Error fetching settings:', err);
      setStatus({ type: 'error', message: 'Impossible de charger les configurations existantes.' });
    } finally {
      setLoading(false);
    }
  };

  // Load System Prompt Templates from backend
  const fetchTemplates = async () => {
    try {
      setLoadingPrompt(true);
      const res = await fetch('/api/settings/system-prompts');
      if (res.ok) {
        const data = await res.json();
        setTemplates(data || {});
      }
    } catch (err) {
      console.error('Error fetching system prompt templates:', err);
    } finally {
      setLoadingPrompt(false);
    }
  };

  // Load Prompt Categories from backend
  const fetchCategories = async () => {
    try {
      const res = await fetch('/api/settings/prompt-categories');
      if (res.ok) {
        const data = await res.json();
        setCategories(data || {});
      }
    } catch (err) {
      console.error('Error fetching prompt categories:', err);
    }
  };

  useEffect(() => {
    fetchSettings();
    fetchTemplates();
    fetchCategories();
  }, []);

  const handleTypeChange = (type: string) => {
    setFormType(type);
    switch (type) {
      case 'openai':
        setFormBaseUrl('https://api.openai.com/v1');
        break;
      case 'openrouter':
        setFormBaseUrl('https://openrouter.ai/api/v1');
        break;
      case 'gemini':
        setFormBaseUrl('https://generativelanguage.googleapis.com/v1beta');
        break;
      case 'ollama':
        setFormBaseUrl('http://host.docker.internal:11434/v1');
        break;
      case 'aws_bedrock':
        setFormBaseUrl('us-east-1');
        break;
      default:
        setFormBaseUrl('');
        break;
    }
  };

  const openAddForm = () => {
    setEditingProfileId(null);
    setFormName('');
    setFormType('gemini');
    setFormApiKey('');
    setFormBaseUrl('https://generativelanguage.googleapis.com/v1beta');
    setShowFormKey(false);
    setIsFormOpen(true);
    setStatus(null);
  };

  const openEditForm = (profile: LLMProfile) => {
    setEditingProfileId(profile.id);
    setFormName(profile.name);
    setFormType(profile.type);
    setFormApiKey(profile.api_key || '');
    setFormBaseUrl(profile.base_url || '');
    setShowFormKey(false);
    setIsFormOpen(true);
    setStatus(null);
  };

  const closeForm = () => {
    setIsFormOpen(false);
    setEditingProfileId(null);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      setStatus({ type: 'error', message: 'Veuillez saisir un nom pour ce profil.' });
      return;
    }

    setSaving(true);
    setStatus(null);

    const isEdit = !!editingProfileId;
    const url = isEdit ? `/api/settings/profile/${editingProfileId}` : '/api/settings/profile';
    const method = isEdit ? 'PUT' : 'POST';

    try {
      const res = await fetch(url, {
        method: method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formName.trim(),
          type: formType,
          api_key: formApiKey.trim(),
          base_url: formBaseUrl.trim(),
          model: '' // Backwards compatibility field
        }),
      });

      if (res.ok) {
        addToast({
          title: isEdit ? 'Profil mis à jour' : 'Profil créé !',
          description: isEdit ? 'La clé API et le profil ont été mis à jour.' : 'Le nouveau profil d\'API a été créé avec succès.',
          type: 'success'
        });
        closeForm();
        fetchSettings();
      } else {
        const errorData = await res.json();
        throw new Error(errorData.detail || 'Erreur lors de la sauvegarde du profil.');
      }
    } catch (err: any) {
      console.error(err);
      setStatus({ type: 'error', message: err.message || 'Impossible de sauvegarder le profil.' });
    } finally {
      setSaving(false);
    }
  };

  const handleActivate = async (profileId: string) => {
    setStatus(null);
    try {
      const res = await fetch(`/api/settings/profile/${profileId}/activate`, { method: 'POST' });
      if (res.ok) {
        setActiveProfileId(profileId);
        const selectedProfile = profiles.find(p => p.id === profileId);
        addToast({
          title: 'Profil sélectionné',
          description: `Le profil "${selectedProfile?.name}" est maintenant actif par défaut.`,
          type: 'success'
        });
      } else {
        throw new Error("Impossible d'activer ce profil.");
      }
    } catch (err: any) {
      console.error(err);
      setStatus({ type: 'error', message: err.message });
    }
  };

  const handleDelete = async (profileId: string) => {
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer cette clé API ?')) return;
    setStatus(null);
    try {
      const res = await fetch(`/api/settings/profile/${profileId}`, { method: 'DELETE' });
      if (res.ok) {
        addToast({
          title: 'Clé API supprimée',
          description: 'Le profil de clé d\'API a été supprimé définitivement.',
          type: 'success'
        });
        fetchSettings();
      } else {
        throw new Error("Erreur lors de la suppression de la clé d'API.");
      }
    } catch (err: any) {
      console.error(err);
      setStatus({ type: 'error', message: err.message });
    }
  };

  const toggleKeyVisibility = (profileId: string) => {
    setVisibleKeys(prev => ({
      ...prev,
      [profileId]: !prev[profileId]
    }));
  };

  const handleCopyKey = (id: string, key: string) => {
    navigator.clipboard.writeText(key);
    setCopiedId(id);
    addToast({
      title: 'Clé copiée',
      description: 'La clé API a été copiée dans le presse-papier.',
      type: 'success'
    });
    setTimeout(() => setCopiedId(null), 2000);
  };

  // CRUD Templates methods
  const openAddTplForm = () => {
    setEditingTplId(null);
    setTplName('');
    setTplDescription('');
    setTplContent('');
    setIsTplFormOpen(true);
    setStatus(null);
  };

  const openEditTplForm = (id: string, tpl: SystemPromptTemplate) => {
    setEditingTplId(id);
    setTplName(tpl.name);
    setTplDescription(tpl.description);
    setTplContent(tpl.content);
    setIsTplFormOpen(true);
    setStatus(null);
  };

  const closeTplForm = () => {
    setIsTplFormOpen(false);
    setEditingTplId(null);
  };

  const handleTplFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tplName.trim() || !tplContent.trim()) {
      setStatus({ type: 'error', message: 'Veuillez saisir un nom et le prompt correspondant.' });
      return;
    }
    setSaving(true);
    setStatus(null);
    try {
      const res = await fetch('/api/settings/system-prompts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingTplId,
          name: tplName.trim(),
          description: tplDescription.trim(),
          content: tplContent,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setTemplates(data.templates || {});
        addToast({
          title: editingTplId ? 'Gabarit modifié' : 'Gabarit créé !',
          description: editingTplId ? 'Le gabarit de prompt a été modifié.' : 'Le nouveau gabarit de prompt a été créé.',
          type: 'success'
        });
        closeTplForm();
      } else {
        const errData = await res.json();
        throw new Error(errData.detail || "Erreur lors de l'enregistrement du gabarit.");
      }
    } catch (err: any) {
      console.error(err);
      setStatus({ type: 'error', message: err.message || 'Impossible de sauvegarder le gabarit.' });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteTpl = async (id: string) => {
    if (Object.keys(templates).length <= 1) {
      alert("Impossible de supprimer le dernier gabarit de prompt restant.");
      return;
    }
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer ce gabarit ?')) return;

    setSaving(true);
    setStatus(null);
    try {
      const res = await fetch(`/api/settings/system-prompts/${id}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        const data = await res.json();
        setTemplates(data.templates || {});
        addToast({
          title: 'Gabarit supprimé',
          description: 'Le gabarit de personnalité a été supprimé définitivement.',
          type: 'success'
        });
      } else {
        const errData = await res.json();
        throw new Error(errData.detail || "Erreur lors de la suppression du gabarit.");
      }
    } catch (err: any) {
      console.error(err);
      setStatus({ type: 'error', message: err.message || 'Impossible de supprimer le gabarit.' });
    } finally {
      setSaving(false);
    }
  };

  const importSystemPrompt = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    const reader = new FileReader();
    reader.onload = (evt) => {
      if (evt.target?.result) {
        setTplContent(evt.target.result as string);
        addToast({
          title: 'Fichier lu',
          description: 'Le prompt système a été chargé depuis le fichier sélectionné.',
          type: 'success'
        });
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const exportSystemPrompt = (content: string, filename: string) => {
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    addToast({
      title: 'Fichier exporté',
      description: 'Le prompt système actuel a été exporté.',
      type: 'info'
    });
  };

  // CRUD Categories methods
  const openAddCatForm = () => {
    setEditingCatId(null);
    setCatName('');
    setCatDescription('');
    setCatDirective('');
    setIsCatFormOpen(true);
    setStatus(null);
  };

  const openEditCatForm = (id: string, cat: PromptCategory) => {
    setEditingCatId(id);
    setCatName(cat.name);
    setCatDescription(cat.description);
    setCatDirective(cat.directive);
    setIsCatFormOpen(true);
    setStatus(null);
  };

  const closeCatForm = () => {
    setIsCatFormOpen(false);
    setEditingCatId(null);
  };

  const handleCatFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!catName.trim() || !catDirective.trim()) {
      setStatus({ type: 'error', message: 'Veuillez saisir un nom et une directive.' });
      return;
    }
    setSaving(true);
    setStatus(null);
    try {
      const res = await fetch('/api/settings/prompt-categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingCatId,
          name: catName.trim(),
          description: catDescription.trim(),
          directive: catDirective.trim(),
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setCategories(data.categories || {});
        addToast({
          title: editingCatId ? 'Niveau modifié' : 'Niveau créé !',
          description: editingCatId ? 'La catégorie d\'apprentissage a été modifiée.' : 'Le nouveau niveau d\'apprentissage a été créé.',
          type: 'success'
        });
        closeCatForm();
      } else {
        const errData = await res.json();
        throw new Error(errData.detail || "Erreur lors de l'enregistrement de la catégorie.");
      }
    } catch (err: any) {
      console.error(err);
      setStatus({ type: 'error', message: err.message || 'Impossible de sauvegarder la catégorie.' });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteCat = async (id: string) => {
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer ce niveau ?')) return;
    setSaving(true);
    setStatus(null);
    try {
      const res = await fetch(`/api/settings/prompt-categories/${id}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        const data = await res.json();
        setCategories(data.categories || {});
        addToast({
          title: 'Niveau supprimé',
          description: 'La catégorie d\'apprentissage a été supprimée définitivement.',
          type: 'success'
        });
      } else {
        const errData = await res.json();
        throw new Error(errData.detail || "Erreur lors de la suppression de la catégorie.");
      }
    } catch (err: any) {
      console.error(err);
      setStatus({ type: 'error', message: err.message || 'Impossible de supprimer la catégorie.' });
    } finally {
      setSaving(false);
    }
  };

  const getProviderBadge = (type: string) => {
    const baseStyle = "text-[9px] px-2 py-0.5 rounded font-bold uppercase tracking-wide shrink-0 bg-dark-800 text-zinc-300 border border-zinc-750/40 ";
    switch (type) {
      case 'openai':
        return <span className={baseStyle}>OpenAI</span>;
      case 'openrouter':
        return <span className={baseStyle}>OpenRouter</span>;
      case 'gemini':
        return <span className={baseStyle}>Gemini</span>;
      case 'ollama':
        return <span className={baseStyle}>Ollama</span>;
      case 'aws_bedrock':
        return <span className={baseStyle}>Bedrock</span>;
      default:
        return <span className={baseStyle}>Custom</span>;
    }
  };

  return (
    <div className="flex h-screen w-screen bg-dark-950 text-dark-200 overflow-hidden font-sans relative">
      {/* 1. Global Left Sidebar */}
      <MainSidebar />

      {/* 2. Main content container */}
      <div className="flex-1 flex flex-col h-full overflow-hidden relative">
        {/* Decorative background grid */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#1a1a1e_1px,transparent_1px),linear-gradient(to_bottom,#1a1a1e_1px,transparent_1px)] bg-[size:4rem_4rem] opacity-25 pointer-events-none" />

        {/* Top Header Bar */}
        <header className="relative flex items-center justify-between border-b border-dark-800/60 px-8 py-5 bg-dark-900/20 backdrop-blur-md shrink-0">
          <div>
            <h1 className="text-sm font-semibold text-white tracking-tight m-0 leading-none">
              <SettingsIcon className="inline-block h-4 w-4 text-white mr-2.5 -mt-0.5" />
              {activeSection === 'api_keys' ? 'Clés API & Profils' : activeSection === 'system_prompt' ? 'Prompts & Gabarits' : 'Personnalisation'}
            </h1>
            <p className="text-[10px] text-dark-400 font-mono mt-1.5">Configurez vos clés API et personnalisez la structure de vos cours</p>
          </div>

          <div className="flex items-center gap-6">
            {activeSection === 'api_keys' && !loading && (
              <button
                onClick={openAddForm}
                className="flex items-center gap-1.5 rounded-md bg-zinc-200 hover:bg-zinc-300 px-3.5 py-1.5 text-xs font-semibold text-zinc-950 transition-all cursor-pointer shadow-sm"
              >
                <Plus className="h-3.5 w-3.5" />
                Ajouter une clé
              </button>
            )}
          </div>
        </header>

        {/* Content Panel */}
        <main className="flex-1 overflow-y-auto px-8 py-10 relative">
          <div className="max-w-5xl mx-auto space-y-6">
            
            {/* Status alerts */}
            {status && (
              <div
                className={`p-4 rounded-xl border text-xs font-bold ${
                  status.type === 'success'
                    ? 'bg-emerald-950/25 border-emerald-500/40 text-emerald-400 animate-fadeIn shadow-lg'
                    : 'bg-rose-950/25 border-rose-500/40 text-rose-400 animate-fadeIn shadow-lg'
                }`}
              >
                {status.message}
              </div>
            )}

            {loading ? (
              <div className="flex flex-col items-center justify-center py-32 space-y-4">
                <span className="h-8 w-8 rounded-full border-4 border-brand-500/10 border-t-brand-500 animate-spin" />
                <p className="text-xs text-dark-400 font-mono">Chargement des données...</p>
              </div>
            ) : (
              <>
                {/* 1. API Keys Section */}
                {activeSection === 'api_keys' && (
                  <div className="space-y-6">
                    <div className="flex items-center gap-2">
                      <Layers className="h-4.5 w-4.5 text-brand-500" />
                      <h3 className="text-xs font-bold text-white uppercase tracking-wider">Clés d'API configurées</h3>
                    </div>

                    {profiles.length === 0 ? (
                      <div className="rounded-xl border border-dashed border-dark-850 bg-dark-900/10 p-16 text-center space-y-4">
                        <Cpu className="h-10 w-10 text-dark-500 mx-auto animate-pulse" />
                        <div className="space-y-1">
                          <p className="text-sm font-bold text-white">Aucune clé d'API configurée</p>
                          <p className="text-xs text-dark-400 max-w-sm mx-auto leading-relaxed">
                            Renseignez une clé API de fournisseur ou un endpoint local pour pouvoir planifier et générer vos cours.
                          </p>
                        </div>
                        <button
                          onClick={openAddForm}
                          className="inline-flex items-center gap-1.5 rounded-md bg-zinc-200 hover:bg-zinc-300 px-4 py-2 text-xs font-semibold text-zinc-950 transition-all cursor-pointer"
                        >
                          <Plus className="h-3.5 w-3.5" />
                          Ajouter ma première clé
                        </button>
                      </div>
                    ) : (
                      <div className="grid gap-4">
                        {profiles.map((profile) => {
                          const isActive = profile.id === activeProfileId;
                          const isKeyVisible = !!visibleKeys[profile.id];
                          const isCopied = copiedId === profile.id;
                          return (
                            <div
                              key={profile.id}
                              className={`rounded-md border transition-all duration-300 ${
                                isActive 
                                  ? 'bg-zinc-900 border-zinc-750/80 shadow-sm' 
                                  : 'bg-dark-900/40 border-dark-900 hover:bg-dark-900/60 hover:border-dark-850'
                              } p-5 flex flex-col md:flex-row md:items-center justify-between gap-5`}
                            >
                              <div className="space-y-3 flex-grow max-w-full">
                                <div className="flex items-center gap-3 flex-wrap">
                                  <h4 className="text-xs font-bold text-white tracking-tight">{profile.name}</h4>
                                  {getProviderBadge(profile.type)}
                                  {isActive && (
                                    <span className="flex items-center gap-1 text-[8px] px-2 py-0.5 rounded font-extrabold uppercase tracking-wider bg-zinc-800 text-zinc-300 border border-zinc-750/50">
                                      <CheckCircle2 className="h-3 w-3" />
                                      Sélectionnée par défaut
                                    </span>
                                  )}
                                </div>
                                
                                <div className="grid grid-cols-1 gap-2 text-xs text-dark-400 font-mono">
                                  {/* API KEY DISPLAY PANEL - FULL WIDTH & NO TRUNCATION */}
                                  <div className="flex items-center gap-2 overflow-visible bg-dark-950/60 p-2.5 rounded-md border border-zinc-800/80">
                                    <span className="text-zinc-500 shrink-0 select-none uppercase font-bold text-[9px] tracking-wider w-16">Clé:</span>
                                    <span className="text-zinc-200 select-all select-text font-mono break-all leading-normal flex-1">
                                      {profile.api_key 
                                        ? (isKeyVisible ? profile.api_key : '••••••••••••••••••••••••••••••••')
                                        : <em className="text-dark-600 font-sans font-light">Aucune clé d'authentification</em>
                                      }
                                    </span>
                                    {profile.api_key && (
                                      <div className="flex items-center gap-1.5 shrink-0 select-none ml-2">
                                        <button
                                          type="button"
                                          onClick={() => toggleKeyVisibility(profile.id)}
                                          className="text-dark-500 hover:text-white transition-colors p-1.5 hover:bg-dark-800/60 rounded-md border border-transparent hover:border-dark-850"
                                          title={isKeyVisible ? "Masquer la clé" : "Afficher la clé"}
                                        >
                                          {isKeyVisible ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => handleCopyKey(profile.id, profile.api_key)}
                                          className="text-dark-500 hover:text-white transition-colors p-1.5 hover:bg-dark-800/60 rounded-md border border-transparent hover:border-dark-850"
                                          title="Copier la clé"
                                        >
                                          {isCopied ? <Check className="h-3.5 w-3.5 text-emerald-500 animate-pulse" /> : <Copy className="h-3.5 w-3.5" />}
                                        </button>
                                      </div>
                                    )}
                                  </div>
                                  {profile.base_url && (
                                    <div className="flex items-center gap-2 overflow-visible bg-dark-950/60 p-2.5 rounded-md border border-zinc-800/80">
                                      <span className="text-zinc-500 shrink-0 select-none uppercase font-bold text-[9px] tracking-wider w-16">Endpoint:</span>
                                      <span className="text-zinc-200 select-all select-text font-mono break-all leading-normal flex-1">{profile.base_url}</span>
                                    </div>
                                  )}
                                </div>
                              </div>

                              <div className="flex items-center gap-2 justify-end shrink-0 pt-3 md:pt-0 border-t border-dark-800 md:border-none">
                                {!isActive && (
                                  <button
                                    onClick={() => handleActivate(profile.id)}
                                    className="flex items-center gap-1.5 rounded-md border border-zinc-800 bg-transparent text-zinc-300 hover:bg-zinc-800 hover:text-white transition-all text-xs font-semibold px-4 py-2 cursor-pointer shadow-sm animate-fadeIn"
                                  >
                                    <Power className="h-3.5 w-3.5" />
                                    Activer
                                  </button>
                                )}
                                <button
                                  onClick={() => openEditForm(profile)}
                                  className="flex items-center justify-center h-9 w-9 rounded-md border border-dark-900 bg-dark-800/40 hover:bg-dark-800 text-dark-300 hover:text-white transition-all cursor-pointer"
                                  title="Modifier"
                                >
                                  <Edit3 className="h-4 w-4" />
                                </button>
                                <button
                                  onClick={() => handleDelete(profile.id)}
                                  className="flex items-center justify-center h-9 w-9 rounded-md border border-dark-900 bg-dark-800/40 hover:bg-rose-950/40 hover:border-rose-500/40 text-dark-400 hover:text-rose-400 transition-all cursor-pointer"
                                  title="Supprimer"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Form panel */}
                    {isFormOpen && (
                      <div className="rounded-md border border-zinc-850 bg-dark-900/60 p-6 space-y-6 shadow-2xl shadow-black/50 animate-slideDown">
                        <div className="flex items-center justify-between border-b border-zinc-850/60 pb-3.5">
                          <div className="flex items-center gap-2">
                            <Sparkles className="h-4 w-4 text-white" />
                            <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                              {editingProfileId ? 'Modifier les identifiants' : 'Ajouter des accès API'}
                            </h3>
                          </div>
                          <button
                            onClick={closeForm}
                            className="text-dark-400 hover:text-white p-1 rounded hover:bg-dark-800 transition-colors"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>

                        <form onSubmit={handleFormSubmit} className="space-y-6">
                          <div className="space-y-2">
                            <label className="text-[10px] font-bold text-white uppercase tracking-wider">Fournisseur d'API</label>
                            <div className="grid grid-cols-2 sm:grid-cols-6 gap-2">
                              {['gemini', 'openrouter', 'openai', 'ollama', 'aws_bedrock', 'custom'].map((t) => (
                                <button
                                  key={t}
                                  type="button"
                                  onClick={() => handleTypeChange(t)}
                                  className={`py-2 px-2.5 rounded-md border text-center transition-all cursor-pointer text-xs font-semibold leading-tight ${
                                    formType === t 
                                      ? 'bg-zinc-800 border-zinc-700 text-zinc-100 font-bold shadow-sm' 
                                      : 'bg-dark-800/40 border-dark-850 text-dark-300 hover:bg-dark-800'
                                  }`}
                                >
                                  <span className="block capitalize">{t === 'gemini' ? 'Gemini' : t === 'aws_bedrock' ? 'Bedrock' : t}</span>
                                </button>
                              ))}
                            </div>
                          </div>

                          <div className="space-y-4">
                            {/* Nom */}
                            <div className="space-y-1.5">
                               <label htmlFor="formName" className="text-xs font-semibold text-white">Nom du profil de clé</label>
                              <input
                                type="text"
                                id="formName"
                                value={formName}
                                onChange={(e) => setFormName(e.target.value)}
                                placeholder="Ex: Clé Gemini Pro Directe, Clé OpenRouter Principal..."
                                className="w-full rounded-md border border-dark-900 bg-dark-950 px-4 py-2.5 text-xs text-white placeholder-dark-500 focus:border-zinc-700 focus:outline-none transition-all font-sans"
                                required
                              />
                            </div>

                            {/* API Key */}
                            <div className="space-y-1.5">
                              <div className="flex items-center justify-between">
                                <label htmlFor="formApiKey" className="text-xs font-semibold text-white">
                                  {formType === 'aws_bedrock' ? 'Identifiants AWS (AccessKey:SecretKey)' : "Clé d'API (API Key)"}
                                </label>
                                <span className="text-[9px] text-dark-500 font-mono">
                                  {formType === 'aws_bedrock' 
                                    ? 'Format: ACCESS_KEY:SECRET_KEY' 
                                    : formType === 'ollama' 
                                      ? 'Facultatif pour Ollama local' 
                                      : ''}
                                </span>
                              </div>
                              <div className="relative">
                                <input
                                  type={showFormKey ? 'text' : 'password'}
                                  id="formApiKey"
                                  value={formApiKey}
                                  onChange={(e) => setFormApiKey(e.target.value)}
                                  placeholder={formType === 'aws_bedrock' ? "AKIAIOSFODNN7EXAMPLE:wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY" : "Collez votre jeton d'authentification ici..."}
                                  className="w-full rounded-md border border-dark-900 bg-dark-950 px-4 py-2.5 pr-10 text-xs text-white placeholder-dark-500 focus:border-zinc-700 focus:outline-none font-mono transition-all"
                                />
                                <button
                                  type="button"
                                  onClick={() => setShowFormKey(!showFormKey)}
                                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-dark-400 hover:text-white transition-colors"
                                >
                                  {showFormKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                </button>
                              </div>
                            </div>

                            {/* Base URL */}
                            {(formType === 'ollama' || formType === 'custom' || formType === 'openai' || formType === 'openrouter' || formType === 'aws_bedrock') && (
                              <div className="space-y-1.5">
                                <label htmlFor="formBaseUrl" className="text-xs font-semibold text-white">
                                  {formType === 'aws_bedrock' ? 'Région AWS (Ex: us-east-1)' : 'URL racine (Base URL)'}
                                </label>
                                <input
                                  type="text"
                                  id="formBaseUrl"
                                  value={formBaseUrl}
                                  onChange={(e) => setFormBaseUrl(e.target.value)}
                                  placeholder={formType === 'aws_bedrock' ? 'us-east-1' : 'Saisir l\'URL de base...'}
                                  className="w-full rounded-md border border-dark-900 bg-dark-950 px-4 py-2.5 text-xs text-white focus:border-zinc-700 focus:outline-none font-mono transition-all"
                                />
                              </div>
                            )}
                          </div>

                          <div className="flex items-center justify-end gap-2.5 pt-1">
                            <button
                              type="button"
                              onClick={closeForm}
                              className="rounded-md border border-zinc-850 bg-transparent px-4 py-2 text-xs font-semibold text-dark-200 hover:bg-dark-800/40 transition-all cursor-pointer"
                            >
                              Annuler
                            </button>
                            <button
                              type="submit"
                              disabled={saving}
                              className="flex items-center gap-1.5 rounded-md bg-zinc-200 hover:bg-zinc-300 px-5 py-2 text-xs font-semibold text-zinc-950 transition-all disabled:opacity-50 cursor-pointer shadow-sm"
                            >
                              {saving ? <span className="h-3.5 w-3.5 rounded-full border-2 border-zinc-950/20 border-t-zinc-950 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                              Enregistrer
                            </button>
                          </div>
                        </form>
                      </div>
                    )}

                    {/* Data Storage directory display */}
                    <div className="rounded-md border border-zinc-850 bg-dark-900/40 p-5 space-y-4">
                      <div className="flex items-center gap-2 border-b border-zinc-850 pb-3">
                        <Database className="h-4 w-4 text-white" />
                        <h3 className="text-xs font-bold text-white uppercase tracking-wider">Persistance locale des cours</h3>
                      </div>
                      <div className="space-y-2 text-xs">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="font-bold text-white uppercase tracking-wider text-[9px] text-dark-400">Volume de stockage monté</span>
                          <span className="font-mono text-dark-500">DATA_DIR</span>
                        </div>
                        <div className="rounded-md bg-dark-950 border border-zinc-800/80 p-3 font-mono text-[11px] text-zinc-400 select-all font-bold">
                          {dataDir || '/SelfLearned_Data'}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* 2. System Prompt Section */}
                {activeSection === 'system_prompt' && (
                  <div className="space-y-8 animate-fadeIn">
                    {/* Prompt templates manager section */}
                    <div className="space-y-6">
                      <div className="flex items-center justify-between border-b border-dark-900/60 pb-3.5">
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-white" />
                          <h3 className="text-xs font-bold text-white uppercase tracking-wider">Gabarits de Prompts Système</h3>
                        </div>
                        {!isTplFormOpen && (
                          <button
                            type="button"
                            onClick={openAddTplForm}
                            className="flex items-center gap-1.5 rounded-md bg-dark-800 border border-dark-750 text-zinc-200 hover:bg-dark-750 hover:text-white px-4 py-2 text-xs font-semibold transition-all shadow-sm cursor-pointer"
                          >
                            <Plus className="h-3.5 w-3.5" />
                            Créer un gabarit
                          </button>
                        )}
                      </div>

                      <div className="flex gap-3 items-start text-xs text-zinc-300 bg-zinc-900/40 border border-dark-850 rounded-md p-5 leading-relaxed">
                        <AlertCircle className="h-4 w-4 text-zinc-400 shrink-0 mt-0.5" />
                        <div>
                          <p className="font-semibold text-white mb-1">Gabarits de prompts système</p>
                          <p>
                            Ces profils de rédaction permettent de modifier le rôle de l'IA (Professeur, Développeur senior, etc.) lors de la génération. Vous pouvez créer autant de profils de prompts système que vous le désirez et les sélectionner au moment de créer un cours.
                          </p>
                        </div>
                      </div>

                      {/* inline form for template add/edit */}
                      {isTplFormOpen && (
                        <div className="rounded-md border border-dark-850 bg-dark-900/60 p-6 space-y-5 shadow-2xl shadow-black/50 animate-slideDown">
                          <div className="flex items-center justify-between border-b border-zinc-850/60 pb-3">
                            <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                              {editingTplId ? 'Modifier le gabarit' : 'Nouveau gabarit de rédaction'}
                            </h4>
                            <button
                              type="button"
                              onClick={closeTplForm}
                              className="text-dark-400 hover:text-white p-1 rounded hover:bg-dark-800 transition-colors"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </div>

                          <form onSubmit={handleTplFormSubmit} className="space-y-4">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                              <div className="space-y-1.5">
                                <label htmlFor="tplName" className="text-xs font-semibold text-white">Nom du gabarit</label>
                                <input
                                  type="text"
                                  id="tplName"
                                  value={tplName}
                                  onChange={(e) => setTplName(e.target.value)}
                                  placeholder="Ex: Professeur de Mathématiques, Tuteur de Code..."
                                  className="w-full rounded-md border border-dark-900 bg-dark-950 px-4 py-2.5 text-xs text-white focus:border-zinc-700 focus:outline-none transition-all"
                                  required
                                />
                              </div>
                              <div className="space-y-1.5">
                                <label htmlFor="tplDescription" className="text-xs font-semibold text-white">Description rapide</label>
                                <input
                                  type="text"
                                  id="tplDescription"
                                  value={tplDescription}
                                  onChange={(e) => setTplDescription(e.target.value)}
                                  placeholder="Ex: Style académique rigoureux pour cours de fondation..."
                                  className="w-full rounded-md border border-dark-900 bg-dark-950 px-4 py-2.5 text-xs text-white focus:border-zinc-700 focus:outline-none transition-all"
                                />
                              </div>
                            </div>

                            <div className="space-y-2">
                              <div className="flex items-center justify-between">
                                <label htmlFor="tplContent" className="text-xs font-semibold text-white">Prompt système (Instructions globales)</label>
                                <div className="flex items-center gap-2">
                                  <input
                                    type="file"
                                    accept=".txt"
                                    onChange={importSystemPrompt}
                                    className="hidden"
                                    ref={fileInputRef}
                                  />
                                  <button
                                    type="button"
                                    onClick={() => fileInputRef.current?.click()}
                                    className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-dark-950 border border-dark-850 text-[10px] font-bold text-zinc-300 hover:text-white"
                                  >
                                    <Upload className="h-2.5 w-2.5 text-zinc-400" />
                                    Importer (.txt)
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => exportSystemPrompt(tplContent, `${tplName || 'system_prompt'}.txt`)}
                                    className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-dark-950 border border-dark-850 text-[10px] font-bold text-zinc-300 hover:text-white"
                                    disabled={!tplContent}
                                  >
                                    <Download className="h-2.5 w-2.5 text-zinc-400" />
                                    Exporter
                                  </button>
                                </div>
                              </div>
                              <div className="rounded-md border border-dark-900 bg-dark-950 p-2 focus-within:border-zinc-700 transition-colors">
                                <textarea
                                  id="tplContent"
                                  value={tplContent}
                                  onChange={(e) => setTplContent(e.target.value)}
                                  rows={12}
                                  placeholder="Rôle : Tu es un professeur d'université... Rédige le chapitre de cours..."
                                  className="w-full bg-transparent border-none text-xs leading-relaxed text-white focus:outline-none p-2 resize-y font-mono select-text"
                                  required
                                />
                              </div>
                            </div>

                            <div className="flex items-center justify-end gap-2.5 pt-1">
                              <button
                                type="button"
                                onClick={closeTplForm}
                                className="rounded-md border border-dark-850 bg-transparent px-4 py-2.5 text-xs font-semibold text-zinc-200 hover:bg-dark-800/40 transition-all cursor-pointer"
                              >
                                Annuler
                              </button>
                              <button
                                type="submit"
                                disabled={saving}
                                className="flex items-center gap-1.5 rounded-md bg-dark-800 border border-dark-750 text-zinc-200 hover:bg-dark-750 hover:text-white px-5 py-2.5 text-xs font-semibold transition-all disabled:opacity-50 cursor-pointer shadow-sm"
                              >
                                {saving ? <span className="h-3.5 w-3.5 rounded-full border-2 border-zinc-950/20 border-t-zinc-950 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                                Enregistrer
                              </button>
                            </div>
                          </form>
                        </div>
                      )}

                      {/* List of prompt templates */}
                      <div className="grid grid-cols-1 gap-4">
                        {loadingPrompt ? (
                          <div className="flex flex-col items-center justify-center py-20 space-y-3">
                            <span className="h-6 w-6 rounded-full border-2 border-zinc-800/20 border-t-zinc-400 animate-spin" />
                            <p className="text-[11px] text-dark-500 font-mono">Chargement des gabarits...</p>
                          </div>
                        ) : (
                          Object.entries(templates).map(([id, tpl]) => (
                            <div
                              key={id}
                              className="rounded-md border border-dark-850 bg-dark-900/40 hover:bg-dark-900/60 transition-all duration-300 p-5 flex flex-col gap-3.5 shadow-sm"
                            >
                              <div className="flex items-center justify-between flex-wrap gap-2">
                                <div className="flex items-center gap-2.5">
                                  <span className="text-xs font-bold text-white">{tpl.name}</span>
                                  <span className="text-[9px] font-mono font-bold text-zinc-300 bg-dark-800 border border-dark-850 px-2 py-0.5 rounded">
                                    {id}
                                  </span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <button
                                    onClick={() => openEditTplForm(id, tpl)}
                                    className="flex items-center justify-center h-8 w-8 rounded-md border border-dark-900 bg-dark-800/40 hover:bg-dark-800 text-dark-300 hover:text-white transition-all cursor-pointer"
                                    title="Modifier"
                                  >
                                    <Edit3 className="h-3.5 w-3.5" />
                                  </button>
                                  <button
                                    onClick={() => handleDeleteTpl(id)}
                                    className="flex items-center justify-center h-8 w-8 rounded-md border border-dark-900 bg-dark-800/40 hover:bg-rose-950/40 hover:border-rose-500/40 text-dark-400 hover:text-rose-400 transition-all cursor-pointer"
                                    title="Supprimer"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </button>
                                </div>
                              </div>

                              {tpl.description && (
                                <p className="text-xs text-dark-400 italic leading-relaxed">
                                  {tpl.description}
                                </p>
                              )}

                              <div className="rounded-md bg-dark-950 border border-dark-850 p-4 font-mono text-[10px] leading-relaxed text-dark-300 select-text max-h-40 overflow-y-auto shadow-inner relative">
                                <span className="text-dark-500 select-none block border-b border-dark-900 pb-1.5 mb-2 font-bold">// Aperçu des directives du prompt :</span>
                                <pre className="font-mono text-zinc-200 whitespace-pre-wrap leading-normal font-medium">{tpl.content}</pre>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>

                    {/* Levels / prompt categories manager section */}
                    <div className="pt-8 border-t border-dark-850 space-y-6">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Layers className="h-4 w-4 text-white" />
                          <h3 className="text-xs font-bold text-white uppercase tracking-wider">Directives par Niveau / Catégorie d'apprentissage</h3>
                        </div>
                        {!isCatFormOpen && (
                          <button
                            type="button"
                            onClick={openAddCatForm}
                            className="flex items-center gap-1.5 rounded-md bg-dark-800 border border-dark-750 text-zinc-200 hover:bg-dark-750 hover:text-white px-3.5 py-2 text-xs font-semibold transition-all shadow-sm cursor-pointer"
                          >
                            <Plus className="h-3.5 w-3.5" />
                            Ajouter un niveau
                          </button>
                        )}
                      </div>

                      {/* inline form for category add/edit */}
                      {isCatFormOpen && (
                        <div className="rounded-md border border-zinc-850 bg-dark-900/60 p-6 space-y-4 shadow-2xl shadow-black/40 animate-slideDown">
                          <div className="flex items-center justify-between border-b border-zinc-850/60 pb-2.5">
                            <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                              {editingCatId ? 'Modifier la catégorie' : 'Nouvelle catégorie de prompt'}
                            </h4>
                            <button
                              type="button"
                              onClick={closeCatForm}
                              className="text-dark-400 hover:text-white p-1 rounded hover:bg-dark-800 transition-colors"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </div>

                          <form onSubmit={handleCatFormSubmit} className="space-y-4">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                              <div className="space-y-1.5">
                                <label htmlFor="catName" className="text-xs font-semibold text-white">Nom du niveau / catégorie</label>
                                <input
                                  type="text"
                                  id="catName"
                                  value={catName}
                                  onChange={(e) => setCatName(e.target.value)}
                                  placeholder="Ex: Débutant, Master Spécialisé, Expert..."
                                  className="w-full rounded-md border border-dark-900 bg-dark-950 px-4 py-2.5 text-xs text-white focus:border-zinc-700 focus:outline-none transition-all"
                                  required
                                />
                              </div>
                              <div className="space-y-1.5">
                                <label htmlFor="catDescription" className="text-xs font-semibold text-white">Description rapide</label>
                                <input
                                  type="text"
                                  id="catDescription"
                                  value={catDescription}
                                  onChange={(e) => setCatDescription(e.target.value)}
                                  placeholder="Ex: Pour les apprenants sans bases théoriques..."
                                  className="w-full rounded-md border border-dark-900 bg-dark-950 px-4 py-2.5 text-xs text-white focus:border-zinc-700 focus:outline-none transition-all"
                                />
                              </div>
                            </div>

                            <div className="space-y-1.5">
                              <label htmlFor="catDirective" className="text-xs font-semibold text-white">Directives d'apprentissage (Prompt additionnel)</label>
                              <div className="rounded-md border border-dark-900 bg-dark-950 p-2 focus-within:border-zinc-700 transition-colors">
                                <textarea
                                  id="catDirective"
                                  value={catDirective}
                                  onChange={(e) => setCatDirective(e.target.value)}
                                  rows={4}
                                  placeholder="Ex: Le public cible est novice. Vulgarise tous les termes techniques..."
                                  className="w-full bg-transparent border-none text-xs leading-relaxed text-white focus:outline-none p-2 resize-y font-mono select-text"
                                  required
                                />
                              </div>
                            </div>

                            <div className="flex items-center justify-end gap-2.5 pt-1">
                              <button
                                type="button"
                                onClick={closeCatForm}
                                className="rounded-md border border-dark-850 bg-transparent px-4 py-2.5 text-xs font-semibold text-zinc-200 hover:bg-dark-800/40 transition-all cursor-pointer"
                              >
                                Annuler
                              </button>
                              <button
                                type="submit"
                                disabled={saving}
                                className="flex items-center gap-1.5 rounded-md bg-dark-800 border border-dark-750 text-zinc-200 hover:bg-dark-750 hover:text-white px-5 py-2.5 text-xs font-semibold transition-all disabled:opacity-50 cursor-pointer shadow-sm"
                              >
                                {saving ? <span className="h-3.5 w-3.5 rounded-full border-2 border-zinc-950/20 border-t-zinc-950 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                                Enregistrer
                              </button>
                            </div>
                          </form>
                        </div>
                      )}

                      {/* List of prompt categories */}
                      <div className="grid grid-cols-1 gap-4">
                        {Object.entries(categories).map(([id, cat]) => (
                          <div
                            key={id}
                            className="rounded-md border border-dark-850 bg-dark-900/40 hover:bg-dark-900/60 transition-all duration-300 p-5 flex flex-col gap-3 shadow-sm"
                          >
                            <div className="flex items-center justify-between flex-wrap gap-2">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-bold text-white">{cat.name}</span>
                                <span className="text-[9px] font-mono font-bold text-zinc-300 bg-dark-800 border border-dark-850 px-2 py-0.5 rounded">
                                  {id}
                                </span>
                              </div>
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => openEditCatForm(id, cat)}
                                  className="flex items-center justify-center h-8 w-8 rounded-md border border-dark-900 bg-dark-800/40 hover:bg-dark-800 text-dark-300 hover:text-white transition-all cursor-pointer"
                                  title="Modifier"
                                >
                                  <Edit3 className="h-3.5 w-3.5" />
                                </button>
                                <button
                                  onClick={() => handleDeleteCat(id)}
                                  className="flex items-center justify-center h-8 w-8 rounded-md border border-dark-900 bg-dark-800/40 hover:bg-rose-950/40 hover:border-rose-500/40 text-dark-400 hover:text-rose-400 transition-all cursor-pointer"
                                  title="Supprimer"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            </div>

                            {cat.description && (
                              <p className="text-xs text-dark-400 italic leading-relaxed">
                                {cat.description}
                              </p>
                            )}

                            <div className="rounded-md bg-dark-950 border border-dark-850 p-4 font-mono text-[10px] leading-relaxed text-dark-300 select-text break-words shadow-inner">
                              <span className="text-dark-500 select-none font-bold block border-b border-dark-900 pb-1.5 mb-2">// Directives pédagogiques injectées :</span>
                              <p className="mt-1 font-sans text-zinc-200 leading-normal">{cat.directive}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {activeSection === 'personalization' && (
                  <div className="space-y-8 animate-fadeIn">
                    {/* Intro Tip */}
                    <div className="flex gap-3 items-start text-xs text-zinc-300 bg-zinc-900/40 border border-dark-850 rounded-md p-5 leading-relaxed">
                      <Palette className="h-4 w-4 text-zinc-400 shrink-0 mt-0.5" />
                      <div>
                        <p className="font-semibold text-white mb-1">Personnalisation esthétique de l'application</p>
                        <p>
                          Configurez les teintes visuelles de SelfLearned pour qu'elle s'harmonise avec vos outils de travail préférés comme <strong>Zed</strong> ou <strong>Antigravity</strong>. Vous pouvez modifier chaque couleur, charger un fond d'écran flouté et importer/exporter vos thèmes en JSON.
                        </p>
                      </div>
                    </div>

                    {/* Presets Grid */}
                    <div className="space-y-4">
                      <h3 className="text-xs font-bold text-white uppercase tracking-wider">Thèmes Prédéfinis (Presets)</h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                        {[
                          { id: 'google_ai_studio', name: 'Google AI Studio', desc: 'Design gris sombre, sobre et neutre', bg: '#09090b', sidebar: '#121214', accent: '#3b82f6' },
                          { id: 'zed_dark', name: 'Zed Dark (Comfort Zinc)', desc: 'Gris zinc doux de l\'éditeur Zed IDE', bg: '#18181b', sidebar: '#202022', accent: '#4f46e5' },
                          { id: 'antigravity', name: 'Antigravity (Graphite Neon)', desc: 'Profond gris graphite et vert émeraude', bg: '#0f172a', sidebar: '#0b0f19', accent: '#10b981' },
                          { id: 'dracula', name: 'Dracula (Vampire Purple)', desc: 'Teintes cyber-violacées rétro', bg: '#282a36', sidebar: '#1e1f29', accent: '#bd93f9' },
                          { id: 'nordic_frost', name: 'Nordic Frost (Polar Ice)', desc: 'Gris ardoise froid scandinave', bg: '#1a202c', sidebar: '#2d3748', accent: '#3182ce' }
                        ].map((tpl) => {
                          const isActivePreset = preset === tpl.id;
                          return (
                            <div
                              key={tpl.id}
                              onClick={() => setThemePreset(tpl.id as any)}
                              className={`group rounded-md border transition-all duration-300 p-4 flex flex-col justify-between gap-4 cursor-pointer ${
                                isActivePreset 
                                  ? 'bg-zinc-900 border-dark-750 shadow-sm' 
                                  : 'bg-dark-900/40 border-dark-900 hover:bg-dark-900/60 hover:border-dark-850'
                              }`}
                            >
                              <div className="space-y-1">
                                <div className="flex items-center justify-between">
                                  <span className="text-xs font-semibold text-white">{tpl.name}</span>
                                  {isActivePreset && (
                                    <span className="h-2 w-2 rounded-full bg-white animate-pulse" />
                                  )}
                                </div>
                                <p className="text-[10px] text-dark-400 line-clamp-1 leading-normal">{tpl.desc}</p>
                              </div>
                              {/* Visual Color split preview block */}
                              <div className="h-10 rounded-md overflow-hidden flex border border-dark-850 bg-dark-950 p-0.5 select-none">
                                <div className="flex-1 rounded" style={{ backgroundColor: tpl.bg }} title="Main BG" />
                                <div className="w-8" style={{ backgroundColor: tpl.sidebar }} title="Sidebar" />
                                <div className="w-4 rounded" style={{ backgroundColor: tpl.accent }} title="Accent" />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Split View: Custom Customizer (Left) vs Wallpaper & JSON (Right) */}
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                      
                      {/* Left: Custom Color Pickers */}
                      <div className="lg:col-span-7 space-y-4">
                        <h3 className="text-xs font-bold text-white uppercase tracking-wider">Créateur de Thème Personnalisé</h3>
                        <div className="rounded-md border border-dark-850 bg-dark-900/40 p-5 space-y-4 shadow-sm backdrop-blur-sm">
                          <p className="text-[10px] text-dark-400 leading-relaxed">
                            Ajustez individuellement chaque variable chromatique de l'interface. Toute modification vous basculera instantanément en mode <strong>"Sur Mesure"</strong> et mettra à jour l'application en direct.
                          </p>
                          
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-2">
                            {([
                              { label: 'Fond principal (Main BG)', prop: '--bg-main' },
                              { label: 'Barre latérale (Sidebar)', prop: '--bg-sidebar' },
                              { label: 'Cartes & Vignettes (Card BG)', prop: '--bg-card' },
                              { label: 'Contours & Bordures (Borders)', prop: '--border-color' },
                              { label: 'Texte principal (Text Main)', prop: '--text-main' },
                              { label: 'Accent principal (Brand Accent)', prop: '--color-brand' }
                            ] as const).map((colorVar) => {
                              const val = themeProperties[colorVar.prop];
                              return (
                                <div key={colorVar.prop} className="flex items-center justify-between p-2.5 rounded-md bg-dark-950/60 border border-dark-850">
                                  <div className="space-y-0.5 pr-2">
                                    <span className="text-[10px] font-semibold text-white block">{colorVar.label}</span>
                                    <span className="text-[9px] font-mono text-zinc-500 font-bold block">{val}</span>
                                  </div>
                                  <div className="relative h-9 w-9 rounded-md overflow-hidden border border-zinc-800 shrink-0 cursor-pointer flex items-center justify-center bg-dark-900 hover:bg-dark-800 transition-colors">
                                    <input
                                      type="color"
                                      value={val.startsWith('#') && val.length === 7 ? val : '#3b82f6'}
                                      onChange={(e) => {
                                        updateThemeProperty(colorVar.prop, e.target.value);
                                        // Auto update hover/dark branding variants if brand accent is changed
                                        if (colorVar.prop === '--color-brand') {
                                          updateThemeProperty('--color-brand-hover', e.target.value + 'cc'); // opacity 80%
                                          updateThemeProperty('--color-brand-dark', e.target.value + 'ee');
                                        }
                                      }}
                                      className="absolute inset-0 opacity-0 cursor-pointer h-full w-full"
                                    />
                                    <div className="h-5 w-5 rounded border border-white/10 shadow-sm" style={{ backgroundColor: val }} />
                                  </div>
                                </div>
                              );
                            })}
                          </div>

                          {preset === 'custom' && (
                            <div className="pt-2 flex justify-end">
                              <button
                                onClick={() => setThemePreset('google_ai_studio')}
                                className="text-[10px] font-bold text-rose-400 hover:text-white transition-colors bg-rose-500/10 hover:bg-rose-600 border border-rose-500/20 rounded-md px-3 py-1.5 cursor-pointer uppercase font-mono tracking-wider"
                              >
                                Réinitialiser le Thème
                              </button>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Right: Background image & JSON */}
                      <div className="lg:col-span-5 space-y-6">
                        
                        {/* Wallpaper Settings */}
                        <div className="space-y-4">
                          <h3 className="text-xs font-bold text-white uppercase tracking-wider">Fond d'écran et Ambiance</h3>
                          <div className="rounded-md border border-dark-850 bg-dark-900/40 p-5 space-y-4 shadow-sm backdrop-blur-sm">
                            
                            {/* URL Input */}
                            <div className="space-y-1.5">
                              <label className="text-[10px] font-bold text-white uppercase tracking-wider block">URL de l'image de fond</label>
                              <input
                                type="text"
                                placeholder="Insérez le lien HTTP d'un wallpaper..."
                                value={themeProperties['--bg-image'] === 'none' ? '' : themeProperties['--bg-image']}
                                onChange={(e) => {
                                  const url = e.target.value.trim();
                                  updateThemeProperty('--bg-image', url || 'none');
                                }}
                                className="w-full rounded-md border border-zinc-800 bg-dark-950 px-3.5 py-2 text-xs text-white placeholder-dark-500 focus:border-zinc-700 focus:outline-none transition-all font-sans"
                              />
                            </div>

                            {/* Opacity slider */}
                            {themeProperties['--bg-image'] !== 'none' && (
                              <>
                                <div className="space-y-1">
                                  <div className="flex items-center justify-between text-[10px] font-bold text-white">
                                    <span className="uppercase tracking-wider">Opacité de l'image</span>
                                    <span className="font-mono text-zinc-300">{Math.round(parseFloat(themeProperties['--bg-image-opacity']) * 100)}%</span>
                                  </div>
                                  <input
                                    type="range"
                                    min="0"
                                    max="0.8"
                                    step="0.05"
                                    value={parseFloat(themeProperties['--bg-image-opacity']) || 0.1}
                                    onChange={(e) => updateThemeProperty('--bg-image-opacity', e.target.value)}
                                    className="w-full accent-zinc-300 h-1 bg-dark-950 rounded-lg cursor-pointer select-none"
                                  />
                                </div>

                                {/* Blur slider */}
                                <div className="space-y-1">
                                  <div className="flex items-center justify-between text-[10px] font-bold text-white">
                                    <span className="uppercase tracking-wider">Flou d'arrière-plan (Blur)</span>
                                    <span className="font-mono text-zinc-300">{themeProperties['--bg-image-blur']}</span>
                                  </div>
                                  <input
                                    type="range"
                                    min="0"
                                    max="30"
                                    step="1"
                                    value={parseInt(themeProperties['--bg-image-blur']) || 0}
                                    onChange={(e) => updateThemeProperty('--bg-image-blur', e.target.value + 'px')}
                                    className="w-full accent-zinc-300 h-1 bg-dark-950 rounded-lg cursor-pointer select-none"
                                  />
                                </div>
                              </>
                            )}

                          </div>
                        </div>

                        {/* Import/Export Theme */}
                        <div className="space-y-4">
                          <h3 className="text-xs font-bold text-white uppercase tracking-wider">Partager mon Thème (JSON)</h3>
                          <div className="rounded-md border border-dark-850 bg-dark-900/40 p-5 space-y-4 shadow-sm backdrop-blur-sm">
                            <p className="text-[9px] text-dark-500 leading-normal">
                              Copiez le code JSON ci-dessous pour sauvegarder ou partager votre création, ou collez-en un ici pour l'importer immédiatement.
                            </p>
                            
                            <textarea
                              rows={5}
                              readOnly
                              value={exportTheme()}
                              onClick={(e) => (e.target as any).select()}
                              className="w-full rounded-md border border-dark-900 bg-dark-950 p-3 text-[9px] font-mono text-zinc-400 leading-relaxed focus:outline-none resize-none cursor-pointer"
                              title="Cliquez pour sélectionner tout"
                            />

                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => {
                                  try {
                                    navigator.clipboard.writeText(exportTheme());
                                    addToast({ title: 'JSON Copié !', description: 'Le code JSON du thème a été copié dans votre presse-papiers.', type: 'success' });
                                  } catch (err) {
                                    addToast({ title: 'Erreur', description: 'Impossible de copier le code.', type: 'error' });
                                  }
                                }}
                                className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-md border border-zinc-800 hover:border-zinc-700 bg-dark-950 text-[10px] font-bold text-zinc-300 hover:text-white transition-colors"
                              >
                                <Copy className="h-3 w-3" />
                                Copier le JSON
                              </button>
                              
                              <button
                                onClick={() => {
                                  const text = prompt("Collez le code JSON du thème à importer :");
                                  if (text) {
                                    const success = importTheme(text);
                                    if (success) {
                                      addToast({ title: 'Thème Importé !', description: 'Votre thème personnalisé a été chargé avec succès.', type: 'success' });
                                    } else {
                                      alert("Code JSON invalide. Impossible d'importer le thème.");
                                    }
                                  }
                                }}
                                className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-md border border-zinc-800 hover:border-zinc-700 bg-dark-950 text-[10px] font-bold text-zinc-300 hover:text-white transition-colors"
                              >
                                <Upload className="h-3 w-3" />
                                Importer un Thème
                              </button>
                            </div>
                          </div>
                        </div>

                      </div>

                    </div>

                  </div>
                )}
              </>
            )}
          </div>
        </main>
      </div>
    </div>
  );
};

export default Settings;
