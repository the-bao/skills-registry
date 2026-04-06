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
        className="fixed inset-0 z-[60] flex items-center justify-center p-4"
        style={{ background: "rgba(0,0,0,0.5)", backdropFilter: "blur(20px)" }}
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 12 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          className="w-full max-w-sm rounded-2xl overflow-hidden"
          style={{
            background: "var(--color-white)",
            boxShadow: "var(--shadow-modal)"
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div
            className="px-6 pt-6 pb-5 flex items-start justify-between"
            style={{ background: "var(--color-light-gray)" }}
          >
            <div>
              <h3
                className="text-lg font-semibold text-[var(--color-text-primary)]"
                style={{ letterSpacing: "-0.28px", lineHeight: 1.1 }}
              >
                AI Tag Suggestions
              </h3>
              <p
                className="text-xs text-[var(--color-text-tertiary)] mt-1"
                style={{ letterSpacing: "-0.12px" }}
              >
                for <span className="font-medium text-[var(--color-text-secondary)]">{skillName}</span>
              </p>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full flex items-center justify-center transition-colors cursor-pointer"
              style={{ background: "rgba(0,0,0,0.04)" }}
            >
              <svg className="w-4 h-4 text-[var(--color-text-tertiary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Content */}
          <div className="p-6">
            {/* Tags */}
            <div className="mb-5">
              <p
                className="text-xs font-medium text-[var(--color-text-tertiary)] uppercase tracking-wider mb-3"
                style={{ letterSpacing: "0.1em" }}
              >
                Suggested Tags
              </p>
              <div className="flex flex-wrap gap-2 min-h-[2rem]">
                {suggested.map((tag) => {
                  const isExisting = existingTags.includes(tag);
                  const isSelected = selected.has(tag);

                  return (
                    <button
                      key={tag}
                      onClick={() => toggleTag(tag)}
                      disabled={isExisting}
                      className={`
                        inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border transition-all
                        ${isExisting
                          ? "border-[rgba(0,0,0,0.08)] text-[var(--color-text-tertiary)] cursor-not-allowed line-through"
                          : isSelected
                          ? "tag-apple-blue border-transparent cursor-pointer"
                          : "border-[rgba(0,0,0,0.08)] text-[var(--color-text-secondary)] cursor-pointer hover:border-[var(--color-apple-blue)] hover:text-[var(--color-apple-blue)]"
                        }
                      `}
                      style={{ letterSpacing: "-0.224px" }}
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
                <p
                  className="text-[11px] mt-3"
                  style={{ color: "var(--color-text-tertiary)" }}
                >
                  {existingCount} tag{existingCount !== 1 ? "s" : ""} already present (not selectable)
                </p>
              )}
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="flex-1 text-sm px-5 py-2.5 rounded-full border transition-colors cursor-pointer"
                style={{
                  borderColor: "rgba(0,0,0,0.12)",
                  color: "var(--color-text-secondary)",
                  letterSpacing: "-0.224px"
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleConfirm}
                disabled={isLoading || selectableCount === 0}
                className="flex-1 btn-primary-blue disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {isLoading ? "Adding..." : `Add (${selectableCount})`}
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
