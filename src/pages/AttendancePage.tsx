import { useState, useMemo, useEffect } from 'react';
import { useStore } from '../store/useStore';
import type { WeekDay } from '../types';

export function AttendancePage() {
    const { classes, students, attendance, makeupCredits, markAttendance, addMakeupStudent } = useStore();
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [selectedClassId, setSelectedClassId] = useState<string | null>(null);
    const [showMakeupSelector, setShowMakeupSelector] = useState(false);

    // --- Helpers Nativos ---
    const addDays = (date: Date, days: number) => {
        const result = new Date(date);
        result.setDate(result.getDate() + days);
        return result;
    };

    const formatDate = (date: Date, options: Intl.DateTimeFormatOptions) => {
        return new Intl.DateTimeFormat('pt-BR', options).format(date);
    };

    const getISODateLocal = (d: Date) => {
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    const dateStr = getISODateLocal(selectedDate);
    // -----------------------

    // 1. Filtrar turmas pelo dia da semana
    const currentDayOfWeek = selectedDate.getDay() as WeekDay;
    const classesToday = classes.filter(c => c.day_of_week === currentDayOfWeek);

    // 2. Auto-selecionar turma
    useEffect(() => {
        if (classesToday.length > 0) {
            // Se a selecionada não estiver na lista de hoje, pega a primeira
            if (!selectedClassId || !classesToday.find(c => c.id === selectedClassId)) {
                setSelectedClassId(classesToday[0].id);
            }
        } else {
            setSelectedClassId(null);
        }
    }, [currentDayOfWeek, classesToday.length]);

    // 3. Filtrar Alunas Regulares
    const regularStudents = useMemo(() => {
        if (!selectedClassId) return [];
        return students.filter(s => (s.class_id === selectedClassId || s.class_id_2 === selectedClassId) && s.active);
    }, [selectedClassId, students]);

    // 4. Filtrar Alunas de Reposição (Alunas com registro nesta turma/data mas que NÃO são da turma regular)
    const makeupStudents = useMemo(() => {
        if (!selectedClassId) return [];

        // Busca TODAS as alunas que têm registro nesta data e turma
        const recordsInClass = attendance.filter(r =>
            r.date === dateStr &&
            r.class_id === selectedClassId
        );

        // Filtra apenas aquelas que NÃO são da turma regular (evita duplicar com a lista de cima)
        const extraRecords = recordsInClass.filter(r => {
            const student = students.find(s => s.id === r.student_id);
            return student && student.class_id !== selectedClassId;
        });

        // Deduplicate records just in case (safety net)
        const uniqueExtraRecords = [...new Map(extraRecords.map(item => [item.student_id, item])).values()];

        // Retorna os objetos de aluno
        return uniqueExtraRecords.map(r => students.find(s => s.id === r.student_id)).filter(Boolean) as typeof students;
    }, [selectedClassId, attendance, dateStr, students]);

    // 5. Alunas Disponíveis para Reposição (Têm crédito e não estão nesta turma E não foram adicionadas ainda)
    const studentsWithCredits = useMemo(() => {
        // Pega IDs únicos de quem tem crédito
        const studentIdsWithCredit = [...new Set(makeupCredits.map(c => c.student_id))];

        return students.filter(s =>
            studentIdsWithCredit.includes(s.id) && // Tem crédito
            s.class_id !== selectedClassId &&      // Não é desta turma
            !makeupStudents.find(ms => ms.id === s.id) // Já não está na lista visual
        );
    }, [makeupCredits, students, selectedClassId, makeupStudents]);

    // Helper Status
    const getStatus = (studentId: string) => {
        const record = attendance.find(r =>
            r.date === dateStr &&
            r.student_id === studentId &&
            r.class_id === selectedClassId
        );
        return record?.status; // pode ser undefined, 'present', 'absent', 'makeup'
    };

    const handleMark = (studentId: string, status: 'present' | 'absent') => {
        if (!selectedClassId) return;
        markAttendance(dateStr, studentId, status, selectedClassId);
    };

    const handleAddMakeup = (studentId: string) => {
        if (!selectedClassId) return;
        addMakeupStudent(dateStr, studentId, selectedClassId);
        setShowMakeupSelector(false);
    };

    // Helper para verificar status de pausa
    const isStudentPaused = (student: import('../types').Student, dateStr: string) => {
        if (!student.pause_period) return false;
        // Cria datas ao meio-dia para evitar problemas de fuso horário
        const current = new Date(dateStr + 'T12:00:00');
        const start = new Date(student.pause_period.start_date + 'T12:00:00');
        const end = new Date(student.pause_period.end_date + 'T12:00:00');
        return current >= start && current <= end;
    };

    // Helper para contar presenças no mês
    const getMonthlyAttendanceCount = (studentId: string, currentDateStr: string) => {
        const [year, month] = currentDateStr.split('-');
        return attendance.filter(r =>
            r.student_id === studentId &&
            r.status === 'present' &&
            r.date.startsWith(`${year}-${month}`)
        ).length;
    };

    return (
        <div className="p-8 space-y-6">
            <header className="flex flex-col gap-4">
                <h1 className="text-3xl font-bold text-slate-800">Chamada</h1>

                {/* Date Navigator */}
                <div className="bg-white p-4 rounded-xl border border-slate-200 flex items-center justify-between shadow-sm">
                    <button
                        onClick={() => setSelectedDate(addDays(selectedDate, -1))}
                        className="px-4 py-2 bg-slate-100 rounded hover:bg-brand-50 text-brand-600 font-bold transition-colors"
                    >
                        &lt; Anterior
                    </button>

                    <div className="text-center">
                        <h2 className="text-xl font-bold capitalize text-brand-600">
                            {formatDate(selectedDate, { weekday: 'long' })}
                        </h2>
                        <p className="text-slate-500 font-medium">
                            {formatDate(selectedDate, { day: 'numeric', month: 'long' })}
                        </p>
                    </div>

                    <button
                        onClick={() => setSelectedDate(addDays(selectedDate, 1))}
                        className="px-4 py-2 bg-slate-100 rounded hover:bg-brand-50 text-brand-600 font-bold transition-colors"
                    >
                        Próximo &gt;
                    </button>
                </div>
            </header>

            {/* Turmas Tabs */}
            {classesToday.length > 0 ? (
                <div className="flex gap-2 p-1 bg-slate-100 rounded-xl overflow-x-auto">
                    {classesToday.map(cls => (
                        <button
                            key={cls.id}
                            onClick={() => setSelectedClassId(cls.id)}
                            className={`flex-1 py-3 px-4 rounded-lg text-sm font-bold whitespace-nowrap transition-all ${selectedClassId === cls.id
                                ? "bg-white text-brand-600 shadow-sm border border-brand-100"
                                : "text-slate-500 hover:text-slate-700 hover:bg-slate-200"
                                }`}
                        >
                            {cls.name} ({cls.time})
                        </button>
                    ))}
                </div>
            ) : (
                <div className="p-6 text-center bg-slate-50 rounded-xl border-dashed border-2 border-slate-200 text-slate-400">
                    Sem turmas neste dia.
                </div>
            )}

            {/* Lista Principal */}
            {selectedClassId && (
                <div className="grid gap-6">

                    {/* Alunas Regulares */}
                    <div className="space-y-3">
                        <div className="flex justify-between items-center text-sm font-bold text-slate-500 uppercase px-1">
                            <span>Turma Regular ({regularStudents.length})</span>
                        </div>
                        {regularStudents.map(student => (
                            <StudentCard
                                key={student.id}
                                student={student}
                                status={getStatus(student.id) || 'pending'}
                                onMark={handleMark}
                                isPaused={isStudentPaused(student, dateStr)}
                                monthlyCount={getMonthlyAttendanceCount(student.id, dateStr)}
                                monthlyLimit={student.plan === '2x' ? 8 : 4} // Assuming '2x' plan has 8 classes, others 4
                            />
                        ))}
                        {regularStudents.length === 0 && <p className="text-slate-400 italic text-sm">Nenhuma aluna regular.</p>}
                    </div>

                    {/* Alunas em Reposição */}
                    <div className="space-y-3">
                        <div className="flex justify-between items-center text-sm font-bold text-purple-600 uppercase px-1 border-t pt-4 border-slate-200">
                            <span>Em Reposição ({makeupStudents.length})</span>
                        </div>
                        {makeupStudents.map(student => (
                            <StudentCard
                                key={student.id}
                                student={student}
                                status={getStatus(student.id) || 'makeup'}
                                onMark={handleMark}
                                isMakeup
                                isPaused={isStudentPaused(student, dateStr)}
                                monthlyCount={getMonthlyAttendanceCount(student.id, dateStr)}
                                monthlyLimit={student.plan === '2x' ? 8 : 4}
                            />
                        ))}

                        {/* Botão Adicionar Reposição */}
                        {!showMakeupSelector ? (
                            <button
                                onClick={() => setShowMakeupSelector(true)}
                                className="w-full py-3 rounded-xl border-2 border-dashed border-purple-200 text-purple-500 font-bold hover:bg-purple-50 transition-colors"
                            >
                                + Adicionar Aluna de Reposição
                            </button>
                        ) : (
                            <div className="bg-white p-4 rounded-xl border-2 border-purple-100 shadow-lg animate-in fade-in zoom-in duration-200">
                                <h4 className="font-bold text-slate-700 mb-3">Selecione uma aluna com crédito:</h4>
                                <div className="max-h-60 overflow-y-auto space-y-2">
                                    {studentsWithCredits.length > 0 ? (
                                        studentsWithCredits.map(s => (
                                            <button
                                                key={s.id}
                                                onClick={() => handleAddMakeup(s.id)}
                                                className="w-full text-left p-3 hover:bg-purple-50 rounded-lg flex justify-between items-center group transition-colors"
                                            >
                                                <span className="font-medium text-slate-700 group-hover:text-purple-700">{s.name}</span>
                                                <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded-full">Tem Crédito</span>
                                            </button>
                                        ))
                                    ) : (
                                        <p className="text-slate-400 text-sm py-2">Nenhuma aluna com crédito disponível.</p>
                                    )}
                                </div>
                                <button
                                    onClick={() => setShowMakeupSelector(false)}
                                    className="mt-3 text-sm text-slate-400 hover:text-slate-600 w-full text-center underline"
                                >
                                    Cancelar
                                </button>
                            </div>
                        )}
                    </div>

                </div>
            )}
        </div>
    );
}

// Subcomponente simples para evitar repetição
function StudentCard({ student, status, onMark, isMakeup, isPaused, monthlyCount, monthlyLimit }: {
    student: any,
    status: string,
    onMark: any,
    isMakeup?: boolean,
    isPaused?: boolean,
    monthlyCount?: number,
    monthlyLimit?: number
}) {
    const isPresent = status === 'present';
    const isAbsent = status === 'absent';
    const isLimitExceeded = (monthlyCount || 0) >= (monthlyLimit || 99);

    return (
        <div className={`p-4 rounded-xl border-2 transition-all flex flex-col sm:flex-row items-center justify-between gap-4 ${isPaused ? 'bg-slate-50 border-slate-100 opacity-60' :
            isPresent ? 'bg-green-50 border-green-200' :
                isAbsent ? 'bg-red-50 border-red-200' :
                    isMakeup ? 'bg-purple-50 border-purple-200' :
                        'bg-white border-slate-100'
            }`}>
            <div className="text-center sm:text-left flex items-center gap-4">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg hidden sm:flex ${isPaused ? 'bg-slate-200 text-slate-400' :
                    isPresent ? 'bg-green-100 text-green-600' :
                        isAbsent ? 'bg-red-100 text-red-600' :
                            'bg-slate-100 text-slate-400'
                    }`}>
                    {student.name.charAt(0)}
                </div>
                <div>
                    <div className="flex items-center gap-2 justify-center sm:justify-start">
                        <h3 className={`font-bold text-lg ${status === 'pending' || status === 'makeup' ? 'text-slate-700' : 'text-slate-900'}`}>
                            {student.name}
                        </h3>
                        {isPaused && (
                            <span className="text-[10px] font-bold bg-purple-100 text-purple-600 px-2 py-0.5 rounded-full border border-purple-200">
                                DE FÉRIAS 🌴
                            </span>
                        )}
                        {!isPaused && isLimitExceeded && status !== 'present' && (
                            <span className="text-[10px] font-bold bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full border border-yellow-200 flex items-center gap-1">
                                ⚠️ Limite
                            </span>
                        )}
                    </div>

                    <p className="text-sm font-medium opacity-80 flex gap-2 items-center justify-center sm:justify-start">
                        {isPaused ?
                            <span>Pausada neste período</span> :
                            <>
                                <span>
                                    {isPresent ? '✅ PRESENTE' :
                                        isAbsent ? '❌ FALTA REGISTRADA' :
                                            isMakeup ? '🔄 AGENDADA' : '⏳ Aguardando...'}
                                </span>
                                {monthlyCount !== undefined && (
                                    <>
                                        <span className="text-slate-300">•</span>
                                        <span className={isLimitExceeded ? 'text-orange-600 font-bold' : 'text-slate-500'}>
                                            Mês: {monthlyCount}/{monthlyLimit}
                                        </span>
                                    </>
                                )}
                            </>
                        }
                    </p>
                </div>
            </div>

            <div className="flex gap-2 w-full sm:w-auto">
                {isPaused ? (
                    <div className="px-4 py-2 text-sm text-slate-400 font-medium italic w-full text-center bg-slate-100 rounded-lg">
                        Bloqueado
                    </div>
                ) : (
                    <>
                        <button
                            onClick={() => onMark(student.id, 'present')}
                            className={`flex-1 sm:flex-none px-4 py-2 rounded-lg font-bold border-2 transition-all shadow-sm text-sm ${isPresent
                                ? 'bg-green-500 text-white border-green-500 scale-105'
                                : 'bg-white text-slate-400 border-slate-200 hover:border-green-400 hover:text-green-500'
                                }`}
                        >
                            PRESENTE
                        </button>
                        <button
                            onClick={() => onMark(student.id, 'absent')}
                            className={`flex-1 sm:flex-none px-4 py-2 rounded-lg font-bold border-2 transition-all shadow-sm text-sm ${isAbsent
                                ? 'bg-red-500 text-white border-red-500 scale-105'
                                : 'bg-white text-slate-400 border-slate-200 hover:border-red-400 hover:text-red-500'
                                }`}
                        >
                            FALTA
                        </button>
                    </>
                )}
            </div>
        </div>
    );
}
