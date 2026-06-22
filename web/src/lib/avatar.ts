// Rotating initials-avatar palette (Medical Blue family + accents). Doctor photos are
// deferred — initials render perfectly at every size with no storage/cropping overhead.

export const AVATAR_COLORS = [
  { bg: 'hsl(201 60% 90%)', fg: 'hsl(201 100% 30%)' },
  { bg: 'hsl(270 50% 90%)', fg: 'hsl(270 60% 35%)' },
  { bg: 'hsl(175 50% 88%)', fg: 'hsl(175 60% 28%)' },
  { bg: 'hsl(38  70% 88%)', fg: 'hsl(38  80% 32%)' },
]

export function avatarColor(index: number): { bg: string; fg: string } {
  return AVATAR_COLORS[index % AVATAR_COLORS.length]
}

export function initial(name: string | null | undefined): string {
  return (name ?? 'D').charAt(0).toUpperCase()
}
