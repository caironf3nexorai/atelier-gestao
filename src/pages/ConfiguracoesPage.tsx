import React, { useState, useEffect, useRef } from 'react';
import { Save, Upload, Database, User, Loader2 } from 'lucide-react';
import { useStore } from '../store/useStore';

export function ConfiguracoesPage() {
    const { settings, fetchSettings, updateSettings, uploadLogo } = useStore();
    const [studioName, setStudioName] = useState("");
    const [uploading, setUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        fetchSettings();
    }, []);

    useEffect(() => {
        if (settings.studio_name) {
            setStudioName(settings.studio_name);
        }
    }, [settings]);

    const handleSave = () => {
        updateSettings({ studio_name: studioName });
    };

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploading(true);
        const publicUrl = await uploadLogo(file);
        if (publicUrl) {
            await updateSettings({ logo_url: publicUrl });
        }
        setUploading(false);
    };

    return (
        <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <header>
                <h1 className="text-3xl font-bold text-slate-800">Configurações</h1>
                <p className="text-slate-500 mt-1">Gerencie os dados do seu ateliê e perfil.</p>
            </header>

            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="p-6 border-b border-slate-100 bg-slate-50/50">
                    <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                        <Database size={20} className="text-brand-600" />
                        Dados do Ateliê
                    </h2>
                </div>

                <div className="p-6 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-2">Nome do Estúdio</label>
                            <input
                                type="text"
                                value={studioName}
                                onChange={(e) => setStudioName(e.target.value)}
                                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500 transition-all font-medium"
                                placeholder="Ex: Ateliê de Cerâmica"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-2">Logo</label>
                            <input
                                type="file"
                                ref={fileInputRef}
                                className="hidden"
                                accept="image/*"
                                onChange={handleFileSelect}
                            />

                            <div
                                className="relative border-2 border-dashed border-slate-200 rounded-xl p-6 flex flex-col items-center justify-center text-slate-400 hover:bg-slate-50 hover:border-brand-300 transition-all group overflow-hidden"
                            >
                                {settings.logo_url ? (
                                    <div className="flex flex-col items-center">
                                        <div
                                            onClick={() => fileInputRef.current?.click()}
                                            className="cursor-pointer flex flex-col items-center"
                                        >
                                            <img src={settings.logo_url} alt="Logo" className="h-24 w-24 rounded-full object-cover mb-4 border-2 border-slate-200 shadow-sm" />
                                            <span className="text-sm font-medium text-brand-600">Clique para alterar</span>
                                        </div>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                if (confirm('Tem certeza que deseja remover a logo?')) {
                                                    useStore.getState().removeLogo();
                                                }
                                            }}
                                            className="mt-4 text-xs text-red-500 hover:text-red-700 hover:bg-red-50 px-3 py-1 rounded-full transition-colors font-medium border border-transparent hover:border-red-100"
                                        >
                                            Remover Logo
                                        </button>
                                    </div>
                                ) : (
                                    <div
                                        onClick={() => fileInputRef.current?.click()}
                                        className="cursor-pointer flex flex-col items-center w-full h-full"
                                    >
                                        <Upload size={24} className="mb-2 group-hover:text-brand-500" />
                                        <span className="text-sm font-medium">Clique para enviar uma imagem</span>
                                    </div>
                                )}

                                {uploading && (
                                    <div className="absolute inset-0 bg-white/80 flex items-center justify-center z-10">
                                        <Loader2 className="animate-spin text-brand-600" />
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
                <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end">
                    <button
                        onClick={handleSave}
                        className="bg-brand-600 text-white px-6 py-2 rounded-xl font-bold hover:bg-brand-700 transition-all shadow-lg shadow-brand-200 flex items-center gap-2"
                    >
                        <Save size={18} />
                        Salvar Alterações
                    </button>
                </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="p-6 border-b border-slate-100 bg-slate-50/50">
                    <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                        <User size={20} className="text-blue-600" />
                        Perfil de Acesso
                    </h2>
                </div>
                <div className="p-6">
                    <div className="bg-yellow-50 text-yellow-800 p-4 rounded-xl border border-yellow-200 text-sm">
                        ⚠️ O gerenciamento de usuários estará disponível em breve.
                    </div>
                </div>
            </div>

            <div className="text-center pt-8 text-slate-400 text-sm">
                Versão 2.5.0 • Desenvolvido com ❤️
            </div>
        </div>
    );
}
