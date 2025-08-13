import * as React from 'react'
export function Label({ className, children }: React.PropsWithChildren<{className?: string;}>) {
  return <label className={`text-sm text-slate-700 ${className||''}`}>{children}</label>
}
