'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { useEffect, useState } from 'react'
import {
  LayoutDashboard,
  Timer,
  Users,
  User,
  LogOut,
  Menu,
  X,
} from 'lucide-react'

const navItems = [
  { href: '/dashboard', label: '动态', icon: LayoutDashboard },
  { href: '/study', label: '学习', icon: Timer },
  { href: '/friends', label: '好友', icon: Users },
  { href: '/profile', label: '我的', icon: User },
]

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [displayName, setDisplayName] = useState('')

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user?.user_metadata?.display_name) {
        setDisplayName(user.user_metadata.display_name)
      } else if (user?.email) {
        setDisplayName(user.email.split('@')[0])
      }
    })
  }, [])

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/auth')
  }

  return (
    <div className="min-h-screen bg-[#FDFBF7] flex">
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/20 z-20 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside className={`
        fixed lg:sticky top-0 left-0 z-30 h-screen w-64
        bg-white border-r border-[#F0EDE8]
        transform transition-transform duration-200
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        lg:translate-x-0
        flex flex-col
      `}>
        <div className="p-6 border-b border-[#F0EDE8]">
          <div className="flex items-center justify-between">
            <Link href="/dashboard" className="text-xl font-bold text-[#2D3436]">
              📚 Study Buddy
            </Link>
            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden text-[#8E8E93] hover:text-[#2D3436]"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setSidebarOpen(false)}
                className={`
                  flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium
                  transition-all duration-200
                  ${isActive
                    ? 'bg-[#7C9A8E]/10 text-[#7C9A8E]'
                    : 'text-[#8E8E93] hover:bg-[#F5F3EF] hover:text-[#2D3436]'
                  }
                `}
              >
                <item.icon size={20} />
                {item.label}
              </Link>
            )
          })}
        </nav>

        <div className="p-4 border-t border-[#F0EDE8]">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium
              text-[#8E8E93] hover:bg-[#F5F3EF] hover:text-red-500 w-full transition-all"
          >
            <LogOut size={20} />
            退出登录
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-h-screen">
        <header className="flex items-center justify-between px-4 py-3 bg-white border-b border-[#F0EDE8]">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden text-[#8E8E93] hover:text-[#2D3436]"
            >
              <Menu size={24} />
            </button>
            <Link href="/dashboard" className="lg:hidden text-lg font-bold text-[#2D3436]">
              📚 Study Buddy
            </Link>
          </div>

          <div className="flex items-center gap-3">
            <span className="hidden sm:block text-sm text-[#8E8E93]">
              {displayName}
            </span>
            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm
                text-[#8E8E93] hover:bg-[#F5F3EF] hover:text-red-500 transition-all"
              title="退出登录"
            >
              <LogOut size={16} />
              <span className="hidden sm:inline">退出</span>
            </button>
          </div>
        </header>

        <main className="flex-1 p-4 lg:p-8 max-w-5xl w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  )
}
