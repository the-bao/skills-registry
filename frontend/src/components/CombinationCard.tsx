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
          {combination.name}
        </h3>
        <span className="shrink-0 tag-apple-blue">
          {combination.skills.length} skills
        </span>
      </div>

      {/* Description */}
      <p
        className="text-sm text-[var(--color-text-secondary)] line-clamp-2 mb-4"
        style={{
          letterSpacing: "-0.374px",
          lineHeight: 1.47
        }}
      >
        {combination.description}
      </p>

      {/* Skills preview */}
      <div className="flex flex-wrap gap-1.5">
        {combination.skills.slice(0, 4).map((skill) => (
          <span key={skill} className="tag-apple">
            {skill}
          </span>
        ))}
        {combination.skills.length > 4 && (
          <span className="tag-apple text-[var(--color-text-tertiary)]">
            +{combination.skills.length - 4}
          </span>
        )}
      </div>
    </motion.button>
  );
}
