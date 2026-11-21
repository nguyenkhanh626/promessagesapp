import type { ReactNode } from 'react'

function renderInline(text: string): ReactNode[] {
  const pattern = /(`[^`]+`|\*\*[^*]+\*\*|__[^_]+__|~~[^~]+~~|\*[^*]+\*|_[^_]+_|\[[^\]]+\]\(https?:\/\/[^)\s]+\))/g
  const nodes: ReactNode[] = []
  let lastIndex = 0

  for (const match of text.matchAll(pattern)) {
    const token = match[0]
    const index = match.index ?? 0
    if (index > lastIndex) nodes.push(text.slice(lastIndex, index))
    if (token.startsWith('`')) {
      nodes.push(<code key={index} className="rounded bg-black/10 px-1 py-0.5 font-mono text-[0.9em]">{token.slice(1, -1)}</code>)
    } else if (token.startsWith('**') || token.startsWith('__')) {
      nodes.push(<strong key={index}>{token.slice(2, -2)}</strong>)
    } else if (token.startsWith('~~')) {
      nodes.push(<del key={index}>{token.slice(2, -2)}</del>)
    } else if (token.startsWith('[')) {
      const link = /^\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)$/.exec(token)
      nodes.push(link
        ? <a key={index} href={link[2]} target="_blank" rel="noopener noreferrer" className="underline">{link[1]}</a>
        : token)
    } else {
      nodes.push(<em key={index}>{token.slice(1, -1)}</em>)
    }
    lastIndex = index + token.length
  }
  if (lastIndex < text.length) nodes.push(text.slice(lastIndex))
  return nodes
}

export function AiMessageContent({ content }: { content: string }) {
  const blocks = content.split(/```([^\n]*)\n([\s\S]*?)```/g)
  const output: ReactNode[] = []

  for (let index = 0; index < blocks.length; index += 1) {
    if (index % 3 === 1) {
      const language = blocks[index].trim()
      const code = blocks[index + 1].replace(/\n$/, '')
      output.push(
        <pre key={`code-${index}`} className="my-2 overflow-x-auto rounded-lg bg-[#181818] p-3 text-xs text-gray-100">
          {language && <span className="mb-2 block text-[10px] uppercase text-gray-400">{language}</span>}
          <code>{code}</code>
        </pre>
      )
      index += 1
      continue
    }

    const lines = blocks[index].split('\n')
    let listItems: string[] = []
    const flushList = (key: string) => {
      if (!listItems.length) return
      output.push(
        <ul key={key} className="my-1 list-disc space-y-1 pl-5">
          {listItems.map((item, itemIndex) => <li key={`${key}-${itemIndex}`}>{renderInline(item)}</li>)}
        </ul>
      )
      listItems = []
    }

    lines.forEach((line, lineIndex) => {
      const bullet = /^\s*[-*]\s+(.+)$/.exec(line)
      if (bullet) {
        listItems.push(bullet[1])
        return
      }
      flushList(`list-${index}-${lineIndex}`)
      const heading = /^(#{1,3})\s+(.+)$/.exec(line)
      if (heading) {
        const Heading = heading[1].length === 1 ? 'h3' : heading[1].length === 2 ? 'h4' : 'h5'
        output.push(<Heading key={`heading-${index}-${lineIndex}`} className="my-2 font-semibold">{renderInline(heading[2])}</Heading>)
      } else if (line.trim()) {
        output.push(<p key={`paragraph-${index}-${lineIndex}`} className="my-1 whitespace-pre-wrap">{renderInline(line)}</p>)
      }
    })
    flushList(`list-${index}-end`)
  }

  return <div className="break-words">{output}</div>
}
