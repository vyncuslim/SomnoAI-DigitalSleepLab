import jwt from 'jsonwebtoken';

const JWT_SECRET = (typeof process !== 'undefined' && process.env?.JWT_SECRET) || 
                   (import.meta.env?.VITE_JWT_SECRET) || 
                   'a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6a7b8c9d0e1f2';

export function signToken(payload: any, options: jwt.SignOptions = { expiresIn: '7d' }): string {
  return jwt.sign(payload, JWT_SECRET, options);
}

export function verifyToken(token: string): any {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    console.error('[JWT-UTILS] Token verification failed:', error);
    return null;
  }
}
