import { Link, useLocation } from 'react-router-dom'
import { TrendingUp, BarChart2, Search } from 'lucide-react'
import clsx from 'clsx'

export default function Navbar() {
  const { pathname } = useLocation()

  const links = [
    { href: '/',          label: 'Search',   icon: Search },
    { href: '/screener',  label: 'Screener', icon: BarChart2 },
  ]

  return (
    <nav className="fixed top-0 inset-x-0 z-50 border-b border-bg-border bg-bg-base/90 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2 group">
          <div className="w-8 h-8 rounded-lg bg-accent-green/10 border border-accent-green/30 flex items-center justify-center group-hover:bg-accent-green/20 transition-colors">
            <TrendingUp size={16} className="text-accent-green" />
          </div>
          <span className="font-display font-700 text-lg tracking-tight text-text-primary">
            Value<span className="text-accent-green">Scope</span>
          </span>
        </Link>

        {/* Nav links */}
        <div className="flex items-center gap-1">
          {links.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              to={href}
              className={clsx(
                'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-mono transition-all',
                pathname === href
                  ? 'bg-accent-green/10 text-accent-green border border-accent-green/20'
                  : 'text-text-secondary hover:text-text-primary hover:bg-bg-elevated'
              )}
            >
              <Icon size={14} />
              {label}
            </Link>
          ))}
        </div>

        {/* Live indicator */}
        <div className="flex items-center gap-2 text-xs text-text-secondary">
          <span className="w-1.5 h-1.5 rounded-full bg-accent-green animate-pulse" />
          LIVE DATA
        </div>
      </div>
    </nav>
  )
}
