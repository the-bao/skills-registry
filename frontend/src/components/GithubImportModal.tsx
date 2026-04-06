import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { GithubImportResponse } from "../api/types";

interface GithubImportModalProps {
  onClose: () => void;
  onSubmit: (repo: string) => Promise<GithubImportResponse>;
}

export function GithubImportModal({ onClose, onSubmit }: GithubImportModalProps) {
  const [repo, setRepo] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<GithubImportResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!repo.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await onSubmit(repo.trim());
      setResult(res);
    } catch (e: any) {
      setError(e.message || "Import failed");
    } finally {
      setLoading(false);
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
              Import from GitHub
            </h2>
            <p
              className="text-xs text-[var(--color-text-tertiary)] mt-2"
              style={{ letterSpacing: "-0.12px" }}
            >
              Enter a GitHub repo in owner/repo format or full URL
            </p>
          </div>

          {/* Content */}
          <div className="p-6">
            {!result ? (
              <>
                <input
                  type="text"
                  value={repo}
                  onChange={(e) => setRepo(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && !loading && handleSubmit()}
                  placeholder="e.g. slavingia/skills"
                  className="w-full text-sm px-4 py-3 rounded-xl outline-none"
                  style={{
                    background: "rgba(0,0,0,0.04)",
                    border: "1px solid rgba(0,0,0,0.06)",
                    letterSpacing: "-0.374px"
                  }}
                  disabled={loading}
                  autoFocus
                />

                {error && (
                  <p
                    className="text-xs mt-3"
                    style={{ color: "var(--color-danger)" }}
                  >
                    {error}
                  </p>
                )}

                <div className="flex gap-3 justify-end mt-5">
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
                    disabled={!repo.trim() || loading}
                    className="btn-primary-blue disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {loading ? "Importing..." : "Import"}
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="space-y-3 mb-5 max-h-48 overflow-y-auto">
                  {result.imported.length > 0 && (
                    <div className="text-sm">
                      <span
                        className="font-medium"
                        style={{ color: "#34c759" }}
                      >
                        Imported ({result.imported.length}):
                      </span>{" "}
                      <span style={{ color: "var(--color-text-secondary)" }}>
                        {result.imported.join(", ")}
                      </span>
                    </div>
                  )}
                  {result.skipped.length > 0 && (
                    <div className="text-sm">
                      <span
                        className="font-medium"
                        style={{ color: "#ff9500" }}
                      >
                        Skipped ({result.skipped.length}):
                      </span>{" "}
                      <span style={{ color: "var(--color-text-secondary)" }}>
                        {result.skipped.join(", ")}
                      </span>
                    </div>
                  )}
                  {result.failed.length > 0 && (
                    <div className="text-sm">
                      <span
                        className="font-medium"
                        style={{ color: "var(--color-danger)" }}
                      >
                        Failed ({result.failed.length}):
                      </span>{" "}
                      <span style={{ color: "var(--color-text-secondary)" }}>
                        {result.failed.join(", ")}
                      </span>
                    </div>
                  )}
                  {result.imported.length === 0 && result.skipped.length === 0 && result.failed.length === 0 && (
                    <p
                      className="text-sm"
                      style={{ color: "var(--color-text-tertiary)" }}
                    >
                      No skills found in this repository.
                    </p>
                  )}
                </div>
                <div className="flex justify-end">
                  <button
                    onClick={onClose}
                    className="btn-primary-blue"
                  >
                    Done
                  </button>
                </div>
              </>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
