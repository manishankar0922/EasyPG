import { Request, Response, NextFunction } from 'express';

export const errorHandler = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // Always log full error in backend
  console.error('━━━━━━━━━━━━━━━━━━━━━━━━')
  console.error('❌ ERROR CAUGHT:')
  console.error('Route:', req.method, req.originalUrl)
  console.error('Body:', JSON.stringify(req.body, null, 2))
  console.error('Message:', err.message)
  console.error('Code:', err.code)
  console.error('Meta:', err.meta)
  console.error('Stack:', err.stack)
  console.error('━━━━━━━━━━━━━━━━━━━━━━━━')

  // Prisma specific errors
  if (err.code === 'P2002') {
    return res.status(400).json({
      success: false,
      error: 'Already exists',
      field: err.meta?.target?.[0] || 'unknown'
    })
  }
  if (err.code === 'P2025') {
    return res.status(404).json({
      success: false,
      error: 'Record not found'
    })
  }
  if (err.code === 'P2003') {
    return res.status(400).json({
      success: false,
      error: 'Related record not found',
      field: err.meta?.field_name
    })
  }

  // Auth errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      success: false,
      error: 'Invalid token. Please login again.'
    })
  }
  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      error: 'Session expired. Please login again.'
    })
  }

  // Validation errors
  if (err.name === 'ZodError') {
    return res.status(400).json({
      success: false,
      error: 'Validation failed',
      details: err.errors.map((e: any) => ({
        field: e.path.join('.'),
        message: e.message
      }))
    })
  }

  // Show real error in development
  // Hide in production
  const isDev = process.env.NODE_ENV === 'development'

  return res.status(err.statusCode || 500).json({
    success: false,
    error: isDev
      ? err.message
      : 'Internal server error',
    ...(isDev && { stack: err.stack })
  })
}
