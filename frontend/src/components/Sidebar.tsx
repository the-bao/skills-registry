interface SidebarProps {
  tags: string[];
  selectedTag: string | null;
  onSelectTag: (tag: string | null) => void;
  skillCount: number;
  comboCount?: number;
}

export function Sidebar({ tags, selectedTag, onSelectTag, skillCount, comboCount }: SidebarProps) {
  return (
    <aside className="w-56 shrink-0 h-screen sticky top-0 border-r border-glass-border bg-glass backdrop-blur-2xl p-5 flex flex-col gap-5 overflow-y-auto">
      <div>
        <h1 className="text-lg font-semibold text-text-primary tracking-tight">Skills Registry</h1>
        <p className="text-xs text-text-tertiary mt-0.5">{skillCount} skills · {comboCount ?? 0} combinations</p>
      </div>

      <div>
        <p className="text-[11px] font-medium uppercase tracking-wider text-text-tertiary mb-2">
          Tags
        </p>
        <div className="flex flex-col gap-0.5">
          <button
            onClick={() => onSelectTag(null)}
            className={`text-left px-3 py-1.5 rounded-lg text-sm transition-all cursor-pointer ${
              selectedTag === null
                ? "bg-accent/10 text-accent font-medium"
                : "text-text-secondary hover:bg-black/[0.04]"
            }`}
          >
            All
          </button>
          {tags.map((tag) => (
            <button
              key={tag}
              onClick={() => onSelectTag(tag)}
              className={`text-left px-3 py-1.5 rounded-lg text-sm transition-all cursor-pointer ${
                selectedTag === tag
                  ? "bg-accent/10 text-accent font-medium"
                  : "text-text-secondary hover:bg-black/[0.04]"
              }`}
            >
              {tag}
            </button>
          ))}
        </div>
      </div>
    </aside>
  );
}
