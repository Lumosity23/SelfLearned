import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { Sparkles, Brain, Loader2, AlertCircle, RotateCcw } from 'lucide-react';

interface MarkdownViewerProps {
  content: string;
  courseId?: string;
  moduleId?: string;
}

interface InteractiveParagraphProps {
  children: React.ReactNode;
  courseId?: string;
  moduleId?: string;
  savedQuestions?: Array<{ q: string; a: string; selected_text?: string }>;
  onNewQuestionSaved?: (paragraphText: string, question: string, answer: string, selectedText: string) => void;
}

export const InteractiveParagraph: React.FC<InteractiveParagraphProps> = ({ 
  children, 
  courseId, 
  moduleId,
  savedQuestions = [],
  onNewQuestionSaved
}) => {
  const [showInput, setShowInput] = React.useState(false);
  const [question, setQuestion] = React.useState('');
  const [selectedText, setSelectedText] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  
  const [answers, setAnswers] = React.useState<Array<{ q: string; a: string; selected_text?: string }>>([]);
  const [openQAIndex, setOpenQAIndex] = React.useState<number | null>(null);

  // Sync with saved questions from parent
  React.useEffect(() => {
    if (savedQuestions && savedQuestions.length > 0) {
      setAnswers(savedQuestions);
    } else {
      setAnswers([]);
    }
  }, [savedQuestions]);

  // Extract raw text content of paragraph to pass as context
  const paragraphText = React.useMemo(() => {
    const getText = (node: any): string => {
      if (!node) return '';
      if (typeof node === 'string') return node;
      if (Array.isArray(node)) return node.map(getText).join('');
      if (node.props && node.props.children) return getText(node.props.children);
      return '';
    };
    return getText(children).trim();
  }, [children]);

  // If the paragraph is empty or too short, don't show the button
  const isValidParagraph = paragraphText.length > 5;

  const handleMouseUp = () => {
    if (!courseId || !moduleId || !isValidParagraph) return;
    const selection = window.getSelection();
    if (!selection) return;
    const text = selection.toString().trim();
    
    // Only capture if selection is within this paragraph and is of a reasonable size
    if (text.length > 2 && paragraphText.includes(text)) {
      setSelectedText(text);
      setError(null);
      setShowInput(true);
    }
  };

  const handleAsk = async (e?: React.FormEvent, retryParams?: { q: string; s: string }) => {
    if (e) e.preventDefault();
    
    const queryQuestion = retryParams ? retryParams.q : question;
    const querySelection = retryParams ? retryParams.s : selectedText;
    
    if (!queryQuestion.trim() || !courseId || !moduleId) return;

    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/courses/${courseId}/${moduleId}/ask`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          context_paragraph: paragraphText,
          question: queryQuestion,
          selected_text: querySelection
        }),
      });

      if (!response.ok) {
        throw new Error('Le serveur a retourné une erreur lors de la communication avec le professeur.');
      }

      const data = await response.json();
      if (data.success) {
        const newQA = { q: queryQuestion, a: data.answer, selected_text: querySelection };
        const updatedAnswers = [...answers, newQA];
        setAnswers(updatedAnswers);
        
        // Notify parent to persist in parent's state
        if (onNewQuestionSaved) {
          onNewQuestionSaved(paragraphText, queryQuestion, data.answer, querySelection);
        }
        
        setQuestion('');
        setSelectedText('');
        setShowInput(false);
        setOpenQAIndex(updatedAnswers.length - 1); // Auto open the new answer
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Une erreur de connexion est survenue. Veuillez vérifier votre connexion ou le statut de votre conteneur LLM.');
    } finally {
      setLoading(false);
    }
  };

  // Replaces selection texts inside paragraphs with clickable highlight markers
  const renderParagraphContent = () => {
    if (answers.length === 0) {
      return children;
    }
    
    // Filter questions that have a valid highlight present in text
    const activeHighlights = answers
      .map((ans, idx) => ({ ans, idx }))
      .filter(item => item.ans.selected_text && paragraphText.includes(item.ans.selected_text));
      
    if (activeHighlights.length === 0) {
      return children;
    }
    
    // Sort highlights by order of appearance in the text
    const sorted = activeHighlights
      .map(item => ({
        ...item,
        pos: paragraphText.indexOf(item.ans.selected_text!)
      }))
      .filter(item => item.pos !== -1)
      .sort((a, b) => a.pos - b.pos);
      
    const parts: React.ReactNode[] = [];
    let currentPos = 0;
    
    sorted.forEach(({ ans, idx, pos }) => {
      const matchText = ans.selected_text!;
      // Text segment before highlight
      if (pos > currentPos) {
        parts.push(paragraphText.substring(currentPos, pos));
      }
      
      // Interactive highlighted marker
      parts.push(
        <mark
          key={`hl-${idx}`}
          onClick={(e) => {
            e.stopPropagation();
            setOpenQAIndex(openQAIndex === idx ? null : idx);
          }}
          className={`cursor-pointer transition-all font-medium font-sans select-none inline px-1 py-0.5 rounded border-b ${
            openQAIndex === idx 
              ? 'bg-zinc-700/80 border-zinc-550 text-white shadow-sm' 
              : 'bg-zinc-800/60 border-zinc-700/60 text-zinc-200 hover:bg-zinc-750/90 hover:text-white'
          }`}
          title="Cliquez pour afficher l'explication du professeur"
        >
          {matchText}
        </mark>
      );
      
      currentPos = pos + matchText.length;
    });
    
    // Remaining text segment
    if (currentPos < paragraphText.length) {
      parts.push(paragraphText.substring(currentPos));
    }
    
    return parts;
  };

  return (
    <div 
      className="group/p relative my-4 space-y-2 select-text"
      onMouseUp={handleMouseUp}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="leading-relaxed text-zinc-300 text-[14.5px] flex-1 font-sans">
          {renderParagraphContent()}
        </div>
        
        {courseId && moduleId && isValidParagraph && (
          <button
            type="button"
            onClick={() => {
              setSelectedText('');
              setError(null);
              setShowInput(!showInput);
            }}
            className={`shrink-0 p-1.5 rounded-lg border border-zinc-800 bg-zinc-900/80 text-zinc-400 hover:text-white hover:bg-zinc-805 hover:border-zinc-700 transition-all cursor-pointer opacity-0 group-hover/p:opacity-100 shadow-sm flex items-center gap-1 ${
              showInput ? 'opacity-100 border-zinc-700 bg-zinc-800 text-white' : ''
            }`}
            title="Poser une question générale sur ce paragraphe"
          >
            <Sparkles className="h-3.5 w-3.5 text-zinc-400" />
            <span className="text-[10px] font-mono px-0.5">Expliquer</span>
          </button>
        )}
      </div>

      {showInput && (
        <div className="mt-3 animate-in fade-in duration-200 p-3.5 rounded-xl border border-zinc-800 bg-zinc-950/45 space-y-3 max-w-2xl shadow-xl">
          <div className="flex items-center justify-between text-[10px] text-zinc-400 font-mono select-none uppercase tracking-wider">
            <div className="flex items-center gap-1.5">
              <Brain className="h-3.5 w-3.5 text-zinc-500 animate-pulse" />
              <span>{selectedText ? 'Clarifier la sélection' : 'Clarifier le paragraphe'}</span>
            </div>
            {selectedText && (
              <button 
                onClick={() => setSelectedText('')}
                className="text-zinc-500 hover:text-zinc-300 transition-colors cursor-pointer"
              >
                (Tout le paragraphe)
              </button>
            )}
          </div>
          
          {selectedText && (
            <div className="text-xs text-zinc-300 bg-zinc-900/40 p-2.5 rounded-lg border border-zinc-850/60 font-mono italic max-h-24 overflow-y-auto">
              "{selectedText}"
            </div>
          )}

          {error && (
            <div className="p-3 rounded-lg bg-red-950/30 border border-red-900/50 text-xs text-red-400 flex items-start gap-2.5">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <div className="flex-1 space-y-1.5">
                <p>{error}</p>
                <button
                  type="button"
                  onClick={() => handleAsk(undefined, { q: question, s: selectedText })}
                  disabled={loading}
                  className="flex items-center gap-1 text-[11px] font-semibold text-red-300 hover:text-white transition-colors cursor-pointer"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  Réessayer
                </button>
              </div>
            </div>
          )}

          <form onSubmit={(e) => handleAsk(e)} className="flex gap-2">
            <input
              type="text"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder={selectedText ? "Qu'aimeriez-vous éclaircir concernant ce texte surligné ?" : "Qu'aimeriez-vous approfondir ou clarifier ?"}
              className="flex-1 rounded-lg border border-zinc-800 bg-zinc-900/60 px-3 py-1.5 text-xs text-white placeholder-zinc-500 focus:border-zinc-700 focus:outline-none transition-all"
              required
              disabled={loading}
              autoFocus
            />
            <button
              type="submit"
              disabled={loading || !question.trim()}
              className="px-3.5 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-xs text-zinc-200 hover:bg-zinc-800 hover:text-white hover:border-zinc-700 transition-all font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5 cursor-pointer shrink-0"
            >
              {loading ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>Réflexion...</span>
                </>
              ) : (
                <span>Poser</span>
              )}
            </button>
          </form>
        </div>
      )}

      {/* Persistent Answers Accordions */}
      {answers.map((ans, idx) => (
        <div key={idx} className="mt-3 max-w-3xl animate-in slide-in-from-top-2 duration-200">
          <details 
            open={openQAIndex === idx} 
            onClick={(e) => {
              e.preventDefault();
              setOpenQAIndex(openQAIndex === idx ? null : idx);
            }}
            className="group/details rounded-xl border-l-2 border-l-zinc-650 border border-zinc-800 bg-zinc-900/10 hover:bg-zinc-900/15 overflow-hidden transition-all duration-200 shadow-sm"
          >
            <summary className="flex items-center justify-between px-3.5 py-2.5 font-sans text-xs font-semibold text-zinc-300 hover:text-white cursor-pointer select-none">
              <div className="flex items-center gap-2">
                <Brain className="h-3.5 w-3.5 text-zinc-400" />
                <span className="truncate max-w-lg">
                  {ans.selected_text ? `Clarification sur "${ans.selected_text}"` : `Clarification : "${ans.q}"`}
                </span>
              </div>
              <span className="text-[10px] text-zinc-500 font-mono group-open/details:hidden">(Afficher)</span>
              <span className="text-[10px] text-zinc-500 font-mono hidden group-open/details:inline">(Réduire)</span>
            </summary>
            
            <div className="px-4 pb-4 pt-2.5 border-t border-zinc-800/40 text-xs leading-relaxed text-zinc-400 space-y-2.5 bg-zinc-950/25 font-sans select-text">
              <div className="flex items-center gap-1.5 mb-2 font-mono text-[10px] text-zinc-500">
                <span className="font-semibold text-zinc-400">Q:</span>
                <span>{ans.q}</span>
              </div>
              <div className="border-t border-zinc-800/30 pt-2.5">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {ans.a}
                </ReactMarkdown>
              </div>
            </div>
          </details>
        </div>
      ))}
    </div>
  );
};

export const MarkdownViewer: React.FC<MarkdownViewerProps> = ({ content, courseId, moduleId }) => {
  const [allSavedQuestions, setAllSavedQuestions] = React.useState<Record<string, Array<{ q: string; a: string; selected_text?: string }>>>({});

  // 1. Fetch pre-saved questions for this module from questions.json
  React.useEffect(() => {
    if (!courseId || !moduleId) return;
    const fetchSavedQuestions = async () => {
      try {
        const res = await fetch(`/api/courses/${courseId}/${moduleId}/questions`);
        if (res.ok) {
          const data = await res.json();
          setAllSavedQuestions(data || {});
        }
      } catch (err) {
        console.error('Error fetching persistent module questions:', err);
      }
    };
    fetchSavedQuestions();
  }, [courseId, moduleId]);

  // Callback to sync new questions asked in children paragraphs to keep state consistent without reload
  const handleNewQuestionSaved = (paragraphText: string, q: string, a: string, selectedText: string) => {
    setAllSavedQuestions(prev => {
      const prevList = prev[paragraphText] || [];
      return {
        ...prev,
        [paragraphText]: [...prevList, { q, a, selected_text: selectedText }]
      };
    });
  };

  return (
    <div className="prose-custom max-w-none text-zinc-200">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          code({ className, children, ...props }) {
            const match = /language-(\w+)/.exec(className || '');
            const language = match ? match[1] : '';
            const codeString = String(children).replace(/\n$/, '');
            const isInline = !match;

            const [copied, setCopied] = React.useState(false);

            const handleCopy = async () => {
              try {
                await navigator.clipboard.writeText(codeString);
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
              } catch (err) {
                console.error('Failed to copy text: ', err);
              }
            };

            if (!isInline) {
              return (
                <div className="my-6 rounded-xl overflow-hidden bg-zinc-900 border border-zinc-800 shadow-lg">
                  <div className="flex items-center justify-between px-4 py-2 border-b border-zinc-800/80 bg-zinc-950/40 text-xs text-zinc-400 font-mono select-none">
                    <span className="font-semibold text-zinc-300">{language.toLowerCase() || 'code'}</span>
                    <button
                      onClick={handleCopy}
                      className="hover:text-zinc-100 transition-colors bg-zinc-900 hover:bg-zinc-800 px-2.5 py-1 rounded-lg border border-zinc-800/80 text-xs text-zinc-300 cursor-pointer"
                    >
                      {copied ? 'Copié !' : 'Copier'}
                    </button>
                  </div>
                  <SyntaxHighlighter
                    style={vscDarkPlus as any}
                    language={language}
                    PreTag="div"
                    customStyle={{
                      margin: 0,
                      padding: '1.25rem',
                      background: 'transparent',
                      fontSize: '0.85rem',
                      fontFamily: "'JetBrains Mono', ui-monospace, monospace",
                    }}
                  >
                    {codeString}
                  </SyntaxHighlighter>
                </div>
              );
            }

            return (
              <code className={`${className || ''} bg-zinc-900 text-zinc-200 px-1.5 py-0.5 rounded font-mono text-[13px] border-none`} {...props}>
                {children}
              </code>
            );
          },
          p({ children }) {
            // Retrieve plaintext context matching para to load exact Q&As
            const getText = (node: any): string => {
              if (!node) return '';
              if (typeof node === 'string') return node;
              if (Array.isArray(node)) return node.map(getText).join('');
              if (node.props && node.props.children) return getText(node.props.children);
              return '';
            };
            const pText = getText(children).trim();
            const savedList = allSavedQuestions[pText] || [];

            return (
              <InteractiveParagraph 
                courseId={courseId} 
                moduleId={moduleId}
                savedQuestions={savedList}
                onNewQuestionSaved={handleNewQuestionSaved}
              >
                {children}
              </InteractiveParagraph>
            );
          }
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
};

export default MarkdownViewer;
