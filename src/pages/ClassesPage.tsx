import React, { useState } from 'react';
import { useStore } from '../store/useStore';
import type { ClassGroup, WeekDay, ActivityType } from '../types';

export function ClassesPage() {
    const { classes, addClass, updateClass, deleteClass, students } = useStore();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingClass, setEditingClass] = useState<ClassGroup | null>(null);

    const [formData, setFormData] = useState<Partial<ClassGroup>>({
        name: '',
        day_of_week: 1,
        time: '',
        activities: []
    });

    const openModal = (cls?: ClassGroup) => {
        if (cls) {
            setEditingClass(cls);
            // Garantir que activities seja um array
            setFormData({ ...cls, activities: cls.activities || [] });
        } else {
            setEditingClass(null);
            setFormData({ name: '', day_of_week: 1, time: '', activities: [] });
        }
        setIsModalOpen(true);
    };

    const handleSave = (e: React.FormEvent) => {
        e.preventDefault();
        if (editingClass) {
            updateClass(editingClass.id, formData);
        } else {
            // Garantir que activities seja um array ao criar
            addClass({ ...formData, activities: formData.activities || [] } as ClassGroup);
        }
        setIsModalOpen(false);
    };

    const handleDelete = (id: string) => {
        const hasStudents = students.some(s => s.class_id === id);
        if (hasStudents) {
            alert("Não é possível excluir esta turma pois existem alunas matriculadas nela.");
            return;
        }
        if (confirm("Tem certeza que deseja excluir esta turma?")) {
            deleteClass(id);
        }
    };

    const toggleActivity = (activity: ActivityType) => {
        const current = formData.activities || [];
        if (current.includes(activity)) {
            setFormData({ ...formData, activities: current.filter(a => a !== activity) });
        } else {
            setFormData({ ...formData, activities: [...current, activity] });
        }
    };

    const weekDays: { id: WeekDay, label: string }[] = [
        { id: 0, label: 'Domingo' },
        { id: 1, label: 'Segunda-feira' },
        { id: 2, label: 'Terça-feira' },
        { id: 3, label: 'Quarta-feira' },
        { id: 4, label: 'Quinta-feira' },
        { id: 5, label: 'Sexta-feira' },
        { id: 6, label: 'Sábado' },
    ];

    const getWeekDayLabel = (day: number) => weekDays.find(d => d.id === day)?.label || 'Desconhecido';

    return (
        <div className="p-8 space-y-6">
            <header className="flex justify-between items-center">
                <h1 className="text-3xl font-bold text-slate-800">Turmas</h1>
                <button
                    onClick={() => openModal()}
                    className="bg-brand-600 hover:bg-brand-700 text-white px-5 py-2.5 rounded-xl font-bold transition-all shadow-sm flex items-center gap-2"
                >
                    + Nova Turma
                </button>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {classes.map(cls => (
                    <div key={cls.id} className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow relative group">
                        <div className="flex justify-between items-start mb-4">
                            <div>
                                <h3 className="font-bold text-lg text-slate-800">{cls.name}</h3>
                                <p className="text-brand-600 font-medium">{cls.time}</p>
                            </div>
                            <div className="flex flex-col items-end gap-1">
                                <span className="px-3 py-1 bg-slate-100 text-slate-600 text-xs font-bold uppercase rounded-full">
                                    {getWeekDayLabel(cls.day_of_week)}
                                </span>
                                {(cls.activities || []).map(act => (
                                    <span key={act} className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${act === 'ceramica' ? 'text-orange-600 bg-orange-100' :
                                            act === 'bordado' ? 'text-pink-600 bg-pink-100' :
                                                'text-blue-600 bg-blue-100'
                                        }`}>
                                        {act}
                                    </span>
                                ))}
                            </div>
                        </div>

                        <div className="text-sm text-slate-500 mb-6">
                            {students.filter(s => s.class_id === cls.id).length} alunas matriculadas
                        </div>

                        <div className="flex gap-2">
                            <button
                                onClick={() => openModal(cls)}
                                className="flex-1 px-3 py-2 text-sm font-bold text-slate-600 bg-slate-50 hover:bg-slate-100 rounded-lg transition-colors border border-slate-200"
                            >
                                Editar
                            </button>
                            <button
                                onClick={() => handleDelete(cls.id)}
                                className="px-3 py-2 text-sm font-bold text-red-500 bg-red-50 hover:bg-red-100 rounded-lg transition-colors border border-red-100"
                            >
                                Excluir
                            </button>
                        </div>
                    </div>
                ))}

                {classes.length === 0 && (
                    <div className="col-span-full p-12 text-center border-2 border-dashed border-slate-200 rounded-xl text-slate-400">
                        Nenhuma turma cadastrada.
                    </div>
                )}
            </div>

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
                        <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                            <h2 className="text-xl font-bold text-slate-800">
                                {editingClass ? 'Editar Turma' : 'Nova Turma'}
                            </h2>
                            <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">✕</button>
                        </div>

                        <form onSubmit={handleSave} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-1">Nome da Turma</label>
                                <input
                                    type="text"
                                    required
                                    className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500 transition-all font-medium"
                                    placeholder="Ex: Ballet Infantil I"
                                    value={formData.name}
                                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-1">Dia da Semana</label>
                                    <select
                                        className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500 transition-all font-medium bg-white"
                                        value={formData.day_of_week}
                                        onChange={e => setFormData({ ...formData, day_of_week: Number(e.target.value) as WeekDay })}
                                    >
                                        {weekDays.map(d => (
                                            <option key={d.id} value={d.id}>{d.label}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-1">Horário</label>
                                    <input
                                        type="time"
                                        required
                                        className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500 transition-all font-medium"
                                        value={formData.time}
                                        onChange={e => setFormData({ ...formData, time: e.target.value })}
                                    />
                                </div>
                                <div className="col-span-2">
                                    <label className="block text-sm font-bold text-slate-700 mb-1">Atividades (Múltipla Escolha)</label>
                                    <div className="flex gap-4">
                                        <label className="flex items-center gap-2 cursor-pointer border p-3 rounded-xl hover:bg-orange-50 has-[:checked]:bg-orange-50 has-[:checked]:border-orange-500 transition-all flex-1 select-none">
                                            <input
                                                type="checkbox"
                                                checked={(formData.activities || []).includes('ceramica')}
                                                onChange={() => toggleActivity('ceramica')}
                                                className="accent-orange-600 w-5 h-5 rounded"
                                            />
                                            <span className="font-medium text-slate-700">Cerâmica</span>
                                        </label>
                                        <label className="flex items-center gap-2 cursor-pointer border p-3 rounded-xl hover:bg-pink-50 has-[:checked]:bg-pink-50 has-[:checked]:border-pink-500 transition-all flex-1 select-none">
                                            <input
                                                type="checkbox"
                                                checked={(formData.activities || []).includes('bordado')}
                                                onChange={() => toggleActivity('bordado')}
                                                className="accent-pink-600 w-5 h-5 rounded"
                                            />
                                            <span className="font-medium text-slate-700">Bordado</span>
                                        </label>
                                        <label className="flex items-center gap-2 cursor-pointer border p-3 rounded-xl hover:bg-blue-50 has-[:checked]:bg-blue-50 has-[:checked]:border-blue-500 transition-all flex-1 select-none">
                                            <input
                                                type="checkbox"
                                                checked={(formData.activities || []).includes('pintura')}
                                                onChange={() => toggleActivity('pintura')}
                                                className="accent-blue-600 w-5 h-5 rounded"
                                            />
                                            <span className="font-medium text-slate-700">Pintura</span>
                                        </label>
                                    </div>
                                </div>
                            </div>

                            <div className="pt-4 flex gap-3">
                                <button
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    className="flex-1 px-4 py-3 rounded-xl font-bold text-slate-500 hover:bg-slate-50 transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 px-4 py-3 rounded-xl font-bold text-white bg-brand-600 hover:bg-brand-700 shadow-lg shadow-brand-200 transition-all transform active:scale-95"
                                >
                                    Salvar
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
