import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface SuggestTagsModalProps {
  skillName: string;
  suggested: string[];
  existingTags: string[];
  onConfirm: (tags: string[]) => void;
  onClose: () => void;
  isLoading: boolean;
}

export function SuggestTagsModal({
  skillName,
  suggested,
  existingTags,
  onConfirm,
  onClose,
  isLoading,
}: SuggestTagsModalProps) {
  const [selected, setSelected] = useState<Set<string>>(
    new Set(suggested.filter((tag) => !existingTags.includes(tag)))
  );

  const toggleTag = (tag: string) => {
    if (existingTags.includes(tag)) return;
    const next = new Set(selected);
    if (next.has(tag)) {
      next.delete(tag);
    } else {
      next.add(tag);
    }
    setSelected(next);
  };

  const handleConfirm = () => {
    onConfirm(Array.from(selected));
  };

  const selectableCount = selected.size;
  const existingCount = suggested.length - suggested.filter((t) => !existingTags.includes(t)).length;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[60] flex items-center justify-center bg-black/30 backdrop-blur-sm"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ duration: 0.2 }}
          className="w-full max-w-sm bg-white/90 backdrop-blur-2xl rounded-2xl border border-glass-border p-5 mx-4"
          style={{ boxShadow: "var(--shadow-modal)" }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-start justify-between mb-4">
            <div>
              <h3 className="text-base font-semibold text-text-primary">AI Tag Suggestions</h3>
              <p className="text-xs text-text-tertiary mt-0.5">
                for <span className="font-medium text-text-secondary">{skillName}</span>
              </p>
            </div>
            <button
              onClick={onClose}
              className="w-7 h-7 rounded-full flex items-center justify-center hover:bg-black/5 transition-colors cursor-pointer text-text-tertiary"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Tags */}
          <div className="mb-5">
            <p className="text-xs font-medium text-text-tertiary uppercase tracking-wider mb-2">
              Suggested Tags
            </p>
            <div className="flex flex-wrap gap-1.5 min-h-[2rem]">
              {suggested.map((tag) => {
                const isExisting = existingTags.includes(tag);
                const isSelected = selected.has(tag);

                return (
                  <button
                    key={tag}
                    onClick={() => toggleTag(tag)}
                    disabled={isExisting}
                    className={`
                      inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg border transition-all
                      ${isExisting
                        ? "bg-gray-100 text-text-tertiary border-gray-200 cursor-not-allowed line-through"
                        : isSelected
                        ? "bg-accent/10 text-accent border-accent/30 cursor-pointer hover:bg-accent/15"
                        : "bg-white/50 text-text-secondary border-glass-border cursor-pointer hover:border-accent/30 hover:text-accent"
                      }
                    `}
                  >
                    {tag}
                    {isExisting && (
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </button>
                );
              })}
            </div>
            {existingCount > 0 && (
              <p className="text-[10px] text-text-tertiary mt-2">
                {existingCount} tag{existingCount !== 1 ? "s" : ""} already present (not selectable)
              </p>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="flex-1 text-sm px-4 py-2 rounded-xl border border-glass-border text-text-secondary hover:bg-black/[0.03] transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirm}
              disabled={isLoading || selectableCount === 0}
              className="flex-1 text-sm px-4 py-2 rounded-xl bg-accent text-white hover:bg-accent-hover transition-colors cursor-pointer font-medium disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {isLoading ? "Adding..." : `Add Selected (${selectableCount})`}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
