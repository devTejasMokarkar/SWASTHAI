import fs from 'node:fs'
import path from 'node:path'

const GRAPH_REPORT_PATH = path.resolve(process.cwd(), 'graphify-out', 'GRAPH_REPORT.md')

function compactLines(lines: string[], limit: number): string[] {
  return lines
    .map(line => line.trim())
    .filter(Boolean)
    .filter(line => !line.startsWith('---'))
    .slice(0, limit)
}

export function loadProjectGraphContext(): string {
  try {
    const report = fs.readFileSync(GRAPH_REPORT_PATH, 'utf8')
    const godNodesMatch = report.match(/## God Nodes[\s\S]*?(?=\n## |\n# |\s*$)/)
    const communitiesMatch = report.match(/## Communities[\s\S]*?(?=\n## |\n# |\s*$)/)

    const parts: string[] = []
    if (godNodesMatch) {
      const lines = compactLines(godNodesMatch[0].split('\n').slice(1), 10)
      if (lines.length) parts.push(`Graphify God Nodes:\n${lines.join('\n')}`)
    }
    if (communitiesMatch) {
      const lines = compactLines(communitiesMatch[0].split('\n').slice(1), 10)
      if (lines.length) parts.push(`Graphify Communities:\n${lines.join('\n')}`)
    }

    return parts.join('\n\n')
  } catch {
    return ''
  }
}
