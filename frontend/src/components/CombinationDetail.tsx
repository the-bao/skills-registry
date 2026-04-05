import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { Combination, Skill } from "../api/types";

interface CombinationDetailProps {
  combination: Combination;
  allSkills: Skill[];
  onClose: () => void;
  onDelete: (name: string) => void;
  onInstall: (name: string) => void;
  onUpdate: (name: string, data: { description?: string; skills?: string[] }) => void;
}

export function CombinationDetail({
  combination,
  allSkills,
  onClose,
  onDelete,
  onInstall,
  onUpdate,
}: CombinationDetailProps) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editSkills, setEditSkills] = useState(combination.skills);
  const [editDescription, setEditDescription] = useState(combination.description);

  const handleDelete = () => {
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    onDelete(combination.name);
  };

  const handleSave = () => {
    onUpdate(combination.name, {
      description: editDescription,
      skills: editSkills,
    });
    setEditing(false);
  };

  const toggleSkill = (skillName: string) => {
    setEditSkills((prev) =>
      prev.includes(skillName)
        ? prev.filter((s) => s !== skillName)
        : [...prev, skillName]
    );
  };

  const missingSkills = combination.skills.filter(
    (s) => !allSkills.some((as_) => as_.name === s)
  );

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
          <div className="flex items-start justify-between mb-4">
            <div>
              <h2 className="text-xl font-semibold text-text-primary">{combination.name}</h2>
              <p className="text-xs text-text-tertiary mt-0.5">
                {combination.skills.length} skills
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setEditing(!editing)}
                className="text-xs px-3 py-1.5 rounded-lg border border-glass-border text-text-secondary hover:bg-black/[0.03] transition-colors cursor-pointer"
              >
                {editing ? "Cancel" : "Edit"}
              </button>
              <button
                onClick={onClose}
                className="w-7 h-7 rounded-full flex items-center justify-center hover:bg-black/5 transition-colors cursor-pointer text-text-tertiary"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {editing ? (
            <div className="flex-1 overflow-y-auto mb-4">
              <div className="mb-4">
                <p className="text-xs font-medium text-text-tertiary uppercase tracking-wider mb-2">
                  Description
                </p>
                <textarea
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  className="w-full text-xs px-3 py-2 rounded-lg border border-glass-border bg-white/50 outline-none focus:border-accent/40 resize-none"
                  rows={2}
                />
              </div>
              <div>
                <p className="text-xs font-medium text-text-tertiary uppercase tracking-wider mb-2">
                  Skills ({editSkills.length} selected)
                </p>
                <div className="flex flex-col gap-1 max-h-48 overflow-y-auto">
                  {allSkills.map((skill) => {
                    const isSelected = editSkills.includes(skill.name);
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
          ) : (
            <div className="flex-1 overflow-y-auto mb-4">
              <p className="text-sm text-text-secondary leading-relaxed mb-4">
                {combination.description}
              </p>
              <div className="mb-4">
                <p className="text-xs font-medium text-text-tertiary uppercase tracking-wider mb-2">
                  Included Skills
                </p>
                <div className="flex flex-col gap-1">
                  {combination.skills.map((skillName) => {
                    const exists = allSkills.some((s) => s.name === skillName);
                    return (
                      <div
                        key={skillName}
                        className="flex items-center gap-2 text-sm px-3 py-2 rounded-lg bg-surface"
                      >
                        <span
                          className={`w-2 h-2 rounded-full shrink-0 ${exists ? "bg-green-400" : "bg-gray-300"}`}
                        />
                        <span className={exists ? "text-text-primary" : "text-text-tertiary line-through"}>
                          {skillName}
                        </span>
                        {!exists && (
                          <span className="text-[10px] text-text-tertiary ml-auto">missing</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
              {missingSkills.length > 0 && (
                <p className="text-xs text-danger">
                  {missingSkills.length} skill(s) no longer exist and will be skipped during install
                </p>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2 pt-3 border-t border-glass-border">
            {editing ? (
              <button
                onClick={handleSave}
                className="flex-1 text-sm px-4 py-2 rounded-xl bg-accent text-white hover:bg-accent-hover transition-colors cursor-pointer font-medium"
              >
                Save Changes
              </button>
            ) : (
              <>
                <button
                  onClick={() => onInstall(combination.name)}
                  className="flex-1 text-sm px-4 py-2 rounded-xl bg-accent text-white hover:bg-accent-hover transition-colors cursor-pointer font-medium"
                >
                  Install All ({combination.skills.length})
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
              </>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
