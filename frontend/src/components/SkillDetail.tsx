import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { Skill } from "../api/types";

interface SkillDetailProps {
  skill: Skill;
  onClose: () => void;
  onDelete: (name: string) => void;
  onInstall: (name: string) => void;
  onAddTag: (name: string, tag: string) => void;
  onRemoveTag: (name: string, tag: string) => void;
  onSuggestTags: (name: string) => Promise<string[]>;
  onTagsSuggested: (suggested: string[]) => void;
}

export function SkillDetail({
  skill,
  onClose,
  onDelete,
  onInstall,
  onAddTag,
  onRemoveTag,
  onSuggestTags,
  onTagsSuggested,
}: SkillDetailProps) {
  const [newTag, setNewTag] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [isSuggesting, setIsSuggesting] = useState(false);

  const handleAddTag = () => {
    const t = newTag.trim();
    if (t && !skill.tags.includes(t)) {
      onAddTag(skill.name, t);
      setNewTag("");
    }
  };

  const handleDelete = () => {
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    onDelete(skill.name);
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ duration: 0.2 }}
          className="w-full max-w-lg bg-white/90 backdrop-blur-2xl rounded-2xl border border-glass-border p-6 mx-4"
          style={{ boxShadow: "var(--shadow-modal)" }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-start justify-between mb-4">
            <div>
              <h2 className="text-xl font-semibold text-text-primary">{skill.name}</h2>
              {skill.version && (
                <p className="text-xs text-text-tertiary mt-0.5">v{skill.version}</p>
              )}
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

          <p className="text-sm text-text-secondary leading-relaxed mb-5">
            {skill.description}
          </p>

          {skill.user_invocable !== undefined && (
            <div className="flex items-center gap-2 mb-4 text-xs text-text-secondary">
              <span className={`w-2 h-2 rounded-full ${skill.user_invocable ? "bg-green-400" : "bg-gray-300"}`} />
              {skill.user_invocable ? "User invocable" : "Not user invocable"}
            </div>
          )}

          {/* Tags */}
          <div className="mb-5">
            <p className="text-xs font-medium text-text-tertiary uppercase tracking-wider mb-2">
              Tags
            </p>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {skill.tags.map((tag) => (
                <span
                  key={tag}
                  className="group inline-flex items-center gap-1 text-xs px-2 py-1 rounded-lg bg-tag-bg text-tag-text"
                >
                  {tag}
                  <button
                    onClick={() => onRemoveTag(skill.name, tag)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer hover:text-danger"
                  >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </span>
              ))}
            </div>
            <div className="flex gap-1.5">
              <input
                type="text"
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAddTag()}
                placeholder="Add tag..."
                className="flex-1 text-xs px-2.5 py-1.5 rounded-lg border border-glass-border bg-white/50 outline-none focus:border-accent/40 transition-colors"
              />
              <button
                onClick={handleAddTag}
                className="text-xs px-3 py-1.5 rounded-lg bg-accent text-white hover:bg-accent-hover transition-colors cursor-pointer"
              >
                Add
              </button>
              <button
                onClick={async () => {
                  setIsSuggesting(true);
                  try {
                    const suggested = await onSuggestTags(skill.name);
                    onTagsSuggested(suggested);
                  } catch (e) {
                    console.error("Failed to suggest tags:", e);
                  } finally {
                    setIsSuggesting(false);
                  }
                }}
                disabled={isSuggesting}
                className="text-xs px-3 py-1.5 rounded-lg border border-glass-border text-text-secondary hover:bg-accent/5 hover:border-accent/30 hover:text-accent transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSuggesting ? "Thinking..." : "AI Tag"}
              </button>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-3 border-t border-glass-border">
            <button
              onClick={() => onInstall(skill.name)}
              className="flex-1 text-sm px-4 py-2 rounded-xl bg-accent text-white hover:bg-accent-hover transition-colors cursor-pointer font-medium"
            >
              Install
            </button>
            <button
              onClick={handleDelete}
              className={`text-sm px-4 py-2 rounded-xl border transition-colors cursor-pointer font-medium ${
                confirmDelete
                  ? "bg-danger text-white border-danger hover:bg-danger-hover"
                  : "border-glass-border text-text-secondary hover:border-danger hover:text-danger"
              }`}
            >
              {confirmDelete ? "Confirm Delete" : "Delete"}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
