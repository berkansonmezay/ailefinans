'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useAuthStore } from '@/store/auth';
import { 
  LayoutDashboard, 
  ArrowLeftRight, 
  Tag, 
  MapPin, 
  CreditCard, 
  Wallet,
  Calendar,
  CalendarDays,
  BarChart3,
  Coins,
  ShieldCheck,
  Repeat,
  Settings,
  HelpCircle,
  Banknote,
  PieChart,
  FileText,
  Shield,
  BellRing,
  TrendingUp,
  Bitcoin
} from 'lucide-react';
import clsx from 'clsx';

const menuItems = [
  { key: 'overview', name: 'Kontrol Paneli', href: '/', icon: LayoutDashboard },
  { key: 'transactions', name: 'İşlemler', href: '/transactions', icon: ArrowLeftRight },
  { key: 'debts', name: 'Taksitli Borçlar', href: '/debts', icon: CreditCard },
  { key: 'receivables', name: 'Taksitli Alacaklar', href: '/receivables', icon: Wallet },
  { key: 'stocks', name: 'Hisselerim', href: '/stocks', icon: TrendingUp },
  { key: 'crypto', name: 'Kripto Varlıklar', href: '/crypto', icon: Bitcoin },
  { key: 'savings', name: 'Altın & Döviz', href: '/savings', icon: Coins },
  { key: 'accounts', name: 'Hesaplar', href: '/accounts', icon: Banknote },
  { key: 'subscriptions', name: 'Abonelikler', href: '/subscriptions', icon: Repeat },
  { key: 'reminders', name: 'Hatırlatıcılar', href: '/reminders', icon: BellRing },
  { key: 'calendar', name: 'Takvim', href: '/calendar', icon: Calendar },
  { key: 'reports', name: 'Raporlar', href: '/reports', icon: BarChart3 },
  { key: 'warranties', name: 'Garanti & Fatura', href: '/warranties', icon: ShieldCheck },
  { key: 'invoices', name: 'Fatura Tarama (AI)', href: '/fatura', icon: FileText, badge: 'BETA' },
  { key: 'settings', name: 'Ayarlar', href: '/settings', icon: Settings },
  { key: 'guide', name: 'Yardım', href: '/guide', icon: HelpCircle },
];

export function Sidebar() {
  const pathname = usePathname();
  const user = useAuthStore(state => state.user);

  const visibleMenuItems = menuItems.filter(item => {
    if (!user?.disabledMenus || user.disabledMenus.length === 0) return true;
    return !user.disabledMenus.includes(item.key);
  });

  return (
    <aside className="w-[var(--sidebar-width)] bg-bg-sidebar border-r border-border flex-shrink-0 hidden md:flex flex-col h-screen sticky top-0">
      <div className="h-[var(--header-height)] flex items-center px-6 border-b border-border">
        <Link href="/" className="flex items-center gap-2 font-bold text-lg text-text-primary">
          <div className="w-8 h-8 rounded-lg overflow-hidden flex items-center justify-center">
            <Image src="/logo.png" alt="Logo" width={32} height={32} className="object-contain" />
          </div>
          <span>Aile Finans</span>
        </Link>
      </div>

      <div className="flex-1 overflow-y-auto py-6 px-4 space-y-1">
        {visibleMenuItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.name}
              href={item.href}
              className={clsx(
                'flex items-center gap-3 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
                isActive 
                  ? 'bg-accent text-text-primary' 
                  : 'text-text-secondary hover:bg-bg-card hover:text-text-primary'
              )}
            >
              <item.icon size={18} className={isActive ? 'text-text-primary' : 'text-text-muted'} />
              <span className="flex-1 truncate">{item.name}</span>
              {'badge' in item && item.badge && (
                <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                  {item.badge}
                </span>
              )}
            </Link>
          );
        })}
        {/* Admin only menu */}
        {!!user?.systemRole && ['ADMIN', 'SUPER_ADMIN'].includes(user.systemRole) && (
          <Link
            href="/admin"
            className={clsx(
              'flex items-center gap-3 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors mt-4 bg-red-500/10 text-red-500 hover:bg-red-500/20',
              pathname === '/admin' ? 'bg-red-500/20' : ''
            )}
          >
            <Shield size={18} />
            Sistem Yönetimi
          </Link>
        )}
      </div>

    </aside>
  );
}
