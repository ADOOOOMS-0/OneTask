import { kv } from '@vercel/kv';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import type { User } from '../types';

// In a real app, use a library like bcrypt.
const fakeHash = (str: string) => `hashed_${str}`;

// Helper to verify password against either local or server hash formats
const verifyPassword = (inputPassword: string, storedHash: string) => {
    return storedHash === `hashed_${inputPassword}` || storedHash === `local_hash_${inputPassword}`;
};

// Safer UUID generation fallback
const generateId = () => {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
        return crypto.randomUUID();
    }
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
};

async function handlePost(req: VercelRequest, res: VercelResponse) {
    // Sign Up
    if (req.body.name && req.body.email && req.body.password) {
        const { name, email, password } = req.body;
        if (password.length < 6) {
            return res.status(400).json({ message: 'Password must be at least 6 characters long' });
        }

        const userKey = `user:${email.toLowerCase()}`;
        if (await kv.exists(userKey)) {
            return res.status(409).json({ message: 'An account with this email already exists' });
        }

        const newUser: User = {
            id: generateId(),
            name,
            email: email.toLowerCase(),
            passwordHash: fakeHash(password),
            createdAt: new Date().toISOString(),
        };

        await kv.set(userKey, newUser);

        const dataKey = `data:${newUser.id}`;
        await kv.set(dataKey, {
            projects: [], completedTasks: [], activeProjectId: null, isSidebarOpen: true,
            settings: {
                theme: 'system', isAutoPriorityModeEnabled: false, autoPriorityDays: [],
                autoPriorityHours: 24, isAutoRotationEnabled: false,
            }
        });

        const { passwordHash, ...userToReturn } = newUser;
        return res.status(201).json({ user: userToReturn });
    }
    
    // Password Reset
    if (req.body.email && req.body.newPassword) {
        const { email, newPassword } = req.body;
        if (newPassword.length < 6) {
            return res.status(400).json({ message: 'Password must be at least 6 characters long' });
        }
        const userKey = `user:${email.toLowerCase()}`;
        const user = await kv.get<User>(userKey);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        user.passwordHash = fakeHash(newPassword);
        await kv.set(userKey, user);
        return res.status(200).json({ message: 'Password updated successfully.' });
    }

    // Check if user exists (for forgot password flow)
    if (req.body.checkEmail) {
        const userKey = `user:${req.body.checkEmail.toLowerCase()}`;
        const exists = await kv.exists(userKey);
        return res.status(200).json({ exists });
    }

    return res.status(400).json({ message: 'Invalid request body' });
}

async function handlePatch(req: VercelRequest, res: VercelResponse) {
    const userId = req.headers['x-user-id'] as string;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });

    const { updates, currentPassword, email } = req.body;
    
    // Identify user by email passed in body (most reliable), or fallback to update email
    const lookupEmail = email || updates.email;
    if (!lookupEmail) return res.status(400).json({ message: "Could not identify user account." });

    const userKey = `user:${lookupEmail.toLowerCase()}`;
    const user = await kv.get<User>(userKey);

    if (!user) return res.status(404).json({ message: "User not found." });
    if (user.id !== userId) return res.status(403).json({ message: "Forbidden" });

    if (updates.name || updates.email || updates.newPassword) {
        if (!currentPassword || !verifyPassword(currentPassword, user.passwordHash)) {
            return res.status(403).json({ message: "The password you entered is incorrect." });
        }
    }
    
    if (updates.email && updates.email.toLowerCase() !== user.email.toLowerCase()) {
        const newUserKey = `user:${updates.email.toLowerCase()}`;
        if (await kv.exists(newUserKey)) {
            return res.status(409).json({ message: "This email is already in use." });
        }
        // Delete old key, save new key later
        await kv.del(userKey);
        user.email = updates.email.toLowerCase();
    }

    if (updates.name) user.name = updates.name;
    if (updates.newPassword) user.passwordHash = fakeHash(updates.newPassword);
    if ('profilePicture' in updates) user.profilePicture = updates.profilePicture;
    
    // Save to (potentially new) key
    await kv.set(`user:${user.email.toLowerCase()}`, user);
    
    const { passwordHash, ...userToReturn } = user;
    return res.status(200).json({ user: userToReturn });
}

async function handleDelete(req: VercelRequest, res: VercelResponse) {
    const userId = req.headers['x-user-id'] as string;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });

    const { password, email } = req.body;
    
    if (!email) return res.status(400).json({ message: "Email required for deletion." });

    const userKey = `user:${email.toLowerCase()}`;
    const user = await kv.get<User>(userKey);
    
    if (!user) return res.status(404).json({ message: 'User not found.' });
    if (user.id !== userId) return res.status(403).json({ message: 'Forbidden' });

    if (!password || !verifyPassword(password, user.passwordHash)) {
        return res.status(403).json({ message: "The password you entered is incorrect." });
    }

    await kv.del(userKey);
    await kv.del(`data:${user.id}`);
    
    return res.status(200).json({ message: 'Account deleted successfully' });
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    switch (req.method) {
      case 'POST':
        return await handlePost(req, res);
      case 'PATCH':
        return await handlePatch(req, res);
      case 'DELETE':
        return await handleDelete(req, res);
      default:
        res.setHeader('Allow', ['POST', 'PATCH', 'DELETE']);
        return res.status(405).json({ message: 'Method Not Allowed' });
    }
  } catch (error) {
      console.error('User API error:', error);
      return res.status(500).json({ message: 'Internal Server Error' });
  }
}