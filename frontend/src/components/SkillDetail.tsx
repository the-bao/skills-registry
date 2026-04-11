import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { Skill, Agent } from "../api/types";

interface SkillDetailProps {
  skill: Skill;
  allTags: string[];
  agents: Agent[];
  onClose: () => void;
  onDelete: (name: string) => void;
  onInstall: (name: string, agent: string) => void;
  onAddTag: (name: string, tag: string) => void;
  onRemoveTag: (name: string, tag: string) => void;
  onSuggestTags: (name: string) => Promise<string[]>;
  onTagsSuggested: (suggested: string[]) => void;
}

export function SkillDetail({
  skill,
  allTags,
  agents,
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
  const [showInstallOptions, setShowInstallOptions] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState(agents[0]?.id ?? "");

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

  const handleInstall = () => {
    if (!selectedAgent) return;
    onInstall(skill.name, selectedAgent);
    setShowInstallOptions(false);
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
          className="w-full max-w-lg rounded-2xl overflow-hidden"
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
              <h2
                className="text-xl font-semibold text-[var(--color-text-primary)]"
                style={{ letterSpacing: "-0.28px", lineHeight: 1.1 }}
              >
                {skill.name}
              </h2>
              {skill.version && (
                <p
                  className="text-xs mt-1 text-[var(--color-text-tertiary)]"
                  style={{ letterSpacing: "-0.12px" }}
                >
                  v{skill.version}
                </p>
              )}
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
            <p
              className="text-sm text-[var(--color-text-secondary)] mb-5"
              style={{ letterSpacing: "-0.374px", lineHeight: 1.47 }}
            >
              {skill.description}
            </p>

            {/* Status indicator */}
            {skill.user_invocable !== undefined && (
              <div
                className="flex items-center gap-2 mb-5 text-sm"
                style={{ color: "var(--color-text-secondary)" }}
              >
                <span
                  className="w-2 h-2 rounded-full"
                  style={{ background: skill.user_invocable ? "#34c759" : "#8e8e93" }}
                />
                <span style={{ letterSpacing: "-0.224px" }}>
                  {skill.user_invocable ? "User invocable" : "Not user invocable"}
                </span>
              </div>
            )}

            {/* Tags */}
            <div className="mb-5">
              <p
                className="text-xs font-medium text-[var(--color-text-tertiary)] uppercase tracking-wider mb-2"
                style={{ letterSpacing: "0.1em" }}
              >
                Tags
              </p>
              <div className="flex flex-wrap gap-2 mb-3">
                {skill.tags.map((tag) => (
                  <span
                    key={tag}
                    className="group inline-flex items-center gap-1.5 tag-apple"
                  >
                    {tag}
                    <button
                      onClick={() => onRemoveTag(skill.name, tag)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer hover:text-[var(--color-danger)]"
                    >
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </span>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleAddTag()}
                  placeholder="Add or select tag..."
                  className="flex-1 text-sm px-3 py-2 rounded-lg outline-none transition-colors"
                  style={{
                    background: "rgba(0,0,0,0.04)",
                    border: "1px solid rgba(0,0,0,0.06)",
                    letterSpacing: "-0.374px"
                  }}
                  list="existing-tags-detail"
                />
                <datalist id="existing-tags-detail">
                  {allTags
                    .filter((t) => !skill.tags.includes(t))
                    .map((t) => (
                      <option key={t} value={t} />
                    ))}
                </datalist>
                <button
                  onClick={handleAddTag}
                  disabled={!newTag.trim()}
                  className="btn-primary-blue text-sm px-4 disabled:opacity-40 disabled:cursor-not-allowed"
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
                  className="btn-pill-link text-sm disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {isSuggesting ? "Thinking..." : "AI Tag"}
                </button>
              </div>
            </div>

            {/* Actions */}
            <div
              className="pt-5"
              style={{ borderTop: "1px solid rgba(0,0,0,0.08)" }}
            >
              {showInstallOptions ? (
                /* Install Options Panel */
                <div className="space-y-3">
                  <p className="text-xs font-medium text-[var(--color-text-tertiary)]" style={{ letterSpacing: "-0.224px" }}>
                    Select target agent
                  </p>
                  <div className="space-y-2">
                    {agents.map((agent) => (
                      <label
                        key={agent.id}
                        className="flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-colors"
                        style={{
                          background: selectedAgent === agent.id ? "rgba(0,113,227,0.08)" : "rgba(0,0,0,0.02)",
                          border: selectedAgent === agent.id ? "1px solid var(--color-apple-blue)" : "1px solid rgba(0,0,0,0.06)",
                        }}
                      >
                        <input
                          type="radio"
                          name="agent"
                          value={agent.id}
                          checked={selectedAgent === agent.id}
                          onChange={() => setSelectedAgent(agent.id)}
                          className="accent-[var(--color-apple-blue)]"
                        />
                        <span className="text-sm" style={{ letterSpacing: "-0.224px" }}>
                          {agent.name}
                        </span>
                      </label>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => { setShowInstallOptions(false); }}
                      className="flex-1 text-sm px-4 py-2.5 rounded-full border transition-colors cursor-pointer"
                      style={{ borderColor: "rgba(0,0,0,0.12)", color: "var(--color-text-secondary)", letterSpacing: "-0.224px" }}
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleInstall}
                      disabled={!selectedAgent}
                      className="flex-1 btn-primary-blue disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      Install
                    </button>
                  </div>
                </div>
              ) : (
                /* Default Actions */
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowInstallOptions(true)}
                    className="btn-primary-blue flex-1"
                  >
                    Install
                  </button>
                  <button
                    onClick={handleDelete}
                    className={`text-sm px-5 py-2.5 rounded-full border transition-colors cursor-pointer font-medium ${
                      confirmDelete
                        ? "bg-[var(--color-danger)] text-white border-[var(--color-danger)]"
                        : "border-[rgba(0,0,0,0.12)] text-[var(--color-text-secondary)] hover:border-[var(--color-danger)] hover:text-[var(--color-danger)]"
                    }`}
                    style={{ letterSpacing: "-0.224px" }}
                  >
                    {confirmDelete ? "Confirm Delete" : "Delete"}
                  </button>
                </div>
              )}
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
