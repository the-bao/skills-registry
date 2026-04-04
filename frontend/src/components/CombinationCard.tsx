import { motion } from "framer-motion";
import type { Combination } from "../api/types";

interface CombinationCardProps {
  combination: Combination;
  onClick: () => void;
}

export function CombinationCard({ combination, onClick }: CombinationCardProps) {
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
          {combination.name}
        </h3>
        <span className="shrink-0 text-[11px] text-text-tertiary bg-tag-bg px-1.5 py-0.5 rounded">
          {combination.skills.length} skills
        </span>
      </div>
      <p className="text-xs text-text-secondary line-clamp-2 leading-relaxed mb-3">
        {combination.description}
      </p>
      <div className="flex flex-wrap gap-1">
        {combination.skills.slice(0, 4).map((skill) => (
          <span
            key={skill}
            className="text-[11px] px-2 py-0.5 rounded-[var(--radius-tag)] bg-accent/10 text-accent"
          >
            {skill}
          </span>
        ))}
        {combination.skills.length > 4 && (
          <span className="text-[11px] px-2 py-0.5 rounded-[var(--radius-tag)] bg-tag-bg text-tag-text">
            +{combination.skills.length - 4}
          </span>
        )}
      </div>
    </motion.button>
  );
}
