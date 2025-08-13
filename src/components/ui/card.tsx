import * as React from 'react'
export function Card({ className, style, children }: React.PropsWithChildren<{className?: string; style?: React.CSSProperties;}>) {
  return <div className={"rounded-2xl border bg-white " + (className||"")} style={style}>{children}</div>
}
export function CardContent({ className, children }: React.PropsWithChildren<{className?: string;}>) {
  return <div className={className}>{children}</div>
}
