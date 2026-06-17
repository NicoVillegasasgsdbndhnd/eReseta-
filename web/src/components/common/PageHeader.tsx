import type { ReactNode } from 'react'

interface PageHeaderProps {
  title: string
  description?: string
  action?: ReactNode
}

export default function PageHeader({ title, description, action }: PageHeaderProps) {
  return (
    <div className="flex items-start justify-between mb-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight" style={{ color: 'hsl(215 30% 14%)' }}>
          {title}
        </h2>
        {description && (
          <p className="text-sm mt-1" style={{ color: 'hsl(215 16% 45%)' }}>{description}</p>
        )}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  )
}
