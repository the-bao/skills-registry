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
          <h2 className="text-lg font-semibold text-text-primary mb-1">Import from GitHub</h2>
          <p className="text-xs text-text-tertiary mb-4">
            Enter a GitHub repo in owner/repo format or full URL
          </p>

          {!result ? (
            <>
              <input
                type="text"
                value={repo}
                onChange={(e) => setRepo(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && !loading && handleSubmit()}
                placeholder="e.g. slavingia/skills"
                className="w-full text-sm px-3.5 py-2.5 rounded-xl border border-glass-border bg-white/50 outline-none focus:border-accent/40 focus:ring-2 focus:ring-accent/10 transition-all mb-2"
                disabled={loading}
                autoFocus
              />

              {error && (
                <p className="text-xs text-red-500 mb-3">{error}</p>
              )}

              <div className="flex gap-2 justify-end mt-4">
                <button
                  onClick={onClose}
                  className="text-sm px-4 py-2 rounded-xl border border-glass-border text-text-secondary hover:bg-black/[0.03] transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={!repo.trim() || loading}
                  className="text-sm px-4 py-2 rounded-xl bg-accent text-white hover:bg-accent-hover transition-colors cursor-pointer font-medium disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {loading ? "Importing..." : "Import"}
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="space-y-2 mb-4 max-h-48 overflow-y-auto">
                {result.imported.length > 0 && (
                  <div className="text-sm">
                    <span className="text-green-600 font-medium">Imported ({result.imported.length}):</span>{" "}
                    <span className="text-text-secondary">{result.imported.join(", ")}</span>
                  </div>
                )}
                {result.skipped.length > 0 && (
                  <div className="text-sm">
                    <span className="text-yellow-600 font-medium">Skipped (already exist):</span>{" "}
                    <span className="text-text-secondary">{result.skipped.join(", ")}</span>
                  </div>
                )}
                {result.failed.length > 0 && (
                  <div className="text-sm">
                    <span className="text-red-500 font-medium">Failed:</span>{" "}
                    <span className="text-text-secondary">{result.failed.join(", ")}</span>
                  </div>
                )}
                {result.imported.length === 0 && result.skipped.length === 0 && result.failed.length === 0 && (
                  <p className="text-sm text-text-tertiary">No skills found in this repository.</p>
                )}
              </div>
              <div className="flex justify-end">
                <button
                  onClick={onClose}
                  className="text-sm px-4 py-2 rounded-xl bg-accent text-white hover:bg-accent-hover transition-colors cursor-pointer font-medium"
                >
                  Done
                </button>
              </div>
            </>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
