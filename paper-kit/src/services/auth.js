import api from './api';

export async function getMe() {
  const token = localStorage.getItem('pk_token');
  if (!token || token === 'guest_access_token') {
    const stored = localStorage.getItem('pk_user_profile');
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch {
        // Fallback
      }
    }
    return {
      _id: 'local_user',
      name: 'Open Source User',
      email: 'user@paperkit.local',
      preferences: { dark_mode: false, default_view: 'list', language: 'en' },
    };
  }

  try {
    const res = await api.get('/auth/me');
    return res.data;
  } catch {
    return {
      _id: 'local_user',
      name: 'Open Source User',
      email: 'user@paperkit.local',
      preferences: { dark_mode: false, default_view: 'list', language: 'en' },
    };
  }
}

export async function logout() {
  localStorage.removeItem('pk_token');
  localStorage.removeItem('pk_user_profile');
}

export async function updateMe(data) {
  const token = localStorage.getItem('pk_token');
  if (!token || token === 'guest_access_token') {
    let storedUser = {};
    const rawUser = localStorage.getItem('pk_user_profile');
    if (rawUser) {
      try {
        storedUser = JSON.parse(rawUser);
      } catch {
        storedUser = {};
      }
    }

    const updatedUser = {
      _id: 'local_user',
      name: data.name || storedUser.name || 'Open Source User',
      email: storedUser.email || 'user@paperkit.local',
      preferences: {
        ...(storedUser.preferences || { dark_mode: false, default_view: 'list', language: 'en' }),
        ...(data.preferences || {}),
      },
    };
    try {
      localStorage.setItem('pk_user_profile', JSON.stringify(updatedUser));
    } catch {
      // Ignore storage error
    }
    return updatedUser;
  }

  try {
    const res = await api.put('/auth/me', data);
    return res.data;
  } catch {
    return data;
  }
}

export async function deleteAccount() {
  return { status: 'ok' };
}
