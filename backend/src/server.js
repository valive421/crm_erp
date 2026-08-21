import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import morgan from 'morgan'

import { env } from './config/env.js'
import { notFoundHandler, errorHandler } from './middleware/errorHandler.js'
import authRoutes from './routes/authRoutes.js'
import operationsMetaRoutes from './routes/operationsMetaRoutes.js'
import inventoryRoutes from './routes/inventoryRoutes.js'
import workOrderRoutes from './routes/workOrderRoutes.js'
import transferRoutes from './routes/transferRoutes.js'
import orderRoutes from './routes/orderRoutes.js'

const app = express()

// Core security and request parsing middleware run before any route handlers.
app.use(helmet())
app.use(cors({ origin: env.corsOrigin === '*' ? true : env.corsOrigin.split(',').map((origin) => origin.trim()) }))
app.use(express.json({ limit: '2mb' }))
app.use(express.urlencoded({ extended: true }))
app.use(morgan('dev'))

// A small health check helps deployment platforms and manual smoke tests.
app.get('/api/health', (request, response) => {
  response.json({ success: true, message: 'API is healthy.' })
})

// Authentication and foundation metadata are available before operational workflows
// are added in subsequent development stages.
app.use('/api/auth', authRoutes)
app.use('/api/meta', operationsMetaRoutes)
app.use('/api/inventory', inventoryRoutes)
app.use('/api/work-orders', workOrderRoutes)
app.use('/api/transfers', transferRoutes)
app.use('/api/orders', orderRoutes)

// 404 and error middleware must stay last so they catch all fallthroughs.
app.use(notFoundHandler)
app.use(errorHandler)

app.listen(env.port, () => {
  console.log(`Express API listening on port ${env.port}`)
})
