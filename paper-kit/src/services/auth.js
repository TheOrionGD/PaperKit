import api from './api';

export async function getMe() {
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
}

export async function updateMe(data) {
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
