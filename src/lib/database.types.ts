export type Profile = {
  id: string
  username: string
  display_name: string | null
  avatar_url: string | null
  created_at: string
}

export type Friendship = {
  id: string
  requester_id: string
  addressee_id: string
  status: 'pending' | 'accepted'
  intimacy: 'normal' | 'intimate'
  created_at: string
  updated_at: string
}

export type StudySession = {
  id: string
  user_id: string
  subject: string
  duration_minutes: number
  note: string | null
  study_date: string
  created_at: string
}

export type FriendWithProfile = {
  friendship_id: string
  friend_id: string
  username: string
  display_name: string | null
  intimacy: 'normal' | 'intimate'
  status: 'pending' | 'accepted'
  created_at: string
}

export type DailyStats = {
  total_minutes: number
  study_date: string
}
