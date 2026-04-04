import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface AddSkillModalProps {
  onClose: () => void;
  onSubmit: (sourcePath: string) => void;
}

export function AddSkillModal({ onClose, onSubmit }: AddSkillModalProps) {
  const [path, setPath] = useState("");

  const handleSubmit = () => {
    if (path.trim()) {
      onSubmit(path.trim());
      onClose();
    }
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
          className="w-full max-w-md bg-white/90 backdrop-blur-2xl rounded-2xl border border-glass-border p-6 mx-4"
          style={{ boxShadow: "var(--shadow-modal)" }}
          onClick={(e) => e.stopPropagation()}
        >
          <h2 className="text-lg font-semibold text-text-primary mb-1">Add Skill</h2>
          <p className="text-xs text-text-tertiary mb-4">
            Enter the path to a directory containing a SKILL.md file
          </p>

          <input
            type="text"
            value={path}
            onChange={(e) => setPath(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
            placeholder="/path/to/skill-directory"
            className="w-full text-sm px-3.5 py-2.5 rounded-xl border border-glass-border bg-white/50 outline-none focus:border-accent/40 focus:ring-2 focus:ring-accent/10 transition-all mb-4"
            autoFocus
          />

          <div className="flex gap-2 justify-end">
            <button
              onClick={onClose}
              className="text-sm px-4 py-2 rounded-xl border border-glass-border text-text-secondary hover:bg-black/[0.03] transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              className="text-sm px-4 py-2 rounded-xl bg-accent text-white hover:bg-accent-hover transition-colors cursor-pointer font-medium"
            >
              Add
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
