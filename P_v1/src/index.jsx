import React, { lazy, Suspense } from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';

import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import { Provider } from 'react-redux';
import store from './lib/store';
import Layout from './components/Layout';
import { ToastProvider } from './components/Toast';
import { ConfirmProvider } from './components/ConfirmDialog';
import { RequireAuth, RequirePermission, HOME_PATH } from './lib/auth';

const Dashboard = lazy(() => import('./pages/Dashboard'));
const Patients = lazy(() => import('./pages/Patients'));
const PatientDetail = lazy(() => import('./pages/PatientDetail'));
const WaitingRoom = lazy(() => import('./pages/WaitingRoom'));
const Consultations = lazy(() => import('./pages/Consultations'));
const FollowUp = lazy(() => import('./pages/FollowUp'));
const Billing = lazy(() => import('./pages/Billing'));
const Appointments = lazy(() => import('./pages/Appointments'));
const Employees = lazy(() => import('./pages/Employees'));


const guarded = (action, element) => <RequirePermission action={action}>{element}</RequirePermission>;

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <Provider store={store}>
      <ToastProvider>
        <ConfirmProvider>
          <Router>
            <Suspense fallback={<div className="flex min-h-screen items-center justify-center text-gray-500">Chargement…</div>}>
              <Routes>
                <Route path="/" element={<Login />} />
                <Route path="/login" element={<Navigate to="/" replace />} />

                <Route path="/app" element={<RequireAuth roles={['admin', 'infirmier']}><Layout /></RequireAuth>}>
                  <Route index element={<Navigate to="dashboard" replace />} />
                  <Route path="dashboard" element={guarded('dashboard.view', <Dashboard />)} />
                  <Route path="patients" element={guarded('patients.view', <Patients />)} />
                  <Route path="patients/:id" element={guarded('patients.view', <PatientDetail />)} />
                  <Route path="waiting-room" element={guarded('waiting.manage', <WaitingRoom />)} />
                  <Route path="appointments" element={guarded('appointments.manage', <Appointments />)} />
                  <Route path="consultations" element={guarded('consultations.view', <Consultations />)} />
                  <Route path="follow-up" element={guarded('followup.view', <FollowUp />)} />
                  <Route path="billing" element={guarded('billing.manage', <Billing />)} />
                  <Route path="employees" element={guarded('employees.manage', <Employees />)} />
                  <Route path="*" element={<Navigate to={HOME_PATH} replace />} />
                </Route>

                {/* old paths */}
                <Route path="/admin" element={<Navigate to={HOME_PATH} replace />} />
                <Route path="/employe" element={<Navigate to={HOME_PATH} replace />} />
                <Route path="/detail/:v" element={<Navigate to="/app/patients" replace />} />
                <Route path="/detail2/:v" element={<Navigate to="/app/patients" replace />} />
              </Routes>
            </Suspense>
          </Router>
        </ConfirmProvider>
      </ToastProvider>
    </Provider>
  </React.StrictMode>
);
