# Dropdown / Select — Design System Guideline

## Rule: One dropdown, always

**Every dropdown in this app must use `<Select>` from `components/ui/Select.tsx`.**
Native `<select>` elements are forbidden — they render differently across OS/browser and break the design system.

---

## Usage

```tsx
import { Select } from './ui/Select';

<Select
  value={value}
  onChange={(v) => setValue(v)}
  options={[
    { value: 'a', label: 'Option A' },
    { value: 'b', label: 'Option B' },
  ]}
/>
```

### With prefix (avatar, icon, color dot)
```tsx
options={users.map(u => ({
  value: u.id,
  label: u.name,
  prefix: <UserAvatar userId={u.id} size={20} />,
}))}
```

### Disabled state
```tsx
<Select disabled={accounts.length === 0} placeholder="Немає акаунтів" ... />
```

### Custom trigger style (override default inputClass)
```tsx
<Select className="h-10 flex items-center gap-2 pl-1.5 pr-2.5 border ..." ... />
```

---

## Visual spec

| Element         | Style |
|-----------------|-------|
| Trigger button  | Same as `inputClass` in forms: `bg-[#f5f5f0]` border, `rounded-sm`, `py-2.5 px-3.5` |
| Chevron icon    | `ChevronDown` 14px, rotates 180° when open |
| Dropdown panel  | `bg-[#f5f5f0]` border, `rounded-sm`, `p-1`, `animate-scale-in`, `z-50`, `shadow-sm` |
| Option row      | `px-3 py-2 text-sm`, hover: `bg-[#f0efec]` / dark: `bg-[#1a1a18]` |
| Selected option | `Check` 13px in `text-[#5dde4a]` on the right |
| Separator       | `h-px bg-[#d6d5d0]` |

---

## What NOT to do

```tsx
// ❌ Native select
<select value={x} onChange={e => setX(e.target.value)}>
  <option value="a">A</option>
</select>

// ❌ Native select hidden behind a custom visual
<div className="relative">
  <div>visual</div>
  <select className="opacity-0 absolute inset-0" />
</div>

// ❌ Any third-party select library (react-select, etc.)
```

---

## When to use Select vs other patterns

| Situation | Use |
|-----------|-----|
| Pick one item from a list (3–20 items) | `<Select>` |
| Toggle between 2–4 fixed options | Segmented buttons (inline `button` group) |
| Filter chips (multi-select) | Pill buttons with active state |
| Actions menu (edit/delete/copy) | Custom dropdown with `isOpen` state, same panel style |
