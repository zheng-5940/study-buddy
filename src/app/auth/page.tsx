'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function AuthPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [username, setUsername] = useState('')
  const [isSignUp, setIsSignUp] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()
  const supabase = createClient()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    if (isSignUp) {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { username, display_name: username },
        },
      })
      if (error) setError(error.message)
      else setError('注册成功！请查看邮箱确认链接。（演示环境可直接登录）')
    } else {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })
      if (error) setError(error.message)
      else router.push('/dashboard')
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center auth-bg">
      <div className="w-full max-w-md mx-4">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-[#2D3436] tracking-tight">
            📚 Study Buddy
          </h1>
          <p className="text-[#8E8E93] mt-2">
            和朋友一起，让学习更有动力
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-[#F0EDE8] p-8">
          <h2 className="text-xl font-semibold text-[#2D3436] mb-6">
            {isSignUp ? '创建账号' : '登录'}
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            {isSignUp && (
              <div>
                <label className="block text-sm text-[#8E8E93] mb-1">用户名</label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-[#E8E4DC] bg-[#FDFBF7]
                    focus:outline-none focus:ring-2 focus:ring-[#7C9A8E]/30 focus:border-[#7C9A8E]
                    text-[#2D3436] placeholder:text-[#B8B4AC] transition-all"
                  placeholder="你的用户名"
                  required
                />
              </div>
            )}

            <div>
              <label className="block text-sm text-[#8E8E93] mb-1">邮箱</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-[#E8E4DC] bg-[#FDFBF7]
                  focus:outline-none focus:ring-2 focus:ring-[#7C9A8E]/30 focus:border-[#7C9A8E]
                  text-[#2D3436] placeholder:text-[#B8B4AC] transition-all"
                placeholder="your@email.com"
                required
              />
            </div>

            <div>
              <label className="block text-sm text-[#8E8E93] mb-1">密码</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-[#E8E4DC] bg-[#FDFBF7]
                  focus:outline-none focus:ring-2 focus:ring-[#7C9A8E]/30 focus:border-[#7C9A8E]
                  text-[#2D3436] placeholder:text-[#B8B4AC] transition-all"
                placeholder="至少6位密码"
                minLength={6}
                required
              />
            </div>

            {error && (
              <p className="text-sm text-[#E8A2A2] bg-[#FFF5F5] px-4 py-2 rounded-lg">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl bg-[#7C9A8E] text-white font-medium
                hover:bg-[#6B897D] disabled:opacity-50 transition-all"
            >
              {loading ? '处理中...' : isSignUp ? '注册' : '登录'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <button
              onClick={() => { setIsSignUp(!isSignUp); setError('') }}
              className="text-sm text-[#7C9A8E] hover:text-[#6B897D] transition-colors"
            >
              {isSignUp ? '已有账号？登录' : '没有账号？注册'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
