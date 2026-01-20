import React, { useState, useEffect } from 'react'; // Added useEffect
import { Menu, X, Home, Users, Calendar, Settings, LogOut, DollarSign } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { clsx } from 'clsx';
import { useStore } from '../store/useStore'; // Import useStore

export function Layout({ children }: { children: React.ReactNode }) {
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const location = useLocation();
    const { settings, fetchSettings } = useStore(); // Get settings

    useEffect(() => {
        fetchSettings(); // Ensure settings are loaded on mount
    }, []);

    const links = [
        { to: '/', icon: Home, label: 'Início' },
        { to: '/chamada', icon: Calendar, label: 'Chamada' },
        { to: '/turmas', icon: Users, label: 'Turmas' }, // Re-added Turmas (using Users icon for now or Calendar if preferred, previous code used Calendar for both Chamada and Turmas, maybe use a different icon like 'BookOpen' or 'GraduationCap' if available, but I'll stick to what was likely intended or standard. The hardcoded JSX used Calendar. Let's checks imports)
        { to: '/alunas', icon: Users, label: 'Alunas' },
        { to: '/financeiro', icon: DollarSign, label: 'Financeiro' },
        { to: '/configuracoes', icon: Settings, label: 'Configurações' },
    ];

    return (
        <div className="min-h-screen bg-brand-50 flex">
            {/* Mobile Sidebar Overlay */}
            {isSidebarOpen && (
                <div
                    className="fixed inset-0 bg-black/50 z-20 lg:hidden"
                    onClick={() => setIsSidebarOpen(false)}
                />
            )}

            {/* Sidebar */}
            <aside
                className={clsx(
                    "fixed lg:static inset-y-0 left-0 z-30 w-64 bg-white border-r border-brand-100 shadow-sm transition-transform duration-200 ease-in-out lg:translate-x-0",
                    isSidebarOpen ? "translate-x-0" : "-translate-x-full"
                )}
            >
                <div className="h-20 flex items-center gap-4 px-6 border-b border-brand-100 bg-brand-50/50">
                    {settings.logo_url ? (
                        <img src={settings.logo_url} alt="Logo" className="h-14 w-14 rounded-full object-cover border-2 border-white shadow-sm" />
                    ) : (
                        <div className="h-12 w-12 bg-brand-100 rounded-full flex items-center justify-center text-brand-600 font-bold text-xl shadow-sm border-2 border-white">
                            {settings.studio_name.charAt(0)}
                        </div>
                    )}
                    <h1 className="text-lg font-bold text-brand-700 font-serif leading-tight max-w-[140px] break-words" title={settings.studio_name}>
                        {settings.studio_name}
                    </h1>
                </div>

                <nav className="p-4 space-y-2 flex-1 overflow-y-auto">
                    {links.map((link) => (
                        <Link
                            key={link.to}
                            to={link.to}
                            className={clsx(
                                "flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-medium",
                                location.pathname === link.to
                                    ? "bg-brand-100 text-brand-700 shadow-sm"
                                    : "text-slate-600 hover:bg-slate-50 hover:text-brand-600 hover:translate-x-1"
                            )}
                        >
                            <link.icon size={20} />
                            {link.label}
                        </Link>
                    ))}
                </nav>

                <div className="p-4 border-t border-brand-100 bg-brand-50/30">
                    <button className="flex items-center gap-3 px-4 py-3 w-full rounded-xl text-slate-600 hover:bg-red-50 hover:text-red-500 transition-colors">
                        <LogOut size={20} />
                        <span className="font-medium">Sair</span>
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <div className="flex-1 flex flex-col min-w-0">
                <header className="h-16 bg-white border-b border-brand-100 flex items-center px-4 justify-between lg:hidden sticky top-0 z-10 shadow-sm">
                    <div className="flex items-center gap-3 overflow-hidden">
                        {settings.logo_url && <img src={settings.logo_url} alt="Logo" className="h-10 w-10 rounded-full object-cover border border-slate-100" />}
                        <h1 className="text-lg font-bold text-brand-600 font-serif truncate">{settings.studio_name}</h1>
                    </div>
                    <button
                        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                        className="p-2 text-brand-600 hover:bg-brand-50 rounded-lg"
                    >
                        {isSidebarOpen ? <X size={24} /> : <Menu size={24} />}
                    </button>
                </header>

                <main className="flex-1 p-4 lg:p-8 overflow-y-auto">
                    <div className="max-w-5xl mx-auto">
                        {children}
                    </div>
                </main>
            </div>
        </div>
    );
}
