import { asyncHandler } from '../utils/asyncHandler.js'
import { query } from '../config/db.js'

export const getDashboard = asyncHandler(async (request, response) => {
  // All dashboard cards and tables are sourced from live database queries.
  const [customers, products, challans, stock, recentCustomers, recentChallans, recentMovements] = await Promise.all([
    query('SELECT COUNT(*)::int AS count FROM customers_customer'),
    query('SELECT COUNT(*)::int AS count FROM products_product'),
    query("SELECT status, COUNT(*)::int AS count FROM challans_saleschallan GROUP BY status"),
    query('SELECT COUNT(*)::int AS count FROM products_product WHERE current_stock <= minimum_stock_alert_quantity'),
    query('SELECT id, name, mobile_number, status, created_at FROM customers_customer ORDER BY created_at DESC LIMIT 5'),
    query('SELECT sc.id, sc.challan_number, c.name AS customer_name, sc.total_quantity, sc.status, sc.created_at FROM challans_saleschallan sc JOIN customers_customer c ON c.id = sc.customer_id ORDER BY sc.created_at DESC LIMIT 5'),
    query('SELECT sm.id, p.name AS product_name, sm.quantity_changed, sm.movement_type, sm.created_at FROM inventory_stockmovement sm JOIN products_product p ON p.id = sm.product_id ORDER BY sm.created_at DESC LIMIT 5'),
  ])

  const statusMap = challans.rows.reduce((accumulator, row) => {
    accumulator[row.status] = row.count
    return accumulator
  }, {})

  return response.json({
    success: true,
    message: 'Dashboard data retrieved successfully.',
    data: {
      stats: {
        total_customers: customers.rows[0].count,
        active_customers: (await query("SELECT COUNT(*)::int AS count FROM customers_customer WHERE status = 'ACTIVE'")).rows[0].count,
        total_products: products.rows[0].count,
        low_stock_products: stock.rows[0].count,
        draft_challans: statusMap.DRAFT || 0,
        confirmed_challans: statusMap.CONFIRMED || 0,
      },
      recent_customers: recentCustomers.rows,
      recent_challans: recentChallans.rows,
      low_stock_products: (await query('SELECT id, name, sku, current_stock, minimum_stock_alert_quantity FROM products_product WHERE current_stock <= minimum_stock_alert_quantity ORDER BY updated_at DESC LIMIT 5')).rows,
      recent_stock_movements: recentMovements.rows,
    },
  })
})
