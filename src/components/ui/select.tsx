import * as React from 'react'

type SelectContextType = {
  value?: string;
  onValueChange?: (v: string) => void;
  items: { value: string; label: React.ReactNode }[];
  setItems: React.Dispatch<React.SetStateAction<{ value: string; label: React.ReactNode }[]>>;
}
const SelectCtx = React.createContext<SelectContextType | null>(null);

export function Select({ value, onValueChange, children }: { value?: string; onValueChange?: (v: string)=>void; children: React.ReactNode }) {
  const [items, setItems] = React.useState<{value:string;label:React.ReactNode}[]>([]);
  return (
    <SelectCtx.Provider value={{ value, onValueChange, items, setItems }}>
      <div className="relative inline-block w-full">{children}</div>
    </SelectCtx.Provider>
  )
}
export function SelectTrigger({ className, children, title }: { className?: string; children?: React.ReactNode; title?: string }) {
  const ctx = React.useContext(SelectCtx)!;
  return (
    <select
      className={`border rounded-md h-9 px-2 w-full ${className||''}`}
      value={ctx.value}
      title={title}
      onChange={(e)=>ctx.onValueChange && ctx.onValueChange(e.target.value)}
    >
      {ctx.items.map((it) => <option key={it.value} value={it.value}>{String(it.label)}</option>)}
    </select>
  )
}
export function SelectContent({ children }: { children?: React.ReactNode }) {
  return <div className="hidden">{children}</div>
}
export function SelectItem({ value, children }: { value: string; children: React.ReactNode }) {
  const ctx = React.useContext(SelectCtx)!;
  React.useEffect(()=>{
    ctx.setItems(prev => (prev.some(p=>p.value===value) ? prev : [...prev, { value, label: children }]));
  }, [value, children]);
  return null;
}
export function SelectValue() { return null; }
