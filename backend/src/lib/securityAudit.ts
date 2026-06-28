import prisma from '../config/db';
import logger from './logger';
import { Request } from 'express';

export enum SecurityEventType {
  LOGIN_SUCCESS = 'LOGIN_SUCCESS',
  LOGIN_FAILURE = 'LOGIN_FAILURE',
  PASSWORD_RESET_REQUEST = 'PASSWORD_RESET_REQUEST',
  PASSWORD_RESET_SUCCESS = 'PASSWORD_RESET_SUCCESS',
  PASSWORD_CHANGED = 'PASSWORD_CHANGED',
  ACCOUNT_LOCKED = 'ACCOUNT_LOCKED',
  ROLE_CHANGED = 'ROLE_CHANGED',
  SESSION_HIJACK_ATTEMPT = 'SESSION_HIJACK_ATTEMPT',
  LOGOUT = 'LOGOUT',
}

interface AuditEventParams {
  eventType: SecurityEventType;
  userId?: string;
  targetUserId?: string;
  req?: Request;
  metadata?: any;
}

export const logSecurityEvent = async (params: AuditEventParams) => {
  try {
    const ipAddress = params.req?.headers['x-forwarded-for']?.toString().split(',')[0].trim() || 
                      params.req?.socket.remoteAddress || null;
    const userAgent = params.req?.headers['user-agent'] || null;

    await prisma.securityEvent.create({
      data: {
        eventType: params.eventType,
        userId: params.userId,
        targetUserId: params.targetUserId,
        ipAddress: ipAddress === '::1' ? '127.0.0.1' : ipAddress,
        userAgent,
        metadata: params.metadata ? params.metadata : null,
      }
    });
  } catch (error) {
    logger.error('Failed to log security event to database', { error });
  }
};
