import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import type { Student, ClassGroup, AttendanceRecord, MakeupCredit, AttendanceStatus, Payment } from '../types';

interface AppState {
    students: Student[];
    classes: ClassGroup[];
    attendance: AttendanceRecord[];
    makeupCredits: MakeupCredit[];
    payments: Payment[];

    loading: boolean;
    error: string | null;

    fetchData: () => Promise<void>;

    addStudent: (student: Omit<Student, 'id'>) => Promise<void>;
    updateStudent: (id: string, data: Partial<Student>) => Promise<void>;
    deleteStudent: (id: string) => Promise<void>;

    addClass: (classGroup: Omit<ClassGroup, 'id'>) => Promise<void>;
    updateClass: (id: string, data: Partial<ClassGroup>) => Promise<void>;
    deleteClass: (id: string) => Promise<void>;

    markAttendance: (date: string, studentId: string, status: AttendanceStatus, classId?: string) => Promise<void>;
    addMakeupStudent: (date: string, studentId: string, targetClassId: string) => Promise<void>;

    // Payments
    fetchPayments: () => Promise<void>;
    createPayments: (payments: Omit<Payment, 'id' | 'status' | 'created_at'>[]) => Promise<void>;
    updatePayment: (id: string, data: Partial<Payment>) => Promise<void>;
    updateFuturePayments: (studentId: string, fromDate: string, newDay: number, newAmount?: number) => Promise<void>;
    markAsPaid: (id: string) => Promise<void>;
    deletePayment: (id: string, deleteFuture?: boolean) => Promise<void>;

    settings: {
        studio_name: string;
        logo_url: string | null;
    };
    fetchSettings: () => Promise<void>;
    updateSettings: (data: { studio_name?: string; logo_url?: string }) => Promise<void>;
    uploadLogo: (file: File) => Promise<string | null>;
    removeLogo: () => Promise<void>;
}

