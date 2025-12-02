
import { kv } from '@vercel/kv';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import type { User } from '../types';

// In a real app, use a library like bcrypt.
const fakeHash = (str: string) => `hashed_${str}`;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required' });
  }

  try {
    const userKey = `user:${email.toLowerCase()}`;
    const user = await kv.get<User>(userKey);

    if (!user || user.passwordHash !== fakeHash(password)) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    // In a real app, you'd return a session token.
    // Here, we return the user object (without password hash) for simplicity.
    const { passwordHash, ...userToReturn } = user;
    return res.status(200).json({ user: userToReturn });

  } catch (error) {
    console.error('Auth error:', error);
    return res.status(500).json({ message: 'Internal Server Error' });
  }
}
