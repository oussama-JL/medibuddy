// Initials on a colour derived from the role (no photos): "AD" for Admin Démo.
const COLORS = { admin: 'bg-indigo-600', infirmier: 'bg-teal-600' };

export const initials = (user) => {
  if (!user) return '?';
  const letters = [user.prenom, user.nom].filter(Boolean).map((part) => part.trim().charAt(0).toUpperCase());
  return letters.join('') || '?';
};

export default function Avatar({ user, className = 'h-10 w-10 text-sm' }) {
  return (
    <span
      aria-hidden="true"
      className={`inline-flex shrink-0 select-none items-center justify-center rounded-full font-semibold text-white ${COLORS[user && user.role] || 'bg-gray-500'} ${className}`}
    >
      {initials(user)}
    </span>
  );
}