export const useStore = create<AppState>((set, get) => ({
    students: [],
    classes: [],
    attendance: [],
    makeupCredits: [],
    payments: [],
    loading: false,
    error: null,

    fetchData: async () => {
        set({ loading: true, error: null });
        try {
            const [
                { data: students },
                { data: classes },
                { data: attendance },
                { data: credits },
                { data: payments }
            ] = await Promise.all([
                supabase.from('students').select('*').order('name'),
                supabase.from('classes').select('*').order('name'),
                supabase.from('attendance').select('*'),
                supabase.from('makeup_credits').select('*'),
                supabase.from('payments').select('*').order('due_date', { ascending: true }),
            ]);

            // Map students to include object structure for pause_period if needed
            const formattedStudents = (students || []).map((s: any) => ({
                ...s,
                pause_period: (s.pause_start && s.pause_end) ? {
                    start_date: s.pause_start,
                    end_date: s.pause_end
                } : undefined
            }));

            set({
                students: formattedStudents as Student[],
                classes: (classes || []) as ClassGroup[],
                attendance: (attendance || []) as AttendanceRecord[],
                makeupCredits: (credits || []) as MakeupCredit[],
                payments: (payments || []) as Payment[],
                loading: false
            });
        } catch (error: any) {
            set({ error: error.message, loading: false });
        }
    },

    addStudent: async (studentData) => {
        const { pause_period, ...rest } = studentData;
        // Sanitize Data
        const dbData = {
            ...rest,
            class_id: rest.class_id || null, // Converte string vazia para null
            pause_start: pause_period?.start_date || null,
            pause_end: pause_period?.end_date || null,
            // Ensure due_day is present, default to 10 if not (though form should enforce)
            due_day: rest.due_day || 10
        };

        const { data, error } = await supabase.from('students').insert(dbData).select().single();

        if (error) {
            console.error('Error adding student:', error);
            alert(`Erro ao salvar aluna: ${error.message}`);
            return;
        }

        const newStudent = {
            ...data,
            pause_period: (data.pause_start && data.pause_end) ? {
                start_date: data.pause_start,
                end_date: data.pause_end
            } : undefined
        };

        set(state => ({ students: [...state.students, newStudent] }));

        // --- AUTO-GENERATE PAYMENTS (12 MONTHS) ---
        // Logic: Generate for the next 12 months starting from current month.
        // Uses the student's due_day.
        try {
            const paymentsToCreate = [];
            const today = new Date();
            const dueDay = dbData.due_day;
            const amount = 170.00;

            // 1. Generate CURRENT MONTH payment (Upfront / Paid Now)
            const currentYear = today.getFullYear();
            const currentMonth = today.getMonth();
            const currentMonthStr = (currentMonth + 1).toString().padStart(2, '0');
            // For the paid record, we can use today's date as due_date or the calculated due date.
            // Let's use the calculated one for consistency, or today? 
            // Usually "Matricula payment" is recorded as paid today.
            const todayStr = today.toISOString().split('T')[0];

            paymentsToCreate.push({
                student_id: newStudent.id,
                due_date: todayStr, // Paid today
                amount: amount,
                month_ref: `${currentYear}-${currentMonthStr}`,
                status: 'paid',
                paid_at: todayStr
            });

            // 2. Generate NEXT 12 MONTHS (Pending)
            // Always start from NEXT month, as the first payment is paid upfront.
            const startYear = today.getFullYear();
            const startMonth = today.getMonth() + 1; // Start loop next month

            for (let i = 0; i < 12; i++) {
                // new Date(year, month, ...) handles overflow correctly (e.g. month 12 becomes Jan of next year)
                const targetDate = new Date(startYear, startMonth + i, 1);
                const year = targetDate.getFullYear();
                const month = targetDate.getMonth();

                const daysInMonth = new Date(year, month + 1, 0).getDate();
                const dayToUse = Math.min(dueDay, daysInMonth);

                const safeMonth = (month + 1).toString().padStart(2, '0');
                const safeDay = dayToUse.toString().padStart(2, '0');
                const dueDateString = `${year}-${safeMonth}-${safeDay}`;
                const monthRef = `${year}-${safeMonth}`;

                paymentsToCreate.push({
                    student_id: newStudent.id,
                    due_date: dueDateString,
                    amount: amount,
                    month_ref: monthRef,
                    status: 'pending' // explicit for type matching
                });
            }

            // Call createPayments (which handles batch insert)
            // Note: We need to access the store's createPayments, but we are inside the store action.
            // We can call get().createPayments, but createPayments updates state which might be async/racey.
            // Better to just insert to DB here to ensure atomicity-ish or call the internal logic.
            // Let's call the public action to keep state in sync.
            const store = get();
            await store.createPayments(paymentsToCreate);

        } catch (payError) {
            console.error("Error auto-generating payments:", payError);
            alert("Aluna salva, mas erro ao gerar cobranças automáticas.");
            // Non-blocking, student is already saved.
        }

        alert('Aluna salva com sucesso! (12 Mensalidades geradas) 🎉');
    },

    updateStudent: async (id, studentData) => {
        const { pause_period, ...rest } = studentData;
        const dbData: any = { ...rest };

        if (pause_period !== undefined) {
            dbData.pause_start = pause_period?.start_date || null;
            dbData.pause_end = pause_period?.end_date || null;
        }

        if (dbData.class_id === '') {
            dbData.class_id = null;
        }

        const { error } = await supabase.from('students').update(dbData).eq('id', id);
        if (error) {
            console.error('Error updating student:', error);
            alert(`Erro ao atualizar aluna: ${error.message}`);
            return;
        }

        set(state => ({
            students: state.students.map(s => s.id === id ? { ...s, ...studentData } : s)
        }));
        alert('Aluna atualizada com sucesso!');
    },

    deleteStudent: async (id) => {
        const { error } = await supabase.from('students').delete().eq('id', id);
        if (error) {
            console.error('Error deleting student:', error);
            alert('Erro ao excluir aluna.');
            return;
        }
        set(state => ({
            students: state.students.filter(s => s.id !== id)
        }));
    },

    addClass: async (classData) => {
        const { data, error } = await supabase.from('classes').insert(classData).select().single();
        if (error) {
            console.error('Error adding class:', error);
            alert(`Erro ao salvar turma: ${error.message}`);
            return;
        }
        set(state => ({ classes: [...state.classes, data] }));
        alert('Turma criada com sucesso!');
    },

    updateClass: async (id, classData) => {
        const { error } = await supabase.from('classes').update(classData).eq('id', id);
        if (error) {
            console.error('Error updating class:', error);
            alert('Erro ao atualizar turma.');
            return;
        }
        set(state => ({
            classes: state.classes.map(c => c.id === id ? { ...c, ...classData } : c)
        }));
    },

    deleteClass: async (id) => {
        const { error } = await supabase.from('classes').delete().eq('id', id);
        if (error) {
            console.error('Error deleting class:', error);
            alert('Erro ao excluir turma.');
            return;
        }
        set(state => ({ classes: state.classes.filter(c => c.id !== id) }));
    },

    markAttendance: async (date, studentId, status, classId) => {
        const state = get();
        const student = state.students.find(s => s.id === studentId);
        const isMakeupClass = student && classId && student.class_id !== classId;

        // 1. Remove registro anterior se existir (Logica simples: delete e insert novo)
        // Isso evita duplicatas e trata a mudança de status
        // Em um app maior, faríamos update, mas aqui simplifica a lógica de créditos

        const existingRecord = state.attendance.find(r =>
            r.date === date &&
            r.student_id === studentId &&
            (r.class_id === classId || (!classId))
            // Nota: ClassId pode ser null em dados antigos, mas agora sempre passamos
        );

        if (existingRecord) {
            await supabase.from('attendance').delete().eq('id', existingRecord.id);

            // TODO: Reverter lógica de créditos se necessário? 
            // Por simplicidade, vamos assumir que o usuário não fica trocando mil vezes.
            // Se trocou de Falta para Presente, teria que apagar o crédito.
            if (existingRecord.status === 'absent' && status !== 'absent') {
                // Tenta achar o crédito gerado por essa falta
                const { error } = await supabase.from('makeup_credits')
                    .delete()
                    .match({ student_id: studentId, generated_from_date: date });

                if (!error) {
                    set(s => ({ makeupCredits: s.makeupCredits.filter(c => !(c.student_id === studentId && c.generated_from_date === date)) }));
                }
            }
        }

        // 2. Insere novo registro
        const newRecord = {
            date,
            student_id: studentId,
            class_id: classId,
            status
        };

        const { data: savedRecord, error } = await supabase.from('attendance').insert(newRecord).select().single();

        if (error) {
            console.error('Error marking attendance:', error);
            return;
        }

        // 3. Lógica de Créditos
        if (!isMakeupClass) {
            // Se for FALTA em aula regular, gera crédito
            if (status === 'absent') {
                // Verifica se já existe para não duplicar
                const exists = state.makeupCredits.some(c => c.student_id === studentId && c.generated_from_date === date);
                if (!exists) {
                    const newCredit = {
                        student_id: studentId,
                        generated_from_date: date
                    };
                    const { data: creditData } = await supabase.from('makeup_credits').insert(newCredit).select().single();
                    if (creditData) {
                        set(s => ({ makeupCredits: [...s.makeupCredits, creditData] }));
                    }
                }
            }
        } else {
            // Se for PRESENÇA em aula de reposição, consome o crédito
            if (status === 'present') {
                // Pega o primeiro crédito disponível
                const creditToUse = state.makeupCredits.find(c => c.student_id === studentId && !c.used_at_date);
                if (creditToUse) {
                    await supabase.from('makeup_credits')
                        .update({ used_at_date: date })
                        .eq('id', creditToUse.id);

                    // Atualiza localmente
                    set(s => ({
                        makeupCredits: s.makeupCredits.filter(c => c.id !== creditToUse.id)
                    }));
                }
            }
        }

        // Atualiza Attenance Local
        set(state => ({
            attendance: [
                ...state.attendance.filter(r => r.id !== existingRecord?.id),
                savedRecord
            ]
        }));
    },

    addMakeupStudent: async (date, studentId, targetClassId) => {
        // Apenas cria um registro 'makeup' na chamada
        const newRecord = {
            date,
            student_id: studentId,
            class_id: targetClassId,
            status: 'makeup'
        };

        const { data, error } = await supabase.from('attendance').insert(newRecord).select().single();

        if (error) {
            console.error("Error adding makeup student", error);
            return;
        }

        set(state => ({
            attendance: [...state.attendance, data]
        }));
    },

    // --- PAYMENTS ACTIONS ---
    fetchPayments: async () => {
        // Optimization: Fetch only 'pending' debts OR 'any' payments from the current year.
        // This prevents the app from loading 10 years of history and crashing, without deleting data.
        const startOfYear = `${new Date().getFullYear()}-01-01`;

        // .or() syntax: 'status.eq.pending,due_date.gte.2026-01-01'
        const { data, error } = await supabase
            .from('payments')
            .select('*')
            .or(`status.eq.pending,due_date.gte.${startOfYear}`)
            .order('due_date', { ascending: true });

        if (error) {
            console.error('Error fetching payments:', error);
            return;
        }
        set({ payments: (data || []) as Payment[] });
    },

    createPayments: async (paymentsData) => {
        const { data, error } = await supabase.from('payments').insert(
            paymentsData.map(p => ({ ...p, status: 'pending' }))
        ).select();

        if (error) {
            console.error('Error creating payments:', error);
            alert('Erro ao criar cobranças.');
            return;
        }
        set(state => ({ payments: [...state.payments, ...(data || [])] }));
        alert('Cobranças geradas com sucesso!');
    },

    updatePayment: async (id, data) => {
        const { error } = await supabase.from('payments').update(data).eq('id', id);
        if (error) {
            console.error('Error updating payment:', error);
            alert('Erro ao atualizar cobrança.');
            return;
        }
        set(state => ({
            payments: state.payments.map(p => p.id === id ? { ...p, ...data } : p)
        }));
        alert('Cobrança atualizada!');
    },

    updateFuturePayments: async (studentId, fromDate, newDay, newAmount) => {
        // 1. Fetch pending payments after fromDate
        const { data: futurePayments, error } = await supabase.from('payments')
            .select('*')
            .eq('student_id', studentId)
            .eq('status', 'pending')
            .gt('due_date', fromDate);

        if (error) {
            console.error('Error fetching future payments:', error);
            return;
        }

        if (!futurePayments || futurePayments.length === 0) {
            alert('Não há cobranças futuras para atualizar.');
            return;
        }

        // 2. Prepare updates
        const updates = futurePayments.map(p => {
            // Robust Date Clamping
            const currentDueDate = new Date(p.due_date + 'T12:00:00');
            const year = currentDueDate.getFullYear();
            const month = currentDueDate.getMonth(); // 0-indexed

            const daysInMonth = new Date(year, month + 1, 0).getDate();
            const dayToUse = Math.min(newDay, daysInMonth);

            const safeMonth = (month + 1).toString().padStart(2, '0');
            const safeDay = dayToUse.toString().padStart(2, '0');
            const newDateString = `${year}-${safeMonth}-${safeDay}`;

            return {
                id: p.id,
                due_date: newDateString,
                amount: newAmount !== undefined ? newAmount : p.amount
            };
        });

        // 3. Execute updates
        let errorCount = 0;
        for (const update of updates) {
            const { error: upError } = await supabase.from('payments').update({
                due_date: update.due_date,
                amount: update.amount
            }).eq('id', update.id);
            if (upError) errorCount++;
        }

        if (errorCount > 0) {
            alert(`Algumas cobranças não puderam ser atualizadas.`);
        } else {
            alert('Todas as cobranças futuras foram atualizadas (com correção de dia)!');
        }

        // Refresh local
        const state = get();
        await state.fetchPayments();
    },

    markAsPaid: async (id) => {
        // 1. Optimistic Update
        set(state => ({
            payments: state.payments.map(p =>
                p.id === id ? { ...p, status: 'paid', paid_at: new Date().toISOString() } : p
            )
        }));

        // 2. Database Update
        const { error } = await supabase.from('payments').update({
            status: 'paid',
            paid_at: new Date().toISOString()
        }).eq('id', id);

        if (error) {
            console.error('Error marking payment as paid:', error);
            alert('Erro ao confirmar pagamento.');
            // Revert on error
            set(state => ({
                payments: state.payments.map(p => p.id === id ? { ...p, status: 'pending', paid_at: undefined } : p)
            }));
            return;
        }

        alert('Pagamento confirmado! 💰');
        // Fetch to sync triggers if any
        const state = get();
        await state.fetchPayments();
    },


    deletePayment: async (id, deleteFuture = false) => {
        // Find the payment first to get student_id and date
        const paymentToDelete = get().payments.find(p => p.id === id);
        if (!paymentToDelete) return;

        if (deleteFuture) {
            // Delete this payment AND all future PENDING payments for this student
            const { error } = await supabase.from('payments')
                .delete()
                .eq('student_id', paymentToDelete.student_id)
                .eq('status', 'pending')
                .gte('due_date', paymentToDelete.due_date); // Greater or Equal to delete the current one too + futures

            if (error) {
                console.error('Error deleting payments:', error);
                alert('Erro ao excluir cobranças.');
                return;
            }

            // Update local state - remove all matching
            set(state => ({
                payments: state.payments.filter(p =>
                    !(p.student_id === paymentToDelete.student_id &&
                        p.status === 'pending' &&
                        p.due_date >= paymentToDelete.due_date)
                )
            }));
            alert('Cobrança atual e futuras removidas.');

        } else {
            // Delete ONLY this specific payment (original behavior)
            const { error } = await supabase.from('payments').delete().eq('id', id);
            if (error) {
                console.error('Error deleting payment:', error);
                alert('Erro ao excluir cobrança.');
                return;
            }
            set(state => ({ payments: state.payments.filter(p => p.id !== id) }));
            alert('Cobrança removida.');
        }
    },

    // --- SETTINGS ACTIONS ---
    settings: {
        studio_name: 'Ateliê de Cerâmica',
        logo_url: null
    },

    fetchSettings: async () => {
        const { data } = await supabase.from('studio_settings').select('*').single();
        if (data) {
            set({ settings: { studio_name: data.studio_name, logo_url: data.logo_url } });
        }
    },

    updateSettings: async (settingsData) => {
        // Assume ID existe via fetch anterior ou usa update genérico na única linha
        const { error } = await supabase.from('studio_settings')
            .update(settingsData)
            .neq('id', '00000000-0000-0000-0000-000000000000'); // Hack simples para dar update em qualquer linha que existir

        if (error) {
            console.error('Error updating settings:', error);
            alert('Erro ao salvar configurações.');
            return;
        }

        set(state => ({
            settings: { ...state.settings, ...settingsData }
        }));
        alert('Configurações salvas com sucesso!');
    },

    uploadLogo: async (file) => {
        const fileExt = file.name.split('.').pop();
        const fileName = `logo-${Math.random()}.${fileExt}`;
        const filePath = `${fileName}`;

        const { error: uploadError } = await supabase.storage
            .from('app-assets')
            .upload(filePath, file);

        if (uploadError) {
            console.error('Error uploading logo:', uploadError);
            alert('Erro ao enviar imagem. Verifique se o Bucket "app-assets" é público.');
            return null;
        }

        const { data } = supabase.storage.from('app-assets').getPublicUrl(filePath);
        return data.publicUrl;
    },

    removeLogo: async () => {
        const { error } = await supabase.from('studio_settings')
            .update({ logo_url: null })
            .neq('id', '00000000-0000-0000-0000-000000000000');

        if (error) {
            console.error('Error removing logo:', error);
            alert('Erro ao remover logo.');
            return;
        }

        set(state => ({
            settings: { ...state.settings, logo_url: null }
        }));
    }
}));
