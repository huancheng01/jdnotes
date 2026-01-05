import { Moon, Sun } from 'lucide-react'
import { useTheme } from '../../contexts/ThemeContext'

export function ThemeToggleButton() {
  const { resolvedTheme, toggleTheme } = useTheme()

  return (
    <button
      onClick={toggleTheme}
      className="p-1.5 rounded-lg text-slate-500 dark:text-slate-400 hover:bg-white/50 dark:hover:bg-white/[0.06] hover:text-slate-900 dark:hover:text-slate-100 transition-colors duration-200 btn-press"
      title={resolvedTheme === 'dark' ? '切换浅色模式' : '切换深色模式'}
    >
      {resolvedTheme === 'dark' ? (
        <Sun className="h-4 w-4" strokeWidth={1.5} />
      ) : (
        <Moon className="h-4 w-4" strokeWidth={1.5} />
      )}
    </button>
  )
}
