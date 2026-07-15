'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import type { Profile, StudySession, Friendship } from '@/lib/database.types'
import { Timer, Users, TrendingUp, Clock } from 'lucide-react'

type FriendActivity = {
  friend: Profile
  total_minutes: number
  sessions: StudySession[]
  intimacy: 'normal' | 'intimate'
}

export default function DashboardPage() {
  const supabase = createClient()
  const router = useRouter()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [myTodayMinutes, setMyTodayMinutes] = useState(0)
  const [friendActivities, setFriendActivities] = useState<FriendActivity[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadDashboard()
  }, [])

  async function loadDashboard() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/auth'); return }

    // Load profile
    const { data: prof } = await supabase
      .from('profiles')
      .select()
      .eq('id', user.id)
      .single()
    setProfile(prof)

    // Load my today's stats
    const today = new Date().toISOString().split('T')[0]
    const { data: mySessions } = await supabase
      .from('study_sessions')
      .select()
      .eq('user_id', user.id)
      .eq('study_date', today)

    const totalMins = (mySessions || []).reduce((sum, s) => sum + s.duration_minutes, 0)
    setMyTodayMinutes(totalMins)

    // Load accepted friendships
    const { data: friendships } = await supabase
      .from('friendships')
      .select()
      .eq('status', 'accepted')
      .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`)

    if (!friendships) { setLoading(false); return }

    // For each friend, get their profile and today's stats
    const activities: FriendActivity[] = []

    for (const f of friendships) {
      const friendId = f.requester_id === user.id ? f.addressee_id : f.requester_id

      const { data: friendProf } = await supabase
        .from('profiles')
        .select()
        .eq('id', friendId)
        .single()
      if (!friendProf) continue

      // Get today's sessions - if intimate, get details; if normal, just aggregate
      const { data: sessions } = await supabase
        .from('study_sessions')
        .select()
        .eq('user_id', friendId)
        .eq('study_date', today)

      const totalMinutes = (sessions || []).reduce((sum, s) => sum + s.duration_minutes, 0)

      activities.push({
        friend: friendProf,
        total_minutes: totalMinutes,
        sessions: f.intimacy === 'intimate' ? (sessions || []) : [],
        intimacy: f.intimacy as 'normal' | 'intimate',
      })
    }

    setFriendActivities(activities)
    setLoading(false)
  }

  function formatMinutes(mins: number) {
    const h = Math.floor(mins / 60)
    const m = mins % 60
    return h > 0 ? `${h}小时${m}分钟` : `${m}分钟`
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-[#8E8E93]">加载中...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* My status */}
      <div className="bg-white rounded-2xl border border-[#F0EDE8] p-6">
        <h2 className="text-lg font-semibold text-[#2D3436] mb-1">
          👋 {profile?.display_name || profile?.username}
        </h2>
        <p className="text-sm text-[#8E8E93] mb-4">今天的学习情况</p>
        <div className="flex items-center gap-3 text-[#7C9A8E]">
          <Clock size={24} />
          <span className="text-2xl font-bold">{formatMinutes(myTodayMinutes)}</span>
        </div>
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-2 gap-4">
        <button
          onClick={() => router.push('/study')}
          className="bg-white rounded-2xl border border-[#F0EDE8] p-5 text-left
            hover:border-[#7C9A8E]/30 hover:shadow-sm transition-all group"
        >
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-[#7C9A8E]/10 flex items-center justify-center
              group-hover:bg-[#7C9A8E]/20 transition-colors">
              <Timer size={20} className="text-[#7C9A8E]" />
            </div>
          </div>
          <h3 className="font-semibold text-[#2D3436]">开始学习</h3>
          <p className="text-sm text-[#8E8E93] mt-1">记录今天的学习</p>
        </button>

        <button
          onClick={() => router.push('/friends')}
          className="bg-white rounded-2xl border border-[#F0EDE8] p-5 text-left
            hover:border-[#7C9A8E]/30 hover:shadow-sm transition-all group"
        >
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-[#E8B4A2]/10 flex items-center justify-center
              group-hover:bg-[#E8B4A2]/20 transition-colors">
              <Users size={20} className="text-[#E8B4A2]" />
            </div>
          </div>
          <h3 className="font-semibold text-[#2D3436]">好友动态</h3>
          <p className="text-sm text-[#8E8E93] mt-1">看看好友学了什么</p>
        </button>
      </div>

      {/* Friends activity */}
      <div>
        <h2 className="text-lg font-semibold text-[#2D3436] mb-4 flex items-center gap-2">
          <TrendingUp size={20} className="text-[#7C9A8E]" />
          好友今日动态
        </h2>

        {friendActivities.length === 0 ? (
          <div className="bg-white rounded-2xl border border-[#F0EDE8] p-8 text-center">
            <p className="text-[#8E8E93]">还没有好友哦，去添加一些学习伙伴吧</p>
          </div>
        ) : (
          <div className="space-y-3">
            {friendActivities.map((item) => (
              <div
                key={item.friend.id}
                className="bg-white rounded-2xl border border-[#F0EDE8] p-5
                  hover:border-[#7C9A8E]/20 transition-all"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-[#7C9A8E]/10 flex items-center justify-center
                      text-[#7C9A8E] font-semibold">
                      {(item.friend.display_name || item.friend.username)[0]}
                    </div>
                    <div>
                      <p className="font-medium text-[#2D3436]">
                        {item.friend.display_name || item.friend.username}
                      </p>
                      <p className="text-sm text-[#8E8E93]">
                        今日学习 {formatMinutes(item.total_minutes)}
                        {item.intimacy === 'normal' && (
                          <span className="ml-2 text-xs bg-[#F5F3EF] px-2 py-0.5 rounded-full">
                            普通好友
                          </span>
                        )}
                        {item.intimacy === 'intimate' && (
                          <span className="ml-2 text-xs bg-[#E8B4A2]/20 text-[#C08A78] px-2 py-0.5 rounded-full">
                            亲密好友 ✨
                          </span>
                        )}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Show detailed sessions only for intimate friends */}
                {item.intimacy === 'intimate' && item.sessions.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-[#F0EDE8] space-y-1">
                    {item.sessions.map((s) => (
                      <div key={s.id} className="flex items-center justify-between text-sm">
                        <span className="text-[#2D3436]">{s.subject}</span>
                        <span className="text-[#8E8E93]">{s.duration_minutes} 分钟</span>
                      </div>
                    ))}
                  </div>
                )}

                {item.total_minutes === 0 && (
                  <p className="text-sm text-[#B8B4AC] mt-2">今天还没有学习记录</p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
