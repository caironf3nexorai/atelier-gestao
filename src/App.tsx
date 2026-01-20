import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { useStore } from './store/useStore';
import { Layout } from './layouts/Layout';
import { Dashboard } from './pages/Dashboard';
import { StudentList } from './pages/StudentList';
import { AttendancePage } from './pages/AttendancePage';
import { ClassesPage } from './pages/ClassesPage';
import { ConfiguracoesPage } from './pages/ConfiguracoesPage';

console.log('App.tsx modules loaded');

function App() {
  const { fetchData } = useStore();

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  console.log('App component rendering...');
  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/alunas" element={<StudentList />} />
          <Route path="/turmas" element={<ClassesPage />} />
          <Route path="/chamada" element={<AttendancePage />} />
          <Route path="/configuracoes" element={<ConfiguracoesPage />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}

export default App;
