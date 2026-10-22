'use server';

import { cookies } from 'next/headers';
import crypto from 'crypto';

function safeCompare(input: string, target: string): boolean {
  const inputHash = crypto.createHash('sha256').update(input).digest();
  const targetHash = crypto.createHash('sha256').update(target).digest();
  return crypto.timingSafeEqual(inputHash, targetHash);
}

function getAdminToken(username: string, pass: string): string {
  const secret = process.env.AUTH_SECRET || pass;
  return crypto.createHmac('sha256', secret).update(username).digest('hex');
}

export async function verifyCredentials(username?: string, password?: string) {
  const adminUser = process.env.ADMIN_USERNAME || '';
  const adminPass = process.env.ADMIN_PASSWORD || '';

  if (!adminUser || !adminPass || !username || !password) {
    return { success: false, error: 'Invalid username or password.' };
  }

  const userMatch = safeCompare(username, adminUser);
  const passMatch = safeCompare(password, adminPass);

  if (userMatch && passMatch) {
    const token = getAdminToken(adminUser, adminPass);
    const cookieStore = await cookies();

    cookieStore.set('mb_admin_auth', token, {
      path: '/',
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 86400, // 24 hours
    });

    return { success: true };
  }

  return { success: false, error: 'Invalid username or password.' };
}

export async function logoutAdmin() {
  const cookieStore = await cookies();
  cookieStore.set('mb_admin_auth', '', {
    path: '/',
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 0,
  });
  return { success: true };
}