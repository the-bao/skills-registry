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
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
      whileHover={{ y: -4 }}
      onClick={onClick}
      className="card-apple p-5 text-left cursor-pointer w-full"
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <h3
          className="text-base font-semibold text-[var(--color-text-primary)] leading-tight"
          style={{
            letterSpacing: "-0.224px",
            lineHeight: 1.29
          }}
        >
          {skill.name}
        </h3>
        {skill.version && (
          <span className="shrink-0 tag-apple">
            v{skill.version}
          </span>
        )}
      </div>

      {/* Description */}
      <p
        className="text-sm text-[var(--color-text-secondary)] line-clamp-2 mb-4"
        style={{
          letterSpacing: "-0.374px",
          lineHeight: 1.47
        }}
      >
        {skill.description}
      </p>

      {/* Tags */}
      {skill.tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {skill.tags.slice(0, 3).map((tag) => (
            <span key={tag} className="tag-apple">
              {tag}
            </span>
          ))}
          {skill.tags.length > 3 && (
            <span className="tag-apple text-[var(--color-text-tertiary)]">
              +{skill.tags.length - 3}
            </span>
          )}
        </div>
      )}
    </motion.button>
  );
}
