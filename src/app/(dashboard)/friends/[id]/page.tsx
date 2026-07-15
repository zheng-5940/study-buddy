'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter, useParams } from 'next/navigation'
import type { Profile, StudySession } from '@/lib/database.types'
import { Clock, ArrowLeft, Lock, Unlock } from 'lucide-react'
import Link from 'next/link'

export default function FriendDetailPage() {
  const supabase = createClient()
  const router = useRouter()
  const params = useParams()
  const [userId, setUserId] = useState('')
  const [friend, setFriend] = useState<Profile | null>(null)
  const [intimacy, setIntimacy] = useState<'normal' | 'intimate' | null>(null)
  const [todayMinutes, setTodayMinutes] = useState(0)
  const [weekData, setWeekData] = useState<{ date: string; total: number }[]>([])
  const [detailSessions, setDetailSessions] = useState<StudySession[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) { router.push('/auth'); return }
      setUserId(user.id)
      loadFriendData(user.id)
    })
  }, [])

  async function loadFriendData(uid: string) {
    const friendId = params.id as string

    // Get friend profile
    const { data: prof } = await supabase
      .from('profiles')
      .select()
      .eq('id', friendId)
      .single()
    if (!prof) { router.push('/friends'); return }
    setFriend(prof)

    // Get friendship info
    const { data: friendships } = await supabase
      .from('friendships')
      .select()
      .eq('status', 'accepted')
      .or(`and(requester_id.eq.${uid},addressee_id.eq.${friendId}),and(requester_id.eq.${friendId},addressee_id.eq.${uid})`)
      .limit(1)

    const friendship = friendships?.[0]
    if (!friendship) { router.push('/friends'); return }

    const level = friendship.intimacy as 'normal' | 'intimate'
    setIntimacy(level)

    // Get today's stats
    const today = new Date().toISOString().split('T')[0]
    const { data: sessions } = await supabase
      .from('study_sessions')
      .select()
      .eq('user_id', friendId)
      .eq('study_date', today)

    const totalMins = (sessions || []).reduce((sum, s) => sum + s.duration_minutes, 0)
    setTodayMinutes(totalMins)

    // Get week stats (last 7 days)
    const weekDates: string[] = []
    for (let i = 6; i >= 0; i--) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      weekDates.push(d.toISOString().split('T')[0])
    }

    const { data: weekSessions } = await supabase
      .from('study_sessions')
      .select()
      .eq('user_id', friendId)
      .gte('study_date', weekDates[0])
      .lte('study_date', weekDates[6])

    const weekMap = new Map<string, number>()
    for (const s of weekSessions || []) {
      weekMap.set(s.study_date, (weekMap.get(s.study_date) || 0) + s.duration_minutes)
    }
    setWeekData(weekDates.map(d => ({ date: d, total: weekMap.get(d) || 0 })))

    // If intimate, show detailed sessions
    if (level === 'intimate') {
      setDetailSessions(weekSessions?.filter(s => s.study_date === today) || [])
    }

    setLoading(false)
  }

  if (loading) {
    return <div className="flex justify-center py-20 text-[#8E8E93]">加载中...</div>
  }

  const weekDays = ['周一', '周二', '周三', '周四', '周五', '周六', '周日']

  return (
    <div className="space-y-6 animate-fade-in">
      <Link href="/friends" className="inline-flex items-center gap-1 text-sm text-[#8E8E93] hover:text-[#2D3436]">
        <ArrowLeft size={16} /> 返回好友列表
      </Link>

      {/* Friend header */}
      <div className="bg-white rounded-2xl border border-[#F0EDE8] p-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-[#7C9A8E]/10 flex items-center justify-center
            text-[#7C9A8E] text-2xl font-bold">
            {(friend?.display_name || friend?.username || '?')[0]}
          </div>
          <div>
            <h2 className="text-xl font-bold text-[#2D3436]">
              {friend?.display_name || friend?.username}
            </h2>
            <p className="text-sm text-[#8E8E93]">@{friend?.username}</p>
            <div className="flex items-center gap-2 mt-1">
              {intimacy === 'intimate' ? (
                <span className="flex items-center gap-1 text-xs bg-[#E8B4A2]/20 text-[#C08A78] px-2 py-0.5 rounded-full">
                  <Unlock size={12} /> 亲密好友 - 可见详细学习内容
                </span>
              ) : (
                <span className="flex items-center gap-1 text-xs bg-[#F5F3EF] text-[#8E8E93] px-2 py-0.5 rounded-full">
                  <Lock size={12} /> 普通好友 - 仅可见学习时长
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Today */}
      <div className="bg-white rounded-2xl border border-[#F0EDE8] p-6">
        <h3 className="font-semibold text-[#2D3436] mb-3 flex items-center gap-2">
          <Clock size={18} className="text-[#7C9A8E]" />
          今日学习
        </h3>
        <p className="text-3xl font-bold text-[#7C9A8E]">{todayMinutes} <span className="text-lg text-[#8E8E93]">分钟</span></p>

        {/* Detailed sessions - only for intimate friends */}
        {intimacy === 'intimate' && detailSessions.length > 0 && (
          <div className="mt-4 pt-4 border-t border-[#F0EDE8] space-y-2">
            <p className="text-sm text-[#8E8E93] mb-2">详细学习内容：</p>
            {detailSessions.map((s) => (
              <div key={s.id} className="flex items-center justify-between py-1">
                <span className="text-[#2D3436]">{s.subject}</span>
                <span className="text-sm text-[#8E8E93]">{s.duration_minutes} 分钟</span>
              </div>
            ))}
          </div>
        )}

        {intimacy === 'normal' && (
          <p className="text-sm text-[#B8B4AC] mt-2">
            设置为亲密好友后可查看详细学习内容
          </p>
        )}
      </div>

      {/* Weekly chart */}
      <div className="bg-white rounded-2xl border border-[#F0EDE8] p-6">
        <h3 className="font-semibold text-[#2D3436] mb-4">本周趋势</h3>
        <div className="flex items-end gap-3 h-32">
          {weekData.map((day, i) => {
            const maxVal = Math.max(...weekData.map(d => d.total), 1)
            const height = (day.total / maxVal) * 100
            return (
              <div key={day.date} className="flex-1 flex flex-col items-center gap-1">
                <span className="text-xs text-[#8E8E93]">{day.total}m</span>
                <div className="w-full bg-[#F5F3EF] rounded-lg flex-1 relative" style={{ minHeight: '40px' }}>
                  <div
                    className="absolute bottom-0 w-full bg-[#7C9A8E] rounded-lg transition-all duration-500"
                    style={{ height: `${Math.max(height, 4)}%` }}
                  />
                </div>
                <span className="text-xs text-[#B8B4AC]">{weekDays[i]}</span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
