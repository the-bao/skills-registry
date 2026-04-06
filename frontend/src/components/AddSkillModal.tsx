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
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        style={{ background: "rgba(0,0,0,0.5)", backdropFilter: "blur(20px)" }}
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 12 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          className="w-full max-w-md rounded-2xl overflow-hidden"
          style={{
            background: "var(--color-white)",
            boxShadow: "var(--shadow-modal)"
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div
            className="px-6 pt-6 pb-5"
            style={{ background: "var(--color-light-gray)" }}
          >
            <h2
              className="text-xl font-semibold text-[var(--color-text-primary)]"
              style={{ letterSpacing: "-0.28px", lineHeight: 1.1 }}
            >
              Add Skill
            </h2>
            <p
              className="text-xs text-[var(--color-text-tertiary)] mt-2"
              style={{ letterSpacing: "-0.12px" }}
            >
              Enter the path to a directory containing a SKILL.md file
            </p>
          </div>

          {/* Content */}
          <div className="p-6">
            <input
              type="text"
              value={path}
              onChange={(e) => setPath(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
              placeholder="/path/to/skill-directory"
              className="w-full text-sm px-4 py-3 rounded-xl outline-none mb-5"
              style={{
                background: "rgba(0,0,0,0.04)",
                border: "1px solid rgba(0,0,0,0.06)",
                letterSpacing: "-0.374px"
              }}
              autoFocus
            />

            <div className="flex gap-3 justify-end">
              <button
                onClick={onClose}
                className="text-sm px-5 py-2.5 rounded-full border transition-colors cursor-pointer"
                style={{
                  borderColor: "rgba(0,0,0,0.12)",
                  color: "var(--color-text-secondary)",
                  letterSpacing: "-0.224px"
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                className="btn-primary-blue"
              >
                Add
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
