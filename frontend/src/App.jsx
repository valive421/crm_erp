import { Navigate, Route, Routes } from 'react-router-dom'
import ProtectedRoute from './routes/ProtectedRoute'
import AppLayout from './layouts/AppLayout'
import LoginPage from './pages/LoginPage'
import ProfilePage from './pages/ProfilePage'
import NotFoundPage from './pages/NotFoundPage'
import InventoryPage from './pages/InventoryPage'
import WorkOrdersPage from './pages/WorkOrdersPage'
import TransfersPage from './pages/TransfersPage'
import CustomerOrdersPage from './pages/CustomerOrdersPage'

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route path="/" element={<Navigate to="/inventory" replace />} />
          <Route path="/inventory" element={<InventoryPage />} />
          <Route path="/work-orders" element={<WorkOrdersPage />} />
          <Route path="/transfers" element={<TransfersPage />} />
          <Route path="/orders" element={<CustomerOrdersPage />} />
          <Route path="/profile" element={<ProfilePage />} />
        </Route>
      </Route>
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  )
}
