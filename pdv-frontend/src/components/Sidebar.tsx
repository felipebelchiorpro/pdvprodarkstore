'use client';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import {
    LayoutDashboard,
    Package,
    ShoppingCart,
    TrendingUp,
    Zap,
    LogOut,
    Users,
    DollarSign
} from 'lucide-react';
import { pb } from '@/lib/pb';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';

export default function Sidebar() {
    const pathname = usePathname();
    const router = useRouter();
    const [userRole, setUserRole] = useState<string | null>(null);

    useEffect(() => {
        const checkRole = async () => {
            if (pb.authStore.model) {
                try {
                    // Force refresh to catch newly added 'role' field
                    const authData = await pb.collection('users').authRefresh();
                    setUserRole(authData.record.role || 'attendant');
                } catch (e) {
                    console.error('Auth refresh failed:', e);
                    setUserRole(pb.authStore.model.role || 'attendant');
                }
            }
        };
        checkRole();
    }, []);

    const handleLogout = () => {
        pb.authStore.clear();
        window.location.href = '/login';
    };

    const isAdmin = userRole === 'admin';

    return (
        <aside className="w-[280px] flex-shrink-0 bg-[#0F0F0F] flex flex-col justify-between h-full py-6 pr-6 shadow-[2px_0_10px_rgba(0,0,0,0.5)] z-10 rounded-br-[40px]">
            <div>
                <div className="flex items-center gap-4 px-8 mb-10">
                    <div className="w-10 h-10 rounded-xl bg-[#111] border border-[#222] flex items-center justify-center shadow-inner overflow-hidden p-1">
                        <img 
                            src="/lobo.png" 
                            alt="Dark Store" 
                            className="w-full h-full object-contain"
                        />
                    </div>
                    <div>
                        <span className="font-bold text-lg leading-tight block text-white">Dark Store</span>
                        <span className="text-xs text-[#A7A7A7] font-medium tracking-widest uppercase">
                            {isAdmin ? 'Painel Admin' : 'Painel Vendedor'}
                        </span>
                    </div>
                </div>

                <nav className="space-y-1.5 focus-within:outline-none">
                    {isAdmin && <NavItem href="/" icon={<LayoutDashboard size={18} />} label="Dashboard" active={pathname === '/'} />}
                    
                    <NavItem href="/pdv" icon={<Zap size={18} />} label="Vendas PDV" active={pathname === '/pdv'} />
                    
                    {isAdmin && (
                        <>
                            <NavItem href="/produtos" icon={<Package size={18} />} label="Estoque & Itens" active={pathname?.startsWith('/produtos')} />
                            <NavItem href="/relatorios" icon={<TrendingUp size={18} />} label="Relatórios" active={pathname === '/relatorios'} />
                            <NavItem href="/fechamento" icon={<DollarSign size={18} />} label="Fechamento" active={pathname === '/fechamento'} />
                            <NavItem href="/config/usuarios" icon={<Users size={18} />} label="Equipe" active={pathname === '/config/usuarios'} />
                        </>
                    )}
                </nav>
            </div>

            <div className="pb-4">
                <nav className="space-y-1.5 focus-within:outline-none">
                    <button 
                        onClick={handleLogout}
                        className="w-full flex items-center gap-3 px-8 py-3.5 text-[#ff4a4a] hover:text-white hover:bg-red-500/10 transition-all duration-300 rounded-r-full group"
                    >
                        <LogOut size={18} className="group-hover:scale-110 transition-transform" />
                        <span className="text-[13px] font-medium">Sair</span>
                    </button>
                </nav>
            </div>
        </aside>
    );
}

function NavItem({ href, icon, label, active = false, textClass = '', iconClass = '' }: { href: string, icon: React.ReactNode, label: string, active?: boolean, textClass?: string, iconClass?: string }) {
    return (
        <Link href={href}
            className={`flex items-center gap-3 px-8 py-3.5 transition-all duration-300 relative group
                ${active
                    ? 'text-black font-semibold'
                    : 'text-[#A7A7A7] hover:text-white'
                }`}
        >
            {/* Active Background Pill */}
            {active && (
                <div className="absolute inset-y-0 left-4 right-0 bg-[#E85002] rounded-full shadow-[0_4px_15_px_rgba(232,80,2,0.5)] -z-10" />
            )}

            <span className={`relative z-10 transition-colors ${active ? 'text-white' : iconClass || 'text-[#646464] group-hover:text-white'}`}>
                {icon}
            </span>
            <span className={`text-[13px] relative z-10 transition-colors ${active ? 'text-white font-bold' : textClass || 'font-medium'}`}>
                {label}
            </span>
        </Link>
    );
}
