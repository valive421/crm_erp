import assert from 'node:assert/strict'
import { test } from 'node:test'

import { calculateReorderRecommendation } from '../src/controllers/inventoryController.js'

test('calculates a reorder quantity from recent demand and current stock', () => {
  const result = calculateReorderRecommendation({
    id: 1,
    name: 'Widget',
    current_stock: '20',
    minimum_stock_alert_quantity: '5',
    units_sold: '60',
    movement_days: '15',
  })

  assert.equal(result.average_daily_demand, 2)
  assert.equal(result.safety_stock, 5)
  assert.equal(result.reorder_point, 19)
  assert.equal(result.suggested_order_quantity, 59)
  assert.equal(result.status, 'HEALTHY')
  assert.equal(result.confidence, 'MEDIUM')
})

test('marks products with no demand history as low-confidence without inventing demand', () => {
  const result = calculateReorderRecommendation({
    current_stock: '0',
    minimum_stock_alert_quantity: '10',
    units_sold: '0',
    movement_days: '0',
  })

  assert.equal(result.average_daily_demand, 0)
  assert.equal(result.reorder_point, 10)
  assert.equal(result.suggested_order_quantity, 10)
  assert.equal(result.status, 'REORDER')
  assert.equal(result.confidence, 'LOW')
})
