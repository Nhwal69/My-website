export function validateRegistration({ name, email, password }) {
  const errors = [];
  if (!name || name.length < 3) errors.push('Name must be at least 3 characters');
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.push('Valid email required');
  if (!password || password.length < 8) errors.push('Password must be at least 8 characters');
  return errors;
}

export function sanitize(str) {
  return str?.replace(/[<>'"&]/g, '')?.trim() || '';
}
