import * as React from 'react'
export function Button({ children, className, variant='default', onClick }: React.PropsWithChildren<{className?: string; variant?: 'default'|'outline'; onClick?: React.MouseEventHandler<HTMLButtonElement>}>) {
  const base = 'px-3 py-2 rounded-xl text-sm font-medium';
  const styles = variant==='outline'
    ? 'border bg-white text-slate-700 hover:bg-slate-50'
    : 'bg-slate-900 text-white hover:bg-slate-800';
  return <button onClick={onClick} className={`${base} ${styles} ${className||''}`}>{children}</button>
}
