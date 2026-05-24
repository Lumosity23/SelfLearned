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
    <div className="prose-custom max-w-none text-dark-200">
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
              <div className="my-6 rounded-lg overflow-hidden border border-dark-900 bg-dark-900 shadow-xl">
                <div className="flex items-center justify-between px-4 py-2 border-b border-dark-900 bg-dark-900 text-xs text-dark-400 font-mono">
                  <span className="font-semibold text-brand-500">{language.toUpperCase()}</span>
                  <button
                    onClick={handleCopy}
                    className="hover:text-white transition-colors bg-dark-800 hover:bg-dark-700 px-2 py-1 rounded text-xs"
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
                    background: '#121214', // dark-900
                    fontSize: '0.875rem',
                    fontFamily: "'JetBrains Mono', ui-monospace, monospace",
                  }}
                >
                  {codeString}
                </SyntaxHighlighter>
              </div>
            ) : (
              <code className={`${className || ''} bg-dark-800 text-pink-500 px-1.5 py-0.5 rounded font-mono text-sm`} {...props}>
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
