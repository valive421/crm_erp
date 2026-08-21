import { Navigate, Route, Routes } from 'react-router-dom'
import ProtectedRoute from './routes/ProtectedRoute'
import AppLayout from './layouts/AppLayout'
import LoginPage from './pages/LoginPage'
import ProfilePage from './pages/ProfilePage'
import NotFoundPage from './pages/NotFoundPage'
import OperationsPlaceholderPage from './pages/OperationsPlaceholderPage'

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route path="/" element={<Navigate to="/inventory" replace />} />
          <Route path="/inventory" element={<OperationsPlaceholderPage module="Inventory" description="Location, batch, physical, reserved, and available stock will be delivered in the inventory stage." />} />
          <Route path="/work-orders" element={<OperationsPlaceholderPage module="Work Orders" description="Work-order creation, material availability, and automatic shortage checks will be delivered in the operations stage." />} />
          <Route path="/transfers" element={<OperationsPlaceholderPage module="Internal Transfers" description="Requested, dispatched, and received transfer processing will be delivered in the operations stage." />} />
          <Route path="/orders" element={<OperationsPlaceholderPage module="Customer Orders" description="Sales reservations with transaction-safe available-stock checks will be delivered in the reservation stage." />} />
          <Route path="/profile" element={<ProfilePage />} />
        </Route>
      </Route>
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  )
}
