'use client'

import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import type { Profile } from '@/lib/database.types'
import { Clock, Calendar, TrendingUp, Camera } from 'lucide-react'

export default function ProfilePage() {
  const supabase = createClient()
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [stats, setStats] = useState({ total: 0, days: 0, avg: 0 })
  const [recentSessions, setRecentSessions] = useState<any[]>([])
  const [editing, setEditing] = useState(false)
  const [displayName, setDisplayName] = useState('')
  const [uploading, setUploading] = useState(false)

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) { router.push('/auth'); return }
      loadProfile(user.id)
    })
  }, [])

  async function loadProfile(uid: string) {
    let { data: prof } = await supabase
      .from('profiles')
      .select()
      .eq('id', uid)
      .single()

    // Auto-create profile if it doesn't exist
    if (!prof) {
      const { data: user } = await supabase.auth.getUser()
      const username = user?.user?.email?.split('@')[0] || 'user_' + uid.substring(0, 8)
      await supabase.from('profiles').insert({
        id: uid,
        username: username,
        display_name: username,
      })
      const { data: newProf } = await supabase.from('profiles').select().eq('id', uid).single()
      prof = newProf
    }

    if (prof) {
      setProfile(prof)
      setDisplayName(prof.display_name || '')
    }

    const { data: sessions } = await supabase
      .from('study_sessions')
      .select()
      .eq('user_id', uid)
      .order('study_date', { ascending: false })

    if (sessions) {
      const total = sessions.reduce((s, x) => s + x.duration_minutes, 0)
      const uniqueDays = new Set(sessions.map(s => s.study_date)).size
      setStats({
        total,
        days: uniqueDays,
        avg: uniqueDays > 0 ? Math.round(total / uniqueDays) : 0,
      })
      setRecentSessions(sessions.slice(0, 10))
    }
  }

  async function handleAvatarUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !profile) return

    setUploading(true)
    const fileExt = file.name.split('.').pop()
    const filePath = `${profile.id}/avatar.${fileExt}`

    await supabase.storage.from('avatars').upload(filePath, file, { upsert: true })

    const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(filePath)
    const avatarUrl = urlData?.publicUrl

    if (avatarUrl) {
      await supabase.from('profiles').update({ avatar_url: avatarUrl }).eq('id', profile.id)
      setProfile({ ...profile, avatar_url: avatarUrl })
    }
    setUploading(false)
  }

  async function saveProfile() {
    if (!profile) return
    await supabase
      .from('profiles')
      .update({ display_name: displayName })
      .eq('id', profile.id)
    setProfile({ ...profile, display_name: displayName })
    setEditing(false)
  }

  if (!profile) return <div className="flex justify-center py-20 text-[#8E8E93]">加载中...</div>

  return (
    <div className="space-y-6 animate-fade-in">
      <h1 className="text-2xl font-bold text-[#2D3436]">👤 我的</h1>

      <div className="bg-white rounded-2xl border border-[#F0EDE8] p-6">
        <div className="flex items-center gap-4 mb-4">
          <div className="relative group">
            <div className="w-16 h-16 rounded-full bg-[#7C9A8E]/10 flex items-center justify-center
              text-[#7C9A8E] text-2xl font-bold overflow-hidden">
              {profile.avatar_url ? (
                <img src={profile.avatar_url} alt="头像" className="w-full h-full object-cover" />
              ) : (
                (profile.display_name || profile.username)[0]
              )}
            </div>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="absolute inset-0 rounded-full bg-black/0 hover:bg-black/30
                flex items-center justify-center transition-all opacity-0 hover:opacity-100"
            >
              <Camera size={18} className="text-white" />
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleAvatarUpload}
            />
          </div>

          <div className="flex-1">
            {editing ? (
              <div className="flex gap-2">
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="flex-1 px-3 py-2 rounded-xl border border-[#E8E4DC] bg-[#FDFBF7]
                    text-[#2D3436] text-sm focus:outline-none focus:ring-2 focus:ring-[#7C9A8E]/30"
                />
                <button onClick={saveProfile}
                  className="px-4 py-2 rounded-xl bg-[#7C9A8E] text-white text-sm hover:bg-[#6B897D]">
                  保存
                </button>
                <button onClick={() => setEditing(false)}
                  className="px-4 py-2 rounded-xl border text-sm text-[#8E8E93] hover:bg-[#F5F3EF]">
                  取消
                </button>
              </div>
            ) : (
              <div>
                <h2 className="text-xl font-bold text-[#2D3436]">{profile.display_name || profile.username}</h2>
                <p className="text-sm text-[#8E8E93]">@{profile.username}</p>
              </div>
            )}
          </div>
          {!editing && (
            <button onClick={() => setEditing(true)}
              className="text-sm text-[#7C9A8E] hover:text-[#6B897D]">
              编辑
            </button>
          )}
        </div>
        {uploading && <p className="text-sm text-[#7C9A8E]">上传中...</p>}
        <p className="text-xs text-[#B8B4AC] mt-1">点击头像上传自定义图片</p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl border border-[#F0EDE8] p-5 text-center">
          <Clock size={20} className="mx-auto mb-2 text-[#7C9A8E]" />
          <p className="text-2xl font-bold text-[#2D3436]">{stats.total}</p>
          <p className="text-sm text-[#8E8E93]">总学习（分钟）</p>
        </div>
        <div className="bg-white rounded-2xl border border-[#F0EDE8] p-5 text-center">
          <Calendar size={20} className="mx-auto mb-2 text-[#E8B4A2]" />
          <p className="text-2xl font-bold text-[#2D3436]">{stats.days}</p>
          <p className="text-sm text-[#8E8E93]">学习天数</p>
        </div>
        <div className="bg-white rounded-2xl border border-[#F0EDE8] p-5 text-center">
          <TrendingUp size={20} className="mx-auto mb-2 text-[#7C9A8E]" />
          <p className="text-2xl font-bold text-[#2D3436]">{stats.avg}</p>
          <p className="text-sm text-[#8E8E93]">日均（分钟）</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-[#F0EDE8] p-6">
        <h3 className="font-semibold text-[#2D3436] mb-3">最近学习记录</h3>
        {recentSessions.length === 0 ? (
          <p className="text-[#8E8E93] text-sm">还没有学习记录，去学点东西吧！</p>
        ) : (
          <div className="space-y-2">
            {recentSessions.map((s) => (
              <div key={s.id} className="flex items-center justify-between py-2 border-b border-[#F0EDE8] last:border-0">
                <div className="flex items-center gap-3">
                  <span className="text-sm text-[#8E8E93]">{s.study_date}</span>
                  <span className="font-medium text-[#2D3436]">{s.subject}</span>
                  {s.note && <span className="text-sm text-[#8E8E93]">- {s.note}</span>}
                </div>
                <span className="text-sm text-[#8E8E93]">{s.duration_minutes} 分钟</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
