export function getToken() {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('accessToken');
}

export function setTokens(accessToken: string, refreshToken: string) {
  localStorage.setItem('accessToken', accessToken);
  localStorage.setItem('refreshToken', refreshToken);
}

export function clearTokens() {
  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');
  localStorage.removeItem('user');
  localStorage.removeItem('company');
}

export function getUser() {
  if (typeof window === 'undefined') return null;
  const u = localStorage.getItem('user');
  return u ? JSON.parse(u) : null;
}

export function setUser(user: any) {
  localStorage.setItem('user', JSON.stringify(user));
}

export function getCompany() {
  if (typeof window === 'undefined') return null;
  const c = localStorage.getItem('company');
  return c ? JSON.parse(c) : null;
}

export function setCompany(company: any) {
  localStorage.setItem('company', JSON.stringify(company));
}
