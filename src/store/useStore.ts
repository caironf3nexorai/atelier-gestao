import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import type { Student, ClassGroup, AttendanceRecord, MakeupCredit, AttendanceStatus } from '../types';

interface AppState {
    students: Student[];
    classes: ClassGroup[];
    attendance: AttendanceRecord[];
    makeupCredits: MakeupCredit[];

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
    loading: false,
    error: null,

    fetchData: async () => {
        set({ loading: true, error: null });
        try {
            const [
                { data: students },
                { data: classes },
                { data: attendance },
                { data: credits }
            ] = await Promise.all([
                supabase.from('students').select('*').order('name'),
                supabase.from('classes').select('*').order('name'),
                supabase.from('attendance').select('*'),
                supabase.from('makeup_credits').select('*'),
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
            pause_end: pause_period?.end_date || null
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
        alert('Aluna salva com sucesso! 🎉');
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
