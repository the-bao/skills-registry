import { motion } from "framer-motion";
import type { Skill } from "../api/types";

interface SkillCardProps {
  skill: Skill;
  onClick: () => void;
}

export function SkillCard({ skill, onClick }: SkillCardProps) {
  return (
    <motion.button
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.2 }}
      whileHover={{ y: -2, boxShadow: "var(--shadow-card-hover)" }}
      onClick={onClick}
      className="text-left p-5 rounded-[var(--radius-card)] bg-white border border-glass-border cursor-pointer transition-shadow"
      style={{ boxShadow: "var(--shadow-card)" }}
    >
      <div className="flex items-start justify-between gap-3 mb-2">
        <h3 className="text-sm font-semibold text-text-primary leading-tight">
          {skill.name}
        </h3>
        {skill.version && (
          <span className="shrink-0 text-[11px] text-text-tertiary bg-tag-bg px-1.5 py-0.5 rounded">
            v{skill.version}
          </span>
        )}
      </div>
      <p className="text-xs text-text-secondary line-clamp-2 leading-relaxed mb-3">
        {skill.description}
      </p>
      {skill.tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {skill.tags.map((tag) => (
            <span
              key={tag}
              className="text-[11px] px-2 py-0.5 rounded-[var(--radius-tag)] bg-tag-bg text-tag-text"
            >
              {tag}
            </span>
          ))}
        </div>
      )}
    </motion.button>
  );
}
