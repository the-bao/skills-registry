interface SidebarProps {
  tags: string[];
  selectedTag: string | null;
  onSelectTag: (tag: string | null) => void;
  skillCount: number;
  comboCount?: number;
}

export function Sidebar({ tags, selectedTag, onSelectTag, skillCount, comboCount }: SidebarProps) {
  return (
    <aside className="nav-glass w-56 shrink-0 h-screen sticky top-0 flex flex-col py-5 px-4 gap-6 overflow-y-auto">
      {/* Header */}
      <div>
        <h1 className="font-display-section text-white tracking-tight leading-none">
          Skills Registry
        </h1>
        <p className="font-micro text-white/48 mt-1">
          {skillCount} skills · {comboCount ?? 0} combinations
        </p>
      </div>

      {/* Tags Section */}
      <nav>
        <p className="font-micro text-white/48 uppercase tracking-widest mb-3 pl-1">
          Tags
        </p>
        <div className="flex flex-col gap-0.5">
          <button
            onClick={() => onSelectTag(null)}
            className={`text-left px-3 py-2 rounded-lg text-sm transition-all cursor-pointer ${
              selectedTag === null
                ? "bg-white/20 text-white font-medium"
                : "text-white/70 hover:bg-white/10 hover:text-white"
            }`}
            style={{ letterSpacing: "-0.224px" }}
          >
            All
          </button>
          {tags.map((tag) => (
            <button
              key={tag}
              onClick={() => onSelectTag(tag)}
              className={`text-left px-3 py-2 rounded-lg text-sm transition-all cursor-pointer ${
                selectedTag === tag
                  ? "bg-white/20 text-white font-medium"
                  : "text-white/70 hover:bg-white/10 hover:text-white"
              }`}
              style={{ letterSpacing: "-0.224px" }}
            >
              {tag}
            </button>
          ))}
        </div>
      </nav>

      {/* Bottom accent line */}
      <div className="mt-auto pt-4 border-t border-white/10">
        <p className="font-micro text-white/32">
          Browse and manage your skills
        </p>
      </div>
    </aside>
  );
}
