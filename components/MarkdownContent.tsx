'use client';

import MDEditor from '@uiw/react-md-editor/nohighlight';
import { safeMarkdownUrl } from '@/lib/content';

export default function MarkdownContent({ source }: { source: string }) {
  return (
    <MDEditor.Markdown
      source={source}
      prefixCls=""
      className="text-base leading-8 text-system-secondary [&_p]:mb-6 [&_h1]:mb-4 [&_h1]:mt-10 [&_h1]:font-sans [&_h1]:text-3xl [&_h1]:leading-tight [&_h1]:text-system-primary [&_h2]:mb-4 [&_h2]:mt-10 [&_h2]:font-sans [&_h2]:text-3xl [&_h2]:leading-tight [&_h2]:text-system-primary [&_h3]:mb-3 [&_h3]:mt-8 [&_h3]:text-xl [&_h3]:font-semibold [&_h3]:text-system-primary [&_ul]:mb-6 [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:mb-6 [&_ol]:list-decimal [&_ol]:pl-6 [&_li]:pl-1 [&_a]:text-system-accent [&_a]:underline [&_a]:underline-offset-4 [&_blockquote]:mb-6 [&_blockquote]:border-l-2 [&_blockquote]:border-system-accent [&_blockquote]:pl-5 [&_blockquote]:font-sans [&_blockquote]:text-xl [&_code]:rounded [&_code]:bg-system-surface [&_code]:px-1 [&_code]:font-mono [&_code]:text-sm [&_pre]:mb-6 [&_pre]:overflow-x-auto [&_pre]:rounded-xl [&_pre]:border [&_pre]:border-system-outline [&_pre]:bg-system-surface [&_pre]:p-5 [&_hr]:my-8 [&_hr]:border-system-outline [&_img]:my-6 [&_img]:max-w-full [&_img]:rounded-lg [&_table]:w-full [&_th]:border [&_th]:border-system-outline [&_th]:p-3 [&_th]:text-left [&_td]:border [&_td]:border-system-outline [&_td]:p-3"
      disableCopy
      skipHtml
      urlTransform={safeMarkdownUrl}
      pluginsFilter={(type, plugins) => type === 'rehype' ? [] : plugins}
      components={{
        h1: ({ children }) => <h2>{children}</h2>,
        table: ({ children }) => <div className="mb-6 overflow-x-auto"><table>{children}</table></div>,
      }}
    />
  );
}
