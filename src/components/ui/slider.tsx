import * as React from 'react'
interface SliderProps {
  min?: number; max?: number; step?: number;
  value: number[];
  onValueChange: (v: number[]) => void;
  className?: string;
}
export function Slider({ min=0, max=100, step=1, value, onValueChange, className }: SliderProps) {
  const v = value[0] ?? 0;
  return (
    <input
      type="range"
      min={min} max={max} step={step}
      value={v}
      onChange={(e) => onValueChange([Number(e.target.value)])}
      className={"w-full " + (className||'')}
    />
  )
}
