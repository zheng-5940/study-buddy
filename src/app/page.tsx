import Link from "next/link";

export default function LandingPage() {
  return (
    <div className="min-h-screen flex flex-col auth-bg">
      <header className="px-6 py-4">
        <h1 className="text-xl font-bold text-[#2D3436]">📚 Study Buddy</h1>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center px-6 text-center">
        <div className="max-w-lg animate-fade-in">
          <h2 className="text-5xl font-bold text-[#2D3436] tracking-tight mb-4">
            学习路上，<br />不再孤单
          </h2>
          <p className="text-lg text-[#8E8E93] mb-8 leading-relaxed">
            Study Buddy 让你和好友互相监督学习进度。<br />
            普通好友看到你的学习时长，亲密好友还能看到详细科目。
          </p>

          <div className="flex gap-4 justify-center">
            <Link
              href="/auth"
              className="px-8 py-3 rounded-xl bg-[#7C9A8E] text-white font-medium
                hover:bg-[#6B897D] transition-all"
            >
              开始使用
            </Link>
            <Link
              href="/auth"
              className="px-8 py-3 rounded-xl border border-[#E8E4DC] text-[#2D3436] font-medium
                hover:bg-white transition-all"
            >
              登录
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-6 mt-20 max-w-2xl w-full animate-fade-in-delay-1">
          {[
            { emoji: "⏱️", title: "记录学习", desc: "计时或手动记录每次学习" },
            { emoji: "👥", title: "好友监督", desc: "加好友，看到彼此的学习状态" },
            { emoji: "🔒", title: "隐私分级", desc: "普通/亲密好友，可见范围不同" },
          ].map((item) => (
            <div key={item.title} className="text-center p-4">
              <div className="text-3xl mb-2">{item.emoji}</div>
              <h3 className="font-semibold text-[#2D3436] mb-1">{item.title}</h3>
              <p className="text-sm text-[#8E8E93]">{item.desc}</p>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
