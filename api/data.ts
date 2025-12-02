
import { kv } from '@vercel/kv';
import type { VercelRequest, VercelResponse } from '@vercel/node';

// This simple authentication relies on a user ID passed in a header.
// For a production app, a more robust method like JWT or session cookies is recommended.
async function getUserIdFromRequest(req: VercelRequest): Promise<string | null> {
    const userId = req.headers['x-user-id'];
    if (typeof userId === 'string') {
        return userId;
    }
    return null;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const userId = await getUserIdFromRequest(req);

  if (!userId) {
    return res.status(401).json({ message: 'Unauthorized: User ID is missing' });
  }

  const dataKey = `data:${userId}`;

  try {
    if (req.method === 'GET') {
      const userData = await kv.get(dataKey);
      if (userData) {
        return res.status(200).json(userData);
      } else {
        // This can happen if user was created but initial data failed.
        // We can create it here to be robust.
         const initialData = {
            projects: [],
            completedTasks: [],
            activeProjectId: null,
            isSidebarOpen: true,
            settings: {
              theme: 'system',
              isAutoPriorityModeEnabled: false,
              autoPriorityDays: [],
              autoPriorityHours: 24,
              isAutoRotationEnabled: false,
            }
        };
        await kv.set(dataKey, initialData);
        return res.status(200).json(initialData);
      }
    } else if (req.method === 'POST') {
      const newUserData = req.body;
      if (!newUserData) {
          return res.status(400).json({ message: 'No data provided to save.' });
      }
      await kv.set(dataKey, newUserData);
      return res.status(200).json({ message: 'Data saved successfully' });
    } else {
      res.setHeader('Allow', ['GET', 'POST']);
      return res.status(405).json({ message: 'Method Not Allowed' });
    }
  } catch (error) {
    console.error('Data handling error:', error);
    return res.status(500).json({ message: 'Internal Server Error' });
  }
}
