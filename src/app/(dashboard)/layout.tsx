'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase';
import { useState } from 'react';
import { LogOut, Menu } from 'lucide-react';

export default function Layout({ children }) {
    const pathname = usePathname();
    const router = useRouter();
    const supabase = createClient();
    const [sidebarOpen, setSidebarOpen] = useState(false);

  async function handleLogout() {
        await supabase.auth.signOut();
        router.push('/auth');
  }

  return (
        <div>
              <header style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 16px', background: 'white', borderBottom: '1px solid #eee' }}>
                      <button onClick={() => setSidebarOpen(!sidebarOpen)}>Menu</button>button>
                      <button onClick={handleLogout}>退出</button>button>
              </header>header>
              <main style={{ padding: '16px' }}>{children}</main>main>
        </div>div>
      );
}</div>
