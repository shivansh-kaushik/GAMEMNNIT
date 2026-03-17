import React, { useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import mermaid from 'mermaid';
import readmeText from '../../README.md?raw';

const Mermaid = ({ text }: { text: string }) => {
    const [svgContent, setSvgContent] = React.useState<string>('');
    const renderedRef = useRef(false);

    useEffect(() => {
        if (renderedRef.current) return;
        renderedRef.current = true;

        const renderDiagram = async () => {
            if (!text) return;

            try {
                mermaid.initialize({
                    startOnLoad: false,
                    theme: 'dark',
                    securityLevel: 'loose',
                });

                const id = `mermaid-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

                const { svg } = await mermaid.render(id, text);
                setSvgContent(svg);
            } catch (err) {
                console.error("Mermaid error:", err);
                setSvgContent(`<div style="color:#fb7185;">Error rendering diagram</div>`);
            }
        };

        renderDiagram();
    }, [text]);

    return (
        <div
            style={{
                display: 'flex',
                justifyContent: 'center',
                margin: '30px 0',
                background: '#0f172a',
                padding: '20px',
                borderRadius: '8px',
                overflowX: 'auto'
            }}
            dangerouslySetInnerHTML={{ __html: svgContent }}
        />
    );
};

export const ThesisTab: React.FC = () => {
    return (
        <div style={{
            width: '100%',
            height: '100vh',
            background: '#0a0a0a',
            color: '#e2e8f0',
            overflowY: 'auto',
            fontFamily: 'Inter, system-ui, sans-serif',
            padding: '40px 24px 100px 24px',
        }}>
            <div style={{
                maxWidth: '900px',
                margin: '0 auto',
                background: '#111827',
                padding: '40px 50px',
                borderRadius: '12px',
                border: '1px solid #1e293b',
                boxShadow: '0 10px 40px rgba(0,0,0,0.6)',
            }} className="thesis-markdown">
                <style>{`
                    .thesis-markdown h1, .thesis-markdown h2, .thesis-markdown h3, .thesis-markdown h4 {
                        color: #00ff88;
                        margin-top: 32px;
                        margin-bottom: 16px;
                        line-height: 1.3;
                    }
                    .thesis-markdown h1 { font-size: 2.2em; border-bottom: 1px solid #1e293b; padding-bottom: 12px; margin-top: 0; text-align: center; }
                    .thesis-markdown h2 { font-size: 1.8em; border-bottom: 1px solid #1e293b; padding-bottom: 8px; }
                    .thesis-markdown h3 { font-size: 1.4em; color: #e2e8f0; }
                    .thesis-markdown p { line-height: 1.8; margin-bottom: 16px; color: #cbd5e1; font-size: 15px; }
                    .thesis-markdown ul, .thesis-markdown ol { padding-left: 24px; margin-bottom: 20px; color: #cbd5e1; line-height: 1.7; font-size: 15px;}
                    .thesis-markdown li { margin-bottom: 8px; }
                    .thesis-markdown a { color: #38bdf8; text-decoration: none; }
                    .thesis-markdown a:hover { text-decoration: underline; color: #7dd3fc; }
                    .thesis-markdown blockquote {
                        border-left: 4px solid #00ff88;
                        background: rgba(0,255,136,0.05);
                        padding: 16px 20px;
                        margin: 24px 0;
                        font-style: italic;
                        color: #94a3b8;
                        border-radius: 0 8px 8px 0;
                    }
                    .thesis-markdown code {
                        background: #1e293b;
                        padding: 3px 6px;
                        border-radius: 4px;
                        font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
                        font-size: 0.85em;
                        color: #fb7185;
                    }
                    .thesis-markdown pre {
                        background: #0f172a;
                        padding: 20px;
                        border-radius: 8px;
                        overflow-x: auto;
                        border: 1px solid #1e293b;
                        margin-bottom: 24px;
                    }
                    .thesis-markdown pre code {
                        background: transparent;
                        padding: 0;
                        color: #e2e8f0;
                    }
                    .thesis-markdown table {
                        width: 100%;
                        border-collapse: collapse;
                        margin-bottom: 24px;
                        font-size: 14px;
                    }
                    .thesis-markdown th, .thesis-markdown td {
                        border: 1px solid #1e293b;
                        padding: 12px 16px;
                        text-align: left;
                    }
                    .thesis-markdown th {
                        background: #1e293b;
                        color: #00ff88;
                        font-weight: 600;
                    }
                    .thesis-markdown tr:nth-child(even) {
                        background: rgba(255,255,255,0.02);
                    }
                    .thesis-markdown img {
                        max-width: 100%;
                        height: auto;
                        border-radius: 8px;
                        display: inline-block;
                        margin: 0 4px;
                    }
                    .thesis-markdown hr {
                        border: 0;
                        border-top: 1px solid #1e293b;
                        margin: 40px 0;
                    }
                `}</style>
                <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    rehypePlugins={[rehypeRaw]}
                    components={{
                        code({ node, inline, className, children, ...props }: any) {
                            const match = /language-(\w+)/.exec(className || '');
                            if (!inline && match && match[1] === 'mermaid') {
                                const rawText = String(children).trim();
                                return <Mermaid text={rawText} />;
                            }
                            return (
                                <code className={className} {...props}>
                                    {children}
                                </code>
                            );
                        }
                    }}
                >
                    {readmeText}
                </ReactMarkdown>
            </div>
        </div>
    );
};
