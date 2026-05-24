import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';

interface MarkdownViewerProps {
  content: string;
}

export const MarkdownViewer: React.FC<MarkdownViewerProps> = ({ content }) => {
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

            return !isInline ? (
              <div className="my-6 rounded-md overflow-hidden bg-[#1e1e1e] shadow-md border-none">
                <div className="flex items-center justify-between px-4 py-2 bg-[#252526] text-xs text-zinc-400 font-mono select-none">
                  <span className="font-semibold text-zinc-300">{language.toLowerCase()}</span>
                  <button
                    onClick={handleCopy}
                    className="hover:text-zinc-100 transition-colors bg-[#2d2d2d] hover:bg-[#3d3d3d] px-2.5 py-1 rounded text-xs text-zinc-400"
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
                    background: '#1e1e1e',
                    fontSize: '0.85rem',
                    fontFamily: "'JetBrains Mono', ui-monospace, monospace",
                  }}
                >
                  {codeString}
                </SyntaxHighlighter>
              </div>
            ) : (
              <code className={`${className || ''} bg-zinc-900 text-zinc-200 px-1.5 py-0.5 rounded font-mono text-[13px] border-none`} {...props}>
                {children}
              </code>
            );
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
};

export default MarkdownViewer;
