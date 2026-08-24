/** Where a signed-in user belongs by default. */
export const landingPathFor = (user) => {
  if (!user) return '/login';
  return user.role === 'doctor' ? '/dashboard' : '/slots';
};
