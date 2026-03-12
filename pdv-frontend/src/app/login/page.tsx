'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { pb } from '@/lib/pb';
import { User, Lock, ArrowRight, AlertCircle } from 'lucide-react';

export default function LoginPage() {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    useEffect(() => {
        // If already logged in, go to home
        if (pb.authStore.isValid) {
            router.push('/');
        }
    }, [router]);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            // PocketBase allows auth with username or email via this method
            const authData = await pb.collection('users').authWithPassword(username, password);
            
            // Immediate redirection based on role
            const role = authData.record.role || 'attendant';
            if (role === 'attendant') {
                router.push('/pdv');
            } else {
                router.push('/');
            }
            
            router.refresh();
        } catch (err: any) {
            console.error('Login error:', err);
            setError('Usuário ou senha inválidos.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen w-full bg-black flex items-center justify-center p-6 relative overflow-hidden">
            {/* Background Decorative Elements */}
            <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-[#E85002]/10 blur-[120px] rounded-full"></div>
            <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-[#FF8A00]/10 blur-[120px] rounded-full"></div>

            <div className="w-full max-w-md relative z-10 transition-all duration-700 animate-in fade-in slide-in-from-bottom-8">
                {/* Logo Section */}
                <div className="flex flex-col items-center mb-10">
                    <div className="flex items-center gap-4 mb-6">
                        {/* Dark Store Logo/Icon (Lobo) */}
                        <div className="w-14 h-14 rounded-2xl bg-[#111] border border-[#222] flex items-center justify-center shadow-[0_0_30px_rgba(232,80,2,0.2)] transform hover:rotate-12 transition-transform duration-500 overflow-hidden p-1.5">
                            <img 
                                src="/lobo.png" 
                                alt="Dark Store" 
                                className="w-full h-full object-contain"
                            />
                        </div>
                        
                        {/* MonsterFit Logo */}
                        <div className="w-14 h-14 rounded-2xl bg-[#111] border border-[#222] flex items-center justify-center shadow-inner overflow-hidden">
                            <img 
                                src="/monsterfit-logo.png.PNG" 
                                alt="Monster Fit" 
                                className="w-full h-full object-contain p-1.5"
                            />
                        </div>
                    </div>

                    <div className="text-center">
                        <h1 className="text-3xl font-black text-white tracking-tight uppercase">Dark Store</h1>
                        <p className="text-[#E85002] text-xs font-black uppercase tracking-[0.2em] mt-1">Loja MonsterFit</p>
                        <p className="text-[#A7A7A7] text-[9px] font-bold uppercase tracking-[0.3em] mt-4">Sistema de Vendas PDV Professional</p>
                    </div>
                </div>

                {/* Login Card */}
                <div className="bg-[#0A0A0A] border border-white/5 rounded-[40px] p-10 shadow-[0_20px_50px_rgba(0,0,0,0.5)] backdrop-blur-xl relative overflow-hidden group">
                    {/* Top glass reflection */}
                    <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent"></div>
                    
                    <form onSubmit={handleLogin} className="space-y-6">
                        {error && (
                            <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-4 flex items-center gap-3 text-red-500 text-sm font-medium animate-in fade-in zoom-in-95">
                                <AlertCircle size={18} />
                                {error}
                            </div>
                        )}

                        <div className="space-y-4">
                            <div className="relative group/input">
                                <label className="text-[10px] font-black text-[#333] uppercase tracking-widest mb-2 block px-1 group-focus-within/input:text-[#E85002] transition-colors">
                                    Usuário
                                </label>
                                <div className="relative">
                                    <div className="absolute left-5 top-1/2 -translate-y-1/2 text-[#333] group-focus-within/input:text-[#E85002] transition-colors">
                                        <User size={18} />
                                    </div>
                                    <input 
                                        type="text" 
                                        required
                                        value={username}
                                        onChange={(e) => setUsername(e.target.value)}
                                        placeholder="Seu nome de usuário"
                                        className="w-full bg-black border border-[#151515] rounded-2xl py-4 pl-14 pr-6 text-white placeholder:text-[#222] focus:outline-none focus:border-[#E85002]/50 transition-all font-medium"
                                    />
                                </div>
                            </div>

                            <div className="relative group/input">
                                <label className="text-[10px] font-black text-[#333] uppercase tracking-widest mb-2 block px-1 group-focus-within/input:text-[#E85002] transition-colors">
                                    Senha
                                </label>
                                <div className="relative">
                                    <div className="absolute left-5 top-1/2 -translate-y-1/2 text-[#333] group-focus-within/input:text-[#E85002] transition-colors">
                                        <Lock size={18} />
                                    </div>
                                    <input 
                                        type="password" 
                                        required
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        placeholder="••••••••"
                                        className="w-full bg-black border border-[#151515] rounded-2xl py-4 pl-14 pr-6 text-white placeholder:text-[#222] focus:outline-none focus:border-[#E85002]/50 transition-all font-medium tracking-widest"
                                    />
                                </div>
                            </div>
                        </div>

                        <button 
                            type="submit"
                            disabled={loading}
                            className="w-full py-5 bg-[#E85002] hover:bg-[#ff5a0b] text-white rounded-3xl font-black text-sm uppercase tracking-[0.2em] transition-all shadow-lg shadow-[#E85002]/20 flex items-center justify-center gap-3 group/btn disabled:opacity-50"
                        >
                            {loading ? (
                                <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                            ) : (
                                <>
                                    Entrar no Sistema
                                    <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                                </>
                            )}
                        </button>
                    </form>
                </div>

                <p className="text-center mt-8 text-[#222] text-[10px] font-bold uppercase tracking-widest">
                    Dark Store PDV Pro &copy; 2026
                </p>
            </div>
        </div>
    );
}
