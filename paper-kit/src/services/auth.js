import api from './api';

export async function firebaseLogin(idToken, name = null) {
  const res = await api.post('/auth/firebase', { idToken, name });
  return res.data; // { access_token, token_type }
}

export async function getMe() {
  const res = await api.get('/auth/me');
  return res.data;
}

export async function logout() {
  localStorage.removeItem('pk_token');
}

export async function updateMe(data) {
  const res = await api.put('/auth/me', data);
  return res.data;
}

export async function deleteAccount() {
  const res = await api.delete('/auth/delete-account');
  return res.data;
}

