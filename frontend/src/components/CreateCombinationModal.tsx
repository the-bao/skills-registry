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
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        style={{ background: "rgba(0,0,0,0.5)", backdropFilter: "blur(20px)" }}
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 12 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          className="w-full max-w-lg rounded-2xl overflow-hidden flex flex-col max-h-[85vh]"
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
              Create Combination
            </h2>
            <p
              className="text-xs text-[var(--color-text-tertiary)] mt-2"
              style={{ letterSpacing: "-0.12px" }}
            >
              Group multiple skills into an installable combination
            </p>
          </div>

          {/* Content */}
          <div className="p-6 flex-1 overflow-y-auto space-y-5">
            {/* Name */}
            <div>
              <label
                className="text-xs font-medium text-[var(--color-text-tertiary)] uppercase tracking-wider block mb-2"
                style={{ letterSpacing: "0.1em" }}
              >
                Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. fullstack-dev"
                className="w-full text-sm px-4 py-3 rounded-xl outline-none"
                style={{
                  background: "rgba(0,0,0,0.04)",
                  border: "1px solid rgba(0,0,0,0.06)",
                  letterSpacing: "-0.374px"
                }}
                autoFocus
              />
            </div>

            {/* Description */}
            <div>
              <label
                className="text-xs font-medium text-[var(--color-text-tertiary)] uppercase tracking-wider block mb-2"
                style={{ letterSpacing: "0.1em" }}
              >
                Description
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What is this combination for?"
                className="w-full text-sm px-4 py-3 rounded-xl outline-none resize-none"
                style={{
                  background: "rgba(0,0,0,0.04)",
                  border: "1px solid rgba(0,0,0,0.06)",
                  letterSpacing: "-0.374px"
                }}
                rows={2}
              />
            </div>

            {/* Skills */}
            <div>
              <label
                className="text-xs font-medium text-[var(--color-text-tertiary)] uppercase tracking-wider block mb-2"
                style={{ letterSpacing: "0.1em" }}
              >
                Skills ({selectedSkills.length} selected)
              </label>
              <div
                className="flex flex-col gap-1 max-h-48 overflow-y-auto rounded-xl p-1"
                style={{ background: "rgba(0,0,0,0.02)" }}
              >
                {allSkills.map((skill) => {
                  const isSelected = selectedSkills.includes(skill.name);
                  return (
                    <button
                      key={skill.name}
                      onClick={() => toggleSkill(skill.name)}
                      className={`flex items-center gap-3 text-left px-3 py-2.5 rounded-lg text-sm transition-colors cursor-pointer ${
                        isSelected ? "tag-apple-blue" : "hover:bg-black/[0.02]"
                      }`}
                    >
                      <span
                        className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-colors ${
                          isSelected
                            ? "bg-[var(--color-apple-blue)] border-[var(--color-apple-blue)]"
                            : "border-[rgba(0,0,0,0.15)]"
                        }`}
                      >
                        {isSelected && (
                          <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p
                          className="font-medium text-xs truncate"
                          style={{ letterSpacing: "-0.224px" }}
                        >
                          {skill.name}
                        </p>
                        <p
                          className="text-[11px] truncate"
                          style={{ color: "var(--color-text-tertiary)", letterSpacing: "-0.12px" }}
                        >
                          {skill.description}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
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
              onClick={handleSubmit}
              disabled={!name.trim() || selectedSkills.length === 0}
              className="btn-primary-blue disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Create Combination
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
