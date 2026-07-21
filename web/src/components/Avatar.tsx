export function initials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .map((p) => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

export default function Avatar({ name, size = 'md' }: { name: string; size?: 'sm' | 'md' | 'lg' }) {
  return (
    <span className={`avatar ${size === 'md' ? '' : size}`} title={name} aria-label={name}>
      {initials(name)}
    </span>
  );
}
