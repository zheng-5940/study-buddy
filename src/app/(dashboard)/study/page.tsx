'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { Play, Pause, Square, Plus, Clock, BookOpen } from 'lucide-react'

const subjects = ['数学', '英语', '物理', '化学', '编程', '阅读', '写作', '其他']

export default function StudyPage() {
  const supabase = createClient()
  const router = useRouter()
  const [user, setUser] = useState<any>(null)

  // Timer state
  const [isRunning, setIsRunning] = useState(false)
  const [seconds, setSeconds] = useState(0)
  const [timerSubject, setTimerSubject] = useState('')
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Manual log state
  const [logSubject, setLogSubject] = useState('')
  const [logMinutes, setLogMinutes] = useState('')
  const [logNote, setLogNote] = useState('')
  const [message, setMessage] = useState('')

  // Today's sessions
  const [todaySessions, setTodaySessions] = useState<any[]>([])

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) { router.push('/auth'); return }
      setUser(user)
      loadTodaySessions(user.id)
    })
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [])

  async function loadTodaySessions(userId: string) {
    const today = new Date().toISOString().split('T')[0]
    const { data } = await supabase
      .from('study_sessions')
      .select()
      .eq('user_id', userId)
      .eq('study_date', today)
      .order('created_at', { ascending: false })
    setTodaySessions(data || [])
  }

  function startTimer() {
    if (!timerSubject) return
    setIsRunning(true)
    intervalRef.current = setInterval(() => {
      setSeconds(s => s + 1)
    }, 1000)
  }

  function pauseTimer() {
    setIsRunning(false)
    if (intervalRef.current) clearInterval(intervalRef.current)
  }

  async function stopTimer() {
    pauseTimer()
    if (seconds < 60) { setMessage('至少学习1分钟才能记录哦'); return }

    const minutes = Math.round(seconds / 60)
    const { error } = await supabase.from('study_sessions').insert({
      user_id: user.id,
      subject: timerSubject,
      duration_minutes: minutes,
      study_date: new Date().toISOString().split('T')[0],
    })

    if (error) { setMessage('记录失败: ' + error.message) }
    else {
      setMessage(`🎉 学习了 ${minutes} 分钟！`)
      setSeconds(0)
      setTimerSubject('')
      loadTodaySessions(user.id)
    }
  }

  async function handleManualLog(e: React.FormEvent) {
    e.preventDefault()
    if (!logSubject || !logMinutes) return

    const { error } = await supabase.from('study_sessions').insert({
      user_id: user.id,
      subject: logSubject,
      duration_minutes: parseInt(logMinutes),
      note: logNote || null,
      study_date: new Date().toISOString().split('T')[0],
    })

    if (error) { setMessage('记录失败: ' + error.message) }
    else {
      setMessage('✅ 已记录！')
      setLogSubject('')
      setLogMinutes('')
      setLogNote('')
      loadTodaySessions(user.id)
    }
  }

  function formatTime(s: number) {
    const h = Math.floor(s / 3600)
    const m = Math.floor((s % 3600) / 60)
    const sec = s % 60
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`
  }

  const totalToday = todaySessions.reduce((sum, s) => sum + s.duration_minutes, 0)

  return (
    <div className="space-y-6 animate-fade-in">
      <h1 className="text-2xl font-bold text-[#2D3436]">📖 学习</h1>

      {/* Today's summary */}
      <div className="bg-white rounded-2xl border border-[#F0EDE8] p-5">
        <div className="flex items-center gap-3 text-[#7C9A8E]">
          <Clock size={24} />
          <span className="text-lg">今日已学 <strong className="text-2xl">{totalToday}</strong> 分钟</span>
        </div>
      </div>

      {/* Timer */}
      <div className="bg-white rounded-2xl border border-[#F0EDE8] p-6">
        <h2 className="font-semibold text-[#2D3436] mb-4 flex items-center gap-2">
          <Clock size={20} className="text-[#7C9A8E]" />
          计时器
        </h2>

        <div className="text-center">
          <div className={`text-6xl font-mono font-bold text-[#2D3436] mb-4 ${isRunning ? 'timer-active' : ''}`}>
            {formatTime(seconds)}
          </div>

          <select
            value={timerSubject}
            onChange={(e) => setTimerSubject(e.target.value)}
            className="mb-4 px-4 py-2 rounded-xl border border-[#E8E4DC] bg-[#FDFBF7]
              text-[#2D3436] text-sm focus:outline-none focus:ring-2 focus:ring-[#7C9A8E]/30"
          >
            <option value="">选择科目</option>
            {subjects.map(s => <option key={s} value={s}>{s}</option>)}
          </select>

          <div className="flex gap-3 justify-center">
            {!isRunning ? (
              <button
                onClick={startTimer}
                disabled={!timerSubject}
                className="flex items-center gap-2 px-6 py-3 rounded-xl bg-[#7C9A8E] text-white
                  font-medium hover:bg-[#6B897D] disabled:opacity-40 transition-all"
              >
                <Play size={18} /> 开始
              </button>
            ) : (
              <button
                onClick={pauseTimer}
                className="flex items-center gap-2 px-6 py-3 rounded-xl bg-[#E8B4A2] text-white
                  font-medium hover:bg-[#D8A491] transition-all"
              >
                <Pause size={18} /> 暂停
              </button>
            )}
            {seconds > 0 && (
              <button
                onClick={stopTimer}
                className="flex items-center gap-2 px-6 py-3 rounded-xl border border-[#E8E4DC]
                  text-[#8E8E93] hover:bg-[#F5F3EF] transition-all"
              >
                <Square size={18} /> 完成
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Manual log */}
      <div className="bg-white rounded-2xl border border-[#F0EDE8] p-6">
        <h2 className="font-semibold text-[#2D3436] mb-4 flex items-center gap-2">
          <BookOpen size={20} className="text-[#E8B4A2]" />
          手动记录
        </h2>

        <form onSubmit={handleManualLog} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <select
              value={logSubject}
              onChange={(e) => setLogSubject(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-[#E8E4DC] bg-[#FDFBF7]
                text-[#2D3436] text-sm focus:outline-none focus:ring-2 focus:ring-[#7C9A8E]/30"
              required
            >
              <option value="">选择科目</option>
              {subjects.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <input
              type="number"
              value={logMinutes}
              onChange={(e) => setLogMinutes(e.target.value)}
              placeholder="学习时长（分钟）"
              min="1"
              className="w-full px-4 py-3 rounded-xl border border-[#E8E4DC] bg-[#FDFBF7]
                text-[#2D3436] text-sm focus:outline-none focus:ring-2 focus:ring-[#7C9A8E]/30"
              required
            />
          </div>
          <input
            type="text"
            value={logNote}
            onChange={(e) => setLogNote(e.target.value)}
            placeholder="备注（可选）"
            className="w-full px-4 py-3 rounded-xl border border-[#E8E4DC] bg-[#FDFBF7]
              text-[#2D3436] text-sm focus:outline-none focus:ring-2 focus:ring-[#7C9A8E]/30"
          />
          <button
            type="submit"
            className="flex items-center gap-2 px-6 py-3 rounded-xl bg-[#E8B4A2] text-white
              font-medium hover:bg-[#D8A491] transition-all"
          >
            <Plus size={18} /> 记录
          </button>
        </form>
      </div>

      {/* Messages */}
      {message && (
        <div className="bg-white rounded-2xl border border-[#F0EDE8] p-4 text-center text-[#7C9A8E]">
          {message}
        </div>
      )}

      {/* Today's sessions list */}
      {todaySessions.length > 0 && (
        <div className="bg-white rounded-2xl border border-[#F0EDE8] p-6">
          <h3 className="font-semibold text-[#2D3436] mb-3">今日记录</h3>
          <div className="space-y-2">
            {todaySessions.map((s) => (
              <div key={s.id} className="flex items-center justify-between py-2 border-b border-[#F0EDE8] last:border-0">
                <div>
                  <span className="font-medium text-[#2D3436]">{s.subject}</span>
                  {s.note && <span className="text-sm text-[#8E8E93] ml-2">- {s.note}</span>}
                </div>
                <span className="text-sm text-[#8E8E93]">{s.duration_minutes} 分钟</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
