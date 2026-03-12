'use client';

import { useState, useEffect } from 'react';
import { pb } from '@/lib/pb';
import { Users, UserPlus, Shield, Trash2, Mail, User as UserIcon, Loader2 } from 'lucide-react';

interface UserRecord {
    id: string;
    username: string;
    email: string;
    name: string;
    role: 'admin' | 'attendant';
}

export default function UserManagementPage() {
    const [users, setUsers] = useState<UserRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [formData, setFormData] = useState({
        username: '',
        password: '',
        passwordConfirm: '',
        name: '',
        role: 'attendant' as 'admin' | 'attendant'
    });

    const loadUsers = async () => {
        setLoading(true);
        try {
            const records = await pb.collection('users').getFullList<UserRecord>();
            setUsers(records);
        } catch (err) {
            console.error('Error loading users:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        // Refresh session to ensure latest role is available in local authStore
        const refreshAuth = async () => {
             try {
                 await pb.collection('users').authRefresh();
                 console.log('Auth session refreshed.');
             } catch (e) {
                 console.error('Failed to refresh auth session:', e);
             }
        };
        refreshAuth();
        loadUsers();
    }, []);

    const handleCreateUser = async (e: React.FormEvent) => {
        e.preventDefault();
        if (formData.password !== formData.passwordConfirm) {
            alert('As senhas não coincidem!');
            return;
        }

        setSubmitting(true);
        try {
            // PocketBase default email logic (we'll generate a dummy one since user wants username-based)
            const userData = {
                username: formData.username,
                password: formData.password,
                passwordConfirm: formData.passwordConfirm,
                name: formData.name,
                email: `${formData.username}@darkstore.internal`,
                role: formData.role,
                emailVisibility: true
            };

            await pb.collection('users').create(userData);
            setIsModalOpen(false);
            setFormData({ username: '', password: '', passwordConfirm: '', name: '', role: 'attendant' });
            loadUsers();
        } catch (err: any) {
            console.error('Error creating user:', err);
            alert('Erro ao criar usuário: ' + (err.message || 'Verifique os dados.'));
        } finally {
            setSubmitting(false);
        }
    };

    const handleDeleteUser = async (id: string) => {
        if (id === pb.authStore.model?.id) {
            alert('Você não pode excluir a sua própria conta ativa!');
            return;
        }

        const confirmDelete = window.confirm('Deseja realmente excluir este funcionário?');
        if (!confirmDelete) return;
        
        setDeletingId(id);
        try {
            console.log('Attempting to delete user:', id);
            await pb.collection('users').delete(id);
            alert('Usuário excluído com sucesso!');
            loadUsers();
        } catch (err: any) {
            console.error('Error deleting user:', err);
            const errorMsg = err.data?.message || err.message || 'Erro desconhecido';
            alert(`Erro ao excluir usuário: ${errorMsg}\n\nDetalhes: ${JSON.stringify(err.data || {})}`);
        } finally {
            setDeletingId(null);
        }
    };

    return (
        <div className="flex-1 overflow-y-auto p-8 bg-black">
            <header className="flex justify-between items-center mb-10">
                <div>
                    <h1 className="text-2xl font-black text-white uppercase tracking-tight mb-1">Gestão da Equipe</h1>
                    <p className="text-[#A7A7A7] text-sm">Gerencie administradores e vendedores do sistema.</p>
                </div>

                <button 
                    onClick={() => setIsModalOpen(true)}
                    className="flex items-center gap-2 px-6 py-3 bg-[#E85002] hover:bg-[#ff5a0b] text-white rounded-2xl text-sm font-black uppercase tracking-widest transition-all shadow-lg shadow-[#E85002]/20"
                >
                    <UserPlus size={18} />
                    Adicionar Membro
                </button>
            </header>

            {loading ? (
                <div className="flex flex-col items-center justify-center h-[60vh] text-[#333]">
                    <Loader2 size={48} className="animate-spin mb-4" />
                    <p className="font-bold uppercase tracking-[0.2em] text-xs">Carregando Equipe...</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {users.map((user) => (
                        <div key={user.id} className="bg-[#0A0A0A] border border-[#151515] rounded-[32px] p-6 hover:border-[#E85002]/30 transition-all group relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-24 h-24 bg-[#E85002]/5 rounded-full -mr-10 -mt-10 blur-2xl group-hover:scale-150 transition-transform duration-700"></div>
                            
                            <div className="flex justify-between items-start mb-6">
                                <div className="w-14 h-14 bg-[#111] border border-[#222] rounded-2xl flex items-center justify-center text-[#E85002]">
                                    <UserIcon size={28} />
                                </div>
                                <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${user.role === 'admin' ? 'bg-purple-500/10 text-purple-500' : 'bg-blue-500/10 text-blue-500'}`}>
                                    {user.role}
                                </span>
                            </div>

                            <div className="mb-6">
                                <h3 className="text-lg font-black text-white uppercase tracking-tight">{user.name || user.username}</h3>
                                <p className="text-[#444] text-[10px] font-bold uppercase tracking-widest mt-1">@{user.username}</p>
                            </div>

                            <div className="flex gap-2">
                                <button 
                                    disabled={deletingId === user.id}
                                    onClick={() => handleDeleteUser(user.id)}
                                    className={`p-3 rounded-xl transition-all border flex items-center justify-center min-w-[44px] min-h-[44px]
                                        ${deletingId === user.id 
                                            ? 'bg-red-500/20 text-red-500 border-red-500/20' 
                                            : 'bg-red-500/10 hover:bg-red-500/20 text-red-500 border-red-500/10 hover:border-red-500/30'}`}
                                >
                                    {deletingId === user.id ? <Loader2 size={18} className="animate-spin" /> : <Trash2 size={18} />}
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Create User Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-[130] flex items-center justify-center p-4 bg-black/95 backdrop-blur-2xl">
                    <div className="bg-[#0A0A0A] border border-[#222] rounded-[40px] w-full max-w-lg shadow-[0_0_100px_rgba(0,0,0,0.8)] overflow-hidden">
                        <form onSubmit={handleCreateUser} className="p-10">
                            <div className="flex items-center gap-4 mb-8">
                                <div className="w-12 h-12 bg-[#E85002]/10 rounded-2xl flex items-center justify-center border border-[#E85002]/20">
                                    <UserPlus size={24} className="text-[#E85002]" />
                                </div>
                                <div>
                                    <h2 className="text-xl font-black text-white uppercase tracking-tight">Novo Funcionário</h2>
                                    <p className="text-[10px] text-[#444] font-bold uppercase tracking-widest">Preencha os dados de acesso</p>
                                </div>
                            </div>

                            <div className="space-y-4 mb-8">
                                <div>
                                    <label className="text-[10px] font-black text-[#333] uppercase tracking-widest mb-2 block px-1">Nome Completo</label>
                                    <input 
                                        type="text" 
                                        required
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        className="w-full bg-black border border-[#151515] rounded-2xl p-4 text-white focus:outline-none focus:border-[#E85002]/50 transition-all"
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-[10px] font-black text-[#333] uppercase tracking-widest mb-2 block px-1">Usuário (Login)</label>
                                        <input 
                                            type="text" 
                                            required
                                            value={formData.username}
                                            onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                                            className="w-full bg-black border border-[#151515] rounded-2xl p-4 text-white focus:outline-none focus:border-[#E85002]/50 transition-all font-bold"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-black text-[#333] uppercase tracking-widest mb-2 block px-1">Papel</label>
                                        <select 
                                            value={formData.role}
                                            onChange={(e) => setFormData({ ...formData, role: e.target.value as any })}
                                            className="w-full bg-black border border-[#151515] rounded-2xl p-4 text-white focus:outline-none focus:border-[#E85002]/50 transition-all appearance-none font-bold"
                                        >
                                            <option value="attendant">Vendedor</option>
                                            <option value="admin">Administrador</option>
                                        </select>
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-[10px] font-black text-[#333] uppercase tracking-widest mb-2 block px-1">Senha</label>
                                        <input 
                                            type="password" 
                                            required
                                            value={formData.password}
                                            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                            className="w-full bg-black border border-[#151515] rounded-2xl p-4 text-white focus:outline-none focus:border-[#E85002]/50 transition-all"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-black text-[#333] uppercase tracking-widest mb-2 block px-1">Confirmar</label>
                                        <input 
                                            type="password" 
                                            required
                                            value={formData.passwordConfirm}
                                            onChange={(e) => setFormData({ ...formData, passwordConfirm: e.target.value })}
                                            className="w-full bg-black border border-[#151515] rounded-2xl p-4 text-white focus:outline-none focus:border-[#E85002]/50 transition-all"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="flex gap-4">
                                <button 
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    className="flex-1 py-5 bg-[#111] hover:bg-[#151515] text-[#444] hover:text-white rounded-3xl font-black text-sm uppercase tracking-widest transition-all border border-[#151515]"
                                >
                                    Cancelar
                                </button>
                                <button 
                                    type="submit"
                                    disabled={submitting}
                                    className="flex-[2] py-5 bg-[#E85002] hover:bg-[#ff5a0b] text-white rounded-3xl font-black text-sm uppercase tracking-[0.2em] transition-all shadow-lg shadow-[#E85002]/20 disabled:opacity-50"
                                >
                                    {submitting ? 'CRIANDO...' : 'CRIAR ACESSO'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
