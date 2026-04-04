import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { Skill } from "../api/types";

interface CreateCombinationModalProps {
  allSkills: Skill[];
  onClose: () => void;
  onSubmit: (data: { name: string; description: string; skills: string[] }) => void;
}

export function CreateCombinationModal({ allSkills, onClose, onSubmit }: CreateCombinationModalProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);

  const handleSubmit = () => {
    const trimmedName = name.trim();
    if (trimmedName && selectedSkills.length > 0) {
      onSubmit({ name: trimmedName, description: description.trim(), skills: selectedSkills });
      onClose();
    }
  };

  const toggleSkill = (skillName: string) => {
    setSelectedSkills((prev) =>
      prev.includes(skillName)
        ? prev.filter((s) => s !== skillName)
        : [...prev, skillName]
    );
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
          className="w-full max-w-lg bg-white/90 backdrop-blur-2xl rounded-2xl border border-glass-border p-6 mx-4 max-h-[85vh] flex flex-col"
          style={{ boxShadow: "var(--shadow-modal)" }}
          onClick={(e) => e.stopPropagation()}
        >
          <h2 className="text-lg font-semibold text-text-primary mb-1">Create Combination</h2>
          <p className="text-xs text-text-tertiary mb-4">
            Group multiple skills into an installable combination
          </p>

          <div className="flex-1 overflow-y-auto mb-4 space-y-4">
            <div>
              <label className="text-xs font-medium text-text-tertiary uppercase tracking-wider block mb-1.5">
                Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. fullstack-dev"
                className="w-full text-sm px-3.5 py-2.5 rounded-xl border border-glass-border bg-white/50 outline-none focus:border-accent/40 focus:ring-2 focus:ring-accent/10 transition-all"
                autoFocus
              />
            </div>

            <div>
              <label className="text-xs font-medium text-text-tertiary uppercase tracking-wider block mb-1.5">
                Description
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What is this combination for?"
                className="w-full text-sm px-3.5 py-2.5 rounded-xl border border-glass-border bg-white/50 outline-none focus:border-accent/40 focus:ring-2 focus:ring-accent/10 transition-all resize-none"
                rows={2}
              />
            </div>

            <div>
              <label className="text-xs font-medium text-text-tertiary uppercase tracking-wider block mb-1.5">
                Skills ({selectedSkills.length} selected)
              </label>
              <div className="flex flex-col gap-1 max-h-48 overflow-y-auto">
                {allSkills.map((skill) => {
                  const isSelected = selectedSkills.includes(skill.name);
                  return (
                    <button
                      key={skill.name}
                      onClick={() => toggleSkill(skill.name)}
                      className={`flex items-center gap-2 text-left px-3 py-2 rounded-lg text-sm transition-colors cursor-pointer ${
                        isSelected
                          ? "bg-accent/10 text-accent"
                          : "hover:bg-black/[0.03] text-text-secondary"
                      }`}
                    >
                      <span
                        className={`w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${
                          isSelected ? "bg-accent border-accent" : "border-gray-300"
                        }`}
                      >
                        {isSelected && (
                          <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-xs truncate">{skill.name}</p>
                        <p className="text-[11px] text-text-tertiary truncate">{skill.description}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="flex gap-2 pt-3 border-t border-glass-border">
            <button
              onClick={onClose}
              className="text-sm px-4 py-2 rounded-xl border border-glass-border text-text-secondary hover:bg-black/[0.03] transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={!name.trim() || selectedSkills.length === 0}
              className="flex-1 text-sm px-4 py-2 rounded-xl bg-accent text-white hover:bg-accent-hover transition-colors cursor-pointer font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Create Combination
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
