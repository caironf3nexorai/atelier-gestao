import { useState } from 'react';
import { Plus, Search, Edit2, Trash2, Phone } from 'lucide-react';
import { useStore } from '../store/useStore';
import { DAYS_OF_WEEK } from '../types';
import { StudentForm } from '../components/StudentForm';

export function StudentList() {
    const { students, classes, deleteStudent } = useStore();
    const [searchTerm, setSearchTerm] = useState('');
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingStudent, setEditingStudent] = useState<import('../types').Student | null>(null);

    const filteredStudents = students.filter(student =>
        student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        student.parent_name?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const calculateAge = (birthDate?: string) => {
        if (!birthDate) return 'N/A';
        const today = new Date();
        const birth = new Date(birthDate);
        let age = today.getFullYear() - birth.getFullYear();
        const m = today.getMonth() - birth.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
            age--;
        }
        return age;
    };

    const getClassName = (classId?: string) => {
        const cls = classes.find(c => c.id === classId);
        return cls ? `${DAYS_OF_WEEK[cls.day_of_week]} - ${cls.time}` : 'Sem Turma';
    };

    return (
        <div className="space-y-6">
            {isFormOpen && (
                <StudentForm
                    onClose={() => setIsFormOpen(false)}
                    student={editingStudent}
                />
            )}

            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800">Alunos</h2>
                    <p className="text-slate-500">Gerencie todos os alunos matriculados</p>
                </div>
                <button
                    onClick={() => {
                        setEditingStudent(null);
                        setIsFormOpen(true);
                    }}
                    className="bg-brand-600 text-white px-4 py-2 rounded-xl flex items-center gap-2 hover:bg-brand-700 transition-colors shadow-sm shadow-brand-200"
                >
                    <Plus size={20} />
                    Novo Aluno
                </button>
            </div>

            {/* Search Bar */}
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                <input
                    type="text"
                    placeholder="Buscar..."
                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-all"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>

            {/* List */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredStudents.map((student) => (
                    <div key={student.id} className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow group relative">
                        <div className="flex justify-between items-start mb-3">
                            <div className="flex-1 min-w-0 pr-8">
                                <div className="flex items-center gap-2 flex-wrap">
                                    <h3 className="font-bold text-lg text-slate-800 truncate">{student.name}</h3>
                                    <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full shrink-0">
                                        {student.birth_date ? `${calculateAge(student.birth_date)} anos` : 'Idade N/A'}
                                    </span>
                                </div>
                                <div className="flex flex-wrap gap-2 mt-2">
                                    <span className="text-sm font-medium text-brand-600 bg-brand-50 px-2 py-1 rounded-md">
                                        {getClassName(student.class_id)}
                                    </span>
                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600 border border-slate-200">
                                        {student.plan}
                                    </span>
                                    {student.pause_period && (
                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-100 text-purple-700 border border-purple-200">
                                            🌴 Pausa
                                        </span>
                                    )}
                                </div>
                            </div>
                            <div className="absolute top-4 right-4 flex gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity bg-white pl-2">
                                <button
                                    onClick={() => {
                                        setEditingStudent(student);
                                        setIsFormOpen(true);
                                    }}
                                    className="p-2 text-slate-400 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition-colors"
                                >
                                    <Edit2 size={18} />
                                </button>
                                <button
                                    onClick={() => deleteStudent(student.id)}
                                    className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                >
                                    <Trash2 size={18} />
                                </button>
                            </div>
                        </div>

                        <div className="space-y-2 text-sm text-slate-600 border-t border-slate-50 pt-3 mt-3">
                            {student.parent_name && (
                                <div className="flex items-center gap-2">
                                    <span className="text-slate-400">Resp:</span>
                                    <span className="font-medium truncate">{student.parent_name}</span>
                                </div>
                            )}
                            {student.phone && (
                                <div className="flex items-center gap-2">
                                    <Phone size={14} className="text-slate-400" />
                                    <a href={`https://wa.me/55${student.phone}`} target="_blank" rel="noreferrer" className="hover:text-green-600 hover:underline truncate">
                                        {student.phone}
                                    </a>
                                </div>
                            )}
                        </div>
                    </div>
                ))}

                {filteredStudents.length === 0 && (
                    <div className="col-span-full text-center py-12 text-slate-400">
                        Nenhuma aluna encontrada.
                    </div>
                )}
            </div>
        </div>
    );
}
