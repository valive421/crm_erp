import { Navigate, Route, Routes } from 'react-router-dom'
import ProtectedRoute from './routes/ProtectedRoute'
import AppLayout from './layouts/AppLayout'
import LoginPage from './pages/LoginPage'
import DashboardPage from './pages/DashboardPage'
import CustomersPage from './pages/CustomersPage'
import CustomerFormPage from './pages/CustomerFormPage'
import CustomerDetailPage from './pages/CustomerDetailPage'
import ProductsPage from './pages/ProductsPage'
import ProductFormPage from './pages/ProductFormPage'
import ProductDetailPage from './pages/ProductDetailPage'
import InventoryPage from './pages/InventoryPage'
import ChallansPage from './pages/ChallansPage'
import ChallanFormPage from './pages/ChallanFormPage'
import ChallanDetailPage from './pages/ChallanDetailPage'
import ProfilePage from './pages/ProfilePage'
import NotFoundPage from './pages/NotFoundPage'

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/customers" element={<CustomersPage />} />
          <Route path="/customers/new" element={<CustomerFormPage mode="create" />} />
          <Route path="/customers/:id" element={<CustomerDetailPage />} />
          <Route path="/customers/:id/edit" element={<CustomerFormPage mode="edit" />} />
          <Route path="/products" element={<ProductsPage />} />
          <Route path="/products/new" element={<ProductFormPage mode="create" />} />
          <Route path="/products/:id" element={<ProductDetailPage />} />
          <Route path="/products/:id/edit" element={<ProductFormPage mode="edit" />} />
          <Route path="/inventory" element={<InventoryPage />} />
          <Route path="/inventory/movements" element={<InventoryPage />} />
          <Route path="/challans" element={<ChallansPage />} />
          <Route path="/challans/new" element={<ChallanFormPage mode="create" />} />
          <Route path="/challans/:id" element={<ChallanDetailPage />} />
          <Route path="/profile" element={<ProfilePage />} />
        </Route>
      </Route>
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  )
}
