import React from 'react'

interface SidebarItemProps {
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>
  label: string
  active?: boolean
  count?: number
  onClick?: () => void
}

export function SidebarItem({
  icon: Icon,
  label,
  active = false,
  count,
  onClick,
}: SidebarItemProps) {
  return (
    <button
      onClick={onClick}
      className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-[13px] transition-colors duration-150 btn-press ${
        active
          ? 'bg-white dark:bg-white/[0.03] text-slate-900 dark:text-slate-100 font-medium shadow-[0_2px_8px_rgba(0,0,0,0.04)] dark:shadow-[0_2px_8px_rgba(0,0,0,0.2)]'
          : 'text-slate-600 dark:text-slate-400 hover:bg-white/50 dark:hover:bg-white/[0.02]'
      }`}
    >
      {active && <span className="w-0.5 h-4 bg-[#5E6AD2] rounded-full -ml-1 mr-1" />}
      <Icon className="h-4 w-4" strokeWidth={1.5} />
      <span>{label}</span>
      {count !== undefined && count > 0 && (
        <span className="ml-auto text-[11px] text-slate-400 dark:text-slate-500">{count}</span>
      )}
    </button>
  )
}
