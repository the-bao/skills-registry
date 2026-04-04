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
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ duration: 0.2 }}
          className="w-full max-w-md bg-white/90 backdrop-blur-2xl rounded-2xl border border-glass-border p-6 mx-4 max-h-[80vh] flex flex-col"
          style={{ boxShadow: "var(--shadow-modal)" }}
          onClick={(e) => e.stopPropagation()}
        >
          <h2 className="text-lg font-semibold text-text-primary mb-1">Import Skills</h2>
          <p className="text-xs text-text-tertiary mb-4">
            Select skills from ~/.claude/skills/ to import
          </p>

          {skills.length === 0 ? (
            <p className="text-sm text-text-tertiary text-center py-8">
              No importable skills found in ~/.claude/skills/
            </p>
          ) : (
            <div className="flex-1 overflow-y-auto space-y-1 mb-4">
              {skills.map((skill) => (
                <label
                  key={skill.name}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer transition-colors ${
                    selected.has(skill.name) ? "bg-accent/8" : "hover:bg-black/[0.03]"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={selected.has(skill.name)}
                    onChange={() => toggle(skill.name)}
                    className="w-4 h-4 rounded accent-accent"
                  />
                  <div>
                    <p className="text-sm font-medium text-text-primary">{skill.name}</p>
                    <p className="text-[11px] text-text-tertiary truncate">{skill.path}</p>
                  </div>
                </label>
              ))}
            </div>
          )}

          <div className="flex gap-2 justify-end pt-3 border-t border-glass-border">
            <button
              onClick={onClose}
              className="text-sm px-4 py-2 rounded-xl border border-glass-border text-text-secondary hover:bg-black/[0.03] transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={handleImport}
              disabled={selected.size === 0}
              className="text-sm px-4 py-2 rounded-xl bg-accent text-white hover:bg-accent-hover transition-colors cursor-pointer font-medium disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Import ({selected.size})
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
