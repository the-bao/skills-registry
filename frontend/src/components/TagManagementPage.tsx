import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { api } from "../api/client";
import type { TagDetail } from "../api/types";

export function TagManagementPage() {
  const queryClient = useQueryClient();
  const [editingTag, setEditingTag] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["tags", "detail"],
    queryFn: api.getTagsDetail,
  });

  const renameMutation = useMutation({
    mutationFn: ({ oldName, newName }: { oldName: string; newName: string }) =>
      api.renameTag(oldName, { new_name: newName }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tags"] });
      queryClient.invalidateQueries({ queryKey: ["tags", "detail"] });
      setEditingTag(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: api.deleteTag,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tags"] });
      queryClient.invalidateQueries({ queryKey: ["tags", "detail"] });
      queryClient.invalidateQueries({ queryKey: ["skills"] });
      setConfirmDelete(null);
    },
  });

  const tags: TagDetail[] = data?.tags ?? [];

  const handleStartEdit = (tag: TagDetail) => {
    setEditingTag(tag.name);
    setEditValue(tag.name);
  };

  const handleSaveEdit = () => {
    if (editingTag && editValue.trim() && editValue.trim() !== editingTag) {
      renameMutation.mutate({ oldName: editingTag, newName: editValue.trim() });
    } else {
      setEditingTag(null);
    }
  };

  const handleCancelEdit = () => {
    setEditingTag(null);
    setEditValue("");
  };

  const handleDelete = (tagName: string) => {
    if (confirmDelete !== tagName) {
      setConfirmDelete(tagName);
      return;
    }
    deleteMutation.mutate(tagName);
  };

  return (
    <div className="max-w-3xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h2
          className="text-lg font-semibold text-[var(--color-text-primary)]"
          style={{ letterSpacing: "-0.28px", lineHeight: 1.1 }}
        >
          Tag Management
        </h2>
        <p
          className="text-xs text-[var(--color-text-tertiary)] mt-1"
          style={{ letterSpacing: "-0.12px" }}
        >
          Rename or delete tags across all skills
        </p>
      </div>

      {/* Table */}
      <div
        className="rounded-2xl overflow-hidden"
        style={{ background: "var(--color-white)" }}
      >
        {/* Table Header */}
        <div
          className="grid grid-cols-[1fr_auto_auto_auto] gap-4 px-5 py-3"
          style={{
            background: "var(--color-light-gray)",
            borderBottom: "1px solid rgba(0,0,0,0.06)"
          }}
        >
          <div
            className="text-xs font-medium text-[var(--color-text-tertiary)] uppercase tracking-wider"
            style={{ letterSpacing: "0.1em" }}
          >
            Tag Name
          </div>
          <div
            className="text-right pr-4 text-xs font-medium text-[var(--color-text-tertiary)] uppercase tracking-wider"
            style={{ letterSpacing: "0.1em" }}
          >
            Skills
          </div>
          <div className="w-20 text-center">
            <span
              className="text-xs font-medium text-[var(--color-text-tertiary)] uppercase tracking-wider"
              style={{ letterSpacing: "0.1em" }}
            >
              Rename
            </span>
          </div>
          <div className="w-20 text-center">
            <span
              className="text-xs font-medium text-[var(--color-text-tertiary)] uppercase tracking-wider"
              style={{ letterSpacing: "0.1em" }}
            >
              Delete
            </span>
          </div>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div
            className="flex items-center justify-center h-32 text-sm"
            style={{ color: "var(--color-text-tertiary)" }}
          >
            Loading tags...
          </div>
        )}

        {/* Empty State */}
        {!isLoading && tags.length === 0 && (
          <div
            className="flex items-center justify-center h-32 text-sm"
            style={{ color: "var(--color-text-tertiary)" }}
          >
            No tags found. Tags are created when added to skills.
          </div>
        )}

        {/* Tag Rows */}
        <AnimatePresence mode="popLayout">
          {tags.map((tag) => (
            <motion.div
              key={tag.name}
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.15 }}
              className="grid grid-cols-[1fr_auto_auto_auto] gap-4 px-5 py-4 items-center hover:bg-black/[0.02] transition-colors"
              style={{ borderBottom: "1px solid rgba(0,0,0,0.04)" }}
            >
              {/* Tag Name */}
              <div className="min-w-0">
                {editingTag === tag.name ? (
                  <input
                    type="text"
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleSaveEdit();
                      if (e.key === "Escape") handleCancelEdit();
                    }}
                    onBlur={handleSaveEdit}
                    autoFocus
                    className="w-full text-sm px-3 py-2 rounded-lg outline-none"
                    style={{
                      background: "rgba(0,113,227,0.08)",
                      border: "1px solid var(--color-apple-blue)",
                      letterSpacing: "-0.374px"
                    }}
                  />
                ) : (
                  <span
                    className="text-sm font-medium text-[var(--color-text-primary)] truncate block"
                    style={{ letterSpacing: "-0.224px" }}
                  >
                    {tag.name}
                  </span>
                )}
              </div>

              {/* Skill Count */}
              <div className="text-right pr-4">
                <span
                  className="text-sm text-[var(--color-text-secondary)] tabular-nums"
                  style={{ letterSpacing: "-0.224px" }}
                >
                  {tag.skill_count}
                </span>
              </div>

              {/* Rename Button */}
              <div className="w-20 flex justify-center">
                {editingTag === tag.name ? (
                  <button
                    onClick={handleCancelEdit}
                    className="text-sm px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
                    style={{ color: "var(--color-text-secondary)" }}
                  >
                    Cancel
                  </button>
                ) : (
                  <button
                    onClick={() => handleStartEdit(tag)}
                    disabled={renameMutation.isPending}
                    className="btn-pill-link text-xs py-1 px-3 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    Rename
                  </button>
                )}
              </div>

              {/* Delete Button */}
              <div className="w-20 flex justify-center">
                <button
                  onClick={() => handleDelete(tag.name)}
                  disabled={deleteMutation.isPending}
                  className={`text-xs px-3 py-1.5 rounded-full border transition-colors cursor-pointer font-medium ${
                    confirmDelete === tag.name
                      ? "bg-[var(--color-danger)] text-white border-[var(--color-danger)]"
                      : "border-[rgba(0,0,0,0.12)] text-[var(--color-text-secondary)] hover:border-[var(--color-danger)] hover:text-[var(--color-danger)]"
                  }`}
                  style={{ letterSpacing: "-0.224px" }}
                >
                  {confirmDelete === tag.name ? "Confirm" : "Delete"}
                </button>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Help Text */}
      <p
        className="text-xs text-center mt-5"
        style={{ color: "var(--color-text-tertiary)" }}
      >
        Tags are automatically created when added to skills. Deleting a tag removes it from all skills.
      </p>
    </div>
  );
}
