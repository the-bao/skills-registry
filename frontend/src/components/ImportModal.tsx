import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { ImportableSkill } from "../api/types";

interface ImportModalProps {
  skills: ImportableSkill[];
  onClose: () => void;
  onImport: (names: string[]) => void;
}

export function ImportModal({ skills, onClose, onImport }: ImportModalProps) {
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const toggle = (name: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  };

  const handleImport = () => {
    if (selected.size > 0) {
      onImport(Array.from(selected));
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
          className="w-full max-w-md rounded-2xl overflow-hidden flex flex-col max-h-[80vh]"
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
              Import Skills
            </h2>
            <p
              className="text-xs text-[var(--color-text-tertiary)] mt-2"
              style={{ letterSpacing: "-0.12px" }}
            >
              Select skills from ~/.claude/skills/ to import
            </p>
          </div>

          {/* Content */}
          <div className="p-6 flex-1 overflow-y-auto">
            {skills.length === 0 ? (
              <p
                className="text-sm text-center py-8"
                style={{ color: "var(--color-text-tertiary)" }}
              >
                No importable skills found in ~/.claude/skills/
              </p>
            ) : (
              <div className="space-y-1">
                {skills.map((skill) => (
                  <label
                    key={skill.name}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer transition-colors ${
                      selected.has(skill.name) ? "bg-[rgba(0,113,227,0.08)]" : "hover:bg-black/[0.02]"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selected.has(skill.name)}
                      onChange={() => toggle(skill.name)}
                      className="w-4 h-4 rounded accent-[var(--color-apple-blue)]"
                    />
                    <div>
                      <p
                        className="text-sm font-medium text-[var(--color-text-primary)]"
                        style={{ letterSpacing: "-0.224px" }}
                      >
                        {skill.name}
                      </p>
                      <p
                        className="text-[11px] truncate"
                        style={{ color: "var(--color-text-tertiary)", letterSpacing: "-0.12px" }}
                      >
                        {skill.path}
                      </p>
                    </div>
                  </label>
                ))}
              </div>
            )}
          </div>

          {/* Actions */}
          <div
            className="flex gap-3 p-6 justify-end"
            style={{ borderTop: "1px solid rgba(0,0,0,0.08)" }}
          >
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
              onClick={handleImport}
              disabled={selected.size === 0}
              className="btn-primary-blue disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Import ({selected.size})
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
