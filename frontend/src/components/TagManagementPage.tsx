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
        <h2 className="text-lg font-semibold text-text-primary">Tag Management</h2>
        <p className="text-xs text-text-tertiary mt-0.5">
          Rename or delete tags across all skills
        </p>
      </div>

      {/* Table */}
      <div className="bg-white/60 backdrop-blur-xl rounded-2xl border border-glass-border overflow-hidden">
        {/* Table Header */}
        <div className="grid grid-cols-[1fr_auto_auto_auto] gap-4 px-5 py-3 border-b border-glass-border text-xs font-medium text-text-tertiary uppercase tracking-wider">
          <div>Tag Name</div>
          <div className="text-right pr-4">Skills</div>
          <div className="w-20 text-center">Rename</div>
          <div className="w-20 text-center">Delete</div>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="flex items-center justify-center h-32 text-text-tertiary text-sm">
            Loading tags...
          </div>
        )}

        {/* Empty State */}
        {!isLoading && tags.length === 0 && (
          <div className="flex items-center justify-center h-32 text-text-tertiary text-sm">
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
              className="grid grid-cols-[1fr_auto_auto_auto] gap-4 px-5 py-3.5 border-b border-glass-border/50 last:border-0 items-center hover:bg-black/[0.02] transition-colors"
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
                    className="w-full text-sm px-2.5 py-1.5 rounded-lg border border-accent/40 bg-white outline-none focus:border-accent transition-colors"
                  />
                ) : (
                  <span className="text-sm font-medium text-text-primary truncate block">
                    {tag.name}
                  </span>
                )}
              </div>

              {/* Skill Count */}
              <div className="text-right pr-4">
                <span className="text-xs text-text-secondary tabular-nums">
                  {tag.skill_count} skill{tag.skill_count !== 1 ? "s" : ""}
                </span>
              </div>

              {/* Rename Button */}
              <div className="w-20 flex justify-center">
                {editingTag === tag.name ? (
                  <button
                    onClick={handleCancelEdit}
                    className="text-xs px-2.5 py-1.5 rounded-lg text-text-secondary hover:bg-black/[0.05] transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                ) : (
                  <button
                    onClick={() => handleStartEdit(tag)}
                    disabled={renameMutation.isPending}
                    className="text-xs px-2.5 py-1.5 rounded-lg text-text-secondary hover:bg-accent/10 hover:text-accent transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
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
                  className={`text-xs px-2.5 py-1.5 rounded-lg border transition-colors cursor-pointer font-medium ${
                    confirmDelete === tag.name
                      ? "bg-danger text-white border-danger hover:bg-danger-hover"
                      : "border-glass-border text-text-secondary hover:border-danger hover:text-danger"
                  } disabled:opacity-40 disabled:cursor-not-allowed`}
                >
                  {confirmDelete === tag.name ? "Confirm" : "Delete"}
                </button>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Help Text */}
      <p className="text-xs text-text-tertiary mt-4 text-center">
        Tags are automatically created when added to skills. Deleting a tag removes it from all skills.
      </p>
    </div>
  );
}
