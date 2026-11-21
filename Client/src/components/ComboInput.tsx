import React, { useEffect, useId, useMemo, useRef, useState } from "react";
import { Check, ChevronDown } from "lucide-react";

/**
 * Text input with a dropdown of suggestions: people can pick an option or
 * type their own value. Keyboard: ↑/↓ to move, Enter to choose, Esc to close.
 */
export const ComboInput: React.FC<{
  id?: string;
  value: string;
  onChange: (value: string) => void;
  options: string[];
  placeholder?: string;
  invalid?: boolean;
  describedBy?: string;
}> = ({ id, value, onChange, options, placeholder, invalid, describedBy }) => {
  const listId = useId();
  const wrapRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const [active, setActive] = useState(-1);

  const filtered = useMemo(() => {
    const term = value.trim().toLowerCase();
    if (showAll || !term) return options;
    return options.filter((o) => o.toLowerCase().includes(term));
  }, [options, value, showAll]);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  useEffect(() => setActive(-1), [filtered]);

  const choose = (option: string) => {
    onChange(option);
    setOpen(false);
    setShowAll(false);
    inputRef.current?.focus();
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (!open) {
        setOpen(true);
        setShowAll(true);
        return;
      }
      setActive((i) => Math.min(i + 1, filtered.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter" && open && active >= 0 && filtered[active]) {
      e.preventDefault();
      choose(filtered[active]);
    } else if (e.key === "Escape" || e.key === "Tab") {
      setOpen(false);
    }
  };

  return (
    <div ref={wrapRef} className="relative">
      <input
        ref={inputRef}
        id={id}
        type="text"
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-describedby={describedBy}
        aria-invalid={invalid || undefined}
        aria-activedescendant={open && active >= 0 ? `${listId}-${active}` : undefined}
        autoComplete="off"
        className={`input pr-10 ${invalid ? "input-error" : ""}`}
        placeholder={placeholder}
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setShowAll(false);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={onKeyDown}
      />
      <button
        type="button"
        tabIndex={-1}
        aria-label="Show options"
        className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-slate-400 hover:text-navy-700"
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => {
          setShowAll(true);
          setOpen((o) => !o || !showAll);
          inputRef.current?.focus();
        }}
      >
        <ChevronDown className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && filtered.length > 0 && (
        <ul
          id={listId}
          role="listbox"
          className="absolute z-30 mt-1 max-h-60 w-full overflow-y-auto rounded-md border border-slate-200 bg-white py-1 text-sm shadow-lift animate-fade-in"
        >
          {filtered.map((option, i) => {
            const selected = option === value;
            return (
              <li
                key={option}
                id={`${listId}-${i}`}
                role="option"
                aria-selected={selected}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => choose(option)}
                onMouseEnter={() => setActive(i)}
                className={`flex cursor-pointer items-center justify-between gap-2 px-3.5 py-2 ${
                  i === active ? "bg-navy-50 text-navy-900" : "text-slate-700"
                }`}
              >
                <span className="truncate">{option}</span>
                {selected && <Check className="h-4 w-4 shrink-0 text-navy-700" />}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};

export const ACADEMIC_DESIGNATIONS = [
  "Professor",
  "Associate Professor",
  "Assistant Professor",
  "Head of Department",
  "Dean / Director",
  "Lecturer",
  "Postdoctoral Researcher",
  "Ph.D. Scholar",
  "Research Scholar",
  "Research Assistant",
  "Scientist",
  "M.Tech / M.E. Student",
  "M.Sc / MS Student",
  "MBA Student",
  "B.Tech / B.E. Student",
  "Undergraduate Student",
  "Industry Professional",
  "Independent Researcher",
];

export const INVENTOR_DESIGNATIONS = [
  "Professor",
  "Associate Professor",
  "Assistant Professor",
  "Ph.D. Scholar",
  "Research Scholar",
  "Scientist",
  "Engineer",
  "Founder / Director",
  "Student",
  "Industry Professional",
  "Independent Inventor",
];

export const APPLICANT_TYPES = [
  "Individual (natural person)",
  "University / Educational institution",
  "Start-up",
  "Small entity / MSME",
  "Company (Pvt. Ltd. / LLP)",
  "Government / Research organisation",
];
