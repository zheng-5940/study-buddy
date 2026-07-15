'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import type { Profile } from '@/lib/database.types'
import { UserPlus, UserCheck, Heart, Users, Clock } from 'lucide-react'

type FriendEntry = {
  friendship_id: string
  friend: Profile
  status: 'pending' | 'accepted'
  intimacy: 'normal' | 'intimate'
  requester_id: string
}

export default function FriendsPage() {
  const supabase = createClient()
  const router = useRouter()
  const [userId, setUserId] = useState<string>('')
  const [friends, setFriends] = useState<FriendEntry[]>([])
  const [pendingRequests, setPendingRequests] = useState<FriendEntry[]>([])
  const [searchUsername, setSearchUsername] = useState('')
  const [searchResult, setSearchResult] = useState<Profile | null>(null)
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) { router.push('/auth'); return }
      setUserId(user.id)
      loadFriends(user.id)
    })
  }, [])

  async function loadFriends(uid: string) {
    const { data: friendships } = await supabase
      .from('friendships')
      .select()
      .or(`requester_id.eq.${uid},addressee_id.eq.${uid}`)

    const accepted: FriendEntry[] = []
    const pending: FriendEntry[] = []

    if (friendships) {
      for (const f of friendships) {
        const friendId = f.requester_id === uid ? f.addressee_id : f.requester_id
        const { data: prof } = await supabase
          .from('profiles')
          .select()
          .eq('id', friendId)
          .single()
        if (!prof) continue

        const entry: FriendEntry = {
          friendship_id: f.id,
          friend: prof,
          status: f.status,
          intimacy: f.intimacy,
          requester_id: f.requester_id,
        }

        if (f.status === 'accepted') accepted.push(entry)
        else if (f.addressee_id === uid) pending.push(entry)
      }
    }

    setFriends(accepted)
    setPendingRequests(pending)
    setLoading(false)
  }

  async function handleSearch() {
    if (!searchUsername.trim()) return
    const { data } = await supabase
      .from('profiles')
      .select()
      .ilike('username', searchUsername.trim())
      .limit(1)
    setSearchResult(data?.[0] || null)
  }

  async function sendRequest(targetId: string) {
    const { error } = await supabase.from('friendships').insert({
      requester_id: userId,
      addressee_id: targetId,
      status: 'pending',
      intimacy: 'normal',
    })
    if (error) { setMessage('发送失败: ' + error.message) }
    else {
      setMessage('✅ 好友请求已发送！')
      setSearchResult(null)
      setSearchUsername('')
    }
  }

  async function acceptRequest(friendshipId: string) {
    await supabase
      .from('friendships')
      .update({ status: 'accepted' })
      .eq('id', friendshipId)
    setMessage('✅ 已添加好友！')
    loadFriends(userId)
  }

  async function toggleIntimacy(friendshipId: string, currentIntimacy: string) {
    const newIntimacy = currentIntimacy === 'normal' ? 'intimate' : 'normal'
    await supabase
      .from('friendships')
      .update({ intimacy: newIntimacy })
      .eq('id', friendshipId)
    setMessage(newIntimacy === 'intimate' ? '💕 已设为亲密好友' : '已设为普通好友')
    loadFriends(userId)
  }

  if (loading) {
    return <div className="flex justify-center py-20 text-[#8E8E93]">加载中...</div>
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <h1 className="text-2xl font-bold text-[#2D3436]">👥 好友</h1>

      {/* Search users */}
      <div className="bg-white rounded-2xl border border-[#F0EDE8] p-5">
        <h2 className="font-semibold text-[#2D3436] mb-3">添加好友</h2>
        <div className="flex gap-2">
          <input
            type="text"
            value={searchUsername}
            onChange={(e) => setSearchUsername(e.target.value)}
            placeholder="输入用户名搜索..."
            className="flex-1 px-4 py-3 rounded-xl border border-[#E8E4DC] bg-[#FDFBF7]
              text-[#2D3436] text-sm focus:outline-none focus:ring-2 focus:ring-[#7C9A8E]/30"
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          />
          <button
            onClick={handleSearch}
            className="px-5 py-3 rounded-xl bg-[#7C9A8E] text-white font-medium
              hover:bg-[#6B897D] transition-all"
          >
            搜索
          </button>
        </div>

        {searchResult && (
          <div className="mt-3 p-3 rounded-xl bg-[#FDFBF7] border border-[#E8E4DC]
            flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-[#7C9A8E]/10 flex items-center justify-center
                text-[#7C9A8E] font-semibold text-sm">
                {(searchResult.display_name || searchResult.username)[0]}
              </div>
              <div>
                <p className="font-medium text-[#2D3436]">{searchResult.display_name || searchResult.username}</p>
                <p className="text-xs text-[#8E8E93]">@{searchResult.username}</p>
              </div>
            </div>
            {searchResult.id === userId ? (
              <span className="text-sm text-[#8E8E93]">自己</span>
            ) : (
              <button
                onClick={() => sendRequest(searchResult.id)}
                className="flex items-center gap-1 px-4 py-2 rounded-xl bg-[#7C9A8E]/10 text-[#7C9A8E]
                  text-sm font-medium hover:bg-[#7C9A8E]/20 transition-all"
              >
                <UserPlus size={16} /> 加好友
              </button>
            )}
          </div>
        )}
      </div>

      {/* Pending requests */}
      {pendingRequests.length > 0 && (
        <div>
          <h2 className="font-semibold text-[#2D3436] mb-3 flex items-center gap-2">
            <UserCheck size={18} className="text-[#E8B4A2]" />
            好友请求
          </h2>
          {pendingRequests.map((item) => (
            <div key={item.friendship_id}
              className="bg-white rounded-2xl border border-[#F0EDE8] p-4 mb-2
                flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-[#E8B4A2]/10 flex items-center justify-center
                  text-[#E8B4A2] font-semibold text-sm">
                  {(item.friend.display_name || item.friend.username)[0]}
                </div>
                <span className="font-medium text-[#2D3436]">
                  {item.friend.display_name || item.friend.username}
                </span>
              </div>
              <button
                onClick={() => acceptRequest(item.friendship_id)}
                className="px-4 py-2 rounded-xl bg-[#7C9A8E] text-white text-sm font-medium
                  hover:bg-[#6B897D] transition-all"
              >
                同意
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Friends list */}
      <div>
        <h2 className="font-semibold text-[#2D3436] mb-3 flex items-center gap-2">
          <Users size={18} className="text-[#7C9A8E]" />
          好友列表 ({friends.length})
        </h2>

        {friends.length === 0 ? (
          <div className="bg-white rounded-2xl border border-[#F0EDE8] p-8 text-center">
            <p className="text-[#8E8E93]">还没有好友，搜索用户名添加吧</p>
          </div>
        ) : (
          <div className="space-y-2">
            {friends.map((item) => (
              <div key={item.friendship_id}
                className="bg-white rounded-2xl border border-[#F0EDE8] p-4
                  flex items-center justify-between hover:border-[#7C9A8E]/20 transition-all"
              >
                <Link href={`/friends/${item.friend.id}`} className="flex items-center gap-3 flex-1">
                  <div className="w-10 h-10 rounded-full bg-[#7C9A8E]/10 flex items-center justify-center
                    text-[#7C9A8E] font-semibold">
                    {(item.friend.display_name || item.friend.username)[0]}
                  </div>
                  <div>
                    <p className="font-medium text-[#2D3436]">
                      {item.friend.display_name || item.friend.username}
                    </p>
                    <p className="text-xs text-[#8E8E93]">
                      {item.intimacy === 'intimate' ? '✨ 亲密好友' : '普通好友'}
                    </p>
                  </div>
                </Link>

                <button
                  onClick={() => toggleIntimacy(item.friendship_id, item.intimacy)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all
                    ${item.intimacy === 'intimate'
                      ? 'bg-[#E8B4A2]/20 text-[#C08A78] hover:bg-[#E8B4A2]/30'
                      : 'bg-[#F5F3EF] text-[#8E8E93] hover:bg-[#EDE8E0]'
                    }`}
                >
                  <Heart size={14} className={item.intimacy === 'intimate' ? 'fill-[#E8B4A2]' : ''} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Message toast */}
      {message && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-[#2D3436] text-white px-6 py-3 rounded-xl shadow-lg text-sm">
          {message}
        </div>
      )}
    </div>
  )
}
