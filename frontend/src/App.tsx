import { useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AnimatePresence } from "framer-motion";
import { api } from "./api/client";
import type { Skill } from "./api/types";
import { SearchBar } from "./components/SearchBar";
import { Sidebar } from "./components/Sidebar";
import { SkillGrid } from "./components/SkillGrid";
import { SkillDetail } from "./components/SkillDetail";
import { AddSkillModal } from "./components/AddSkillModal";
import { ImportModal } from "./components/ImportModal";
import { GithubImportModal } from "./components/GithubImportModal";
import { CombinationsPage } from "./components/CombinationsPage";
import { SuggestTagsModal } from "./components/SuggestTagsModal";
import { TagManagementPage } from "./components/TagManagementPage";

function App() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [selectedSkill, setSelectedSkill] = useState<Skill | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showGithubModal, setShowGithubModal] = useState(false);
  const [activeTab, setActiveTab] = useState<"skills" | "combinations" | "tags">("skills");
  const [suggestModal, setSuggestModal] = useState<{
    open: boolean;
    skillName: string;
    suggested: string[];
    existingTags: string[];
    isAdding: boolean;
  } | null>(null);

  const { data: skillsData } = useQuery({
    queryKey: ["skills", search, selectedTag],
    queryFn: () => api.listSkills(search || undefined, selectedTag || undefined),
  });

  const { data: tagsData } = useQuery({
    queryKey: ["tags"],
    queryFn: api.listTags,
  });

  const { data: importableData } = useQuery({
    queryKey: ["importable"],
    queryFn: api.listImportable,
    enabled: showImportModal,
  });

  const { data: combosData } = useQuery({
    queryKey: ["combinations"],
    queryFn: api.listCombinations,
  });

  const deleteMutation = useMutation({
    mutationFn: api.deleteSkill,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["skills"] });
      queryClient.invalidateQueries({ queryKey: ["tags"] });
      setSelectedSkill(null);
    },
  });

  const installMutation = useMutation({
    mutationFn: api.installSkill,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["skills"] });
    },
  });

  const addSkillMutation = useMutation({
    mutationFn: api.addSkill,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["skills"] });
    },
  });

  const importMutation = useMutation({
    mutationFn: api.importSkills,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["skills"] });
      queryClient.invalidateQueries({ queryKey: ["tags"] });
    },
  });

  const githubImportMutation = useMutation({
    mutationFn: api.importGithub,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["skills"] });
      queryClient.invalidateQueries({ queryKey: ["tags"] });
    },
  });

  const suggestTagsMutation = useMutation({
    mutationFn: api.suggestTags,
  });

  const addTagMutation = useMutation({
    mutationFn: ({ name, tag }: { name: string; tag: string }) =>
      api.addTag(name, { tag }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["skills"] });
      queryClient.invalidateQueries({ queryKey: ["tags"] });
    },
  });

  const removeTagMutation = useMutation({
    mutationFn: ({ name, tag }: { name: string; tag: string }) =>
      api.removeTag(name, tag),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["skills"] });
      queryClient.invalidateQueries({ queryKey: ["tags"] });
    },
  });

  const handleConfirmTags = async (tags: string[]) => {
    if (!suggestModal) return;
    setSuggestModal((prev) => (prev ? { ...prev, isAdding: true } : null));

    for (const tag of tags) {
      await addTagMutation.mutateAsync({ name: suggestModal.skillName, tag });
    }

    queryClient.invalidateQueries({ queryKey: ["skills"] });
    queryClient.invalidateQueries({ queryKey: ["tags"] });
    setSuggestModal(null);
  };

  const handleTagsSuggested = (suggested: string[], skillName: string, existingTags: string[]) => {
    setSuggestModal({
      open: true,
      skillName,
      suggested,
      existingTags,
      isAdding: false,
    });
  };

  const handleSelectSkill = useCallback(async (skill: Skill) => {
    try {
      const fresh = await api.getSkill(skill.name);
      setSelectedSkill(fresh);
    } catch {
      setSelectedSkill(skill);
    }
  }, []);

  const skills = skillsData?.skills ?? [];
  const tags = tagsData?.tags ?? [];
  const importable = importableData ?? [];

  return (
    <div className="flex min-h-screen">
      <Sidebar
        tags={tags}
        selectedTag={selectedTag}
        onSelectTag={setSelectedTag}
        skillCount={skillsData?.total ?? 0}
        comboCount={combosData?.total ?? 0}
      />

      <main className="flex-1 p-6">
        {/* Tab Switcher */}
        <div className="max-w-5xl mx-auto mb-4">
          <div className="inline-flex rounded-xl bg-white border border-glass-border p-1 gap-0.5">
            <button
              onClick={() => setActiveTab("skills")}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all cursor-pointer ${
                activeTab === "skills"
                  ? "bg-accent text-white"
                  : "text-text-secondary hover:bg-black/[0.03]"
              }`}
            >
              Skills
            </button>
            <button
              onClick={() => setActiveTab("combinations")}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all cursor-pointer ${
                activeTab === "combinations"
                  ? "bg-accent text-white"
                  : "text-text-secondary hover:bg-black/[0.03]"
              }`}
            >
              Combinations
            </button>
            <button
              onClick={() => setActiveTab("tags")}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all cursor-pointer ${
                activeTab === "tags"
                  ? "bg-accent text-white"
                  : "text-text-secondary hover:bg-black/[0.03]"
              }`}
            >
              Tags
            </button>
          </div>
        </div>

        {activeTab === "skills" ? (
          <div className="max-w-5xl mx-auto">
            {/* Header */}
            <div className="flex items-center gap-3 mb-6">
              <div className="flex-1">
                <SearchBar value={search} onChange={setSearch} />
              </div>
              <button
                onClick={() => setShowImportModal(true)}
                className="shrink-0 text-sm px-4 py-2.5 rounded-xl border border-glass-border text-text-secondary hover:bg-black/[0.03] transition-colors cursor-pointer"
              >
                Import
              </button>
              <button
                onClick={() => setShowGithubModal(true)}
                className="shrink-0 text-sm px-4 py-2.5 rounded-xl border border-glass-border text-text-secondary hover:bg-black/[0.03] transition-colors cursor-pointer"
              >
                GitHub
              </button>
              <button
                onClick={() => setShowAddModal(true)}
                className="shrink-0 text-sm px-4 py-2.5 rounded-xl bg-accent text-white hover:bg-accent-hover transition-colors cursor-pointer font-medium"
              >
                + Add Skill
              </button>
            </div>

            {/* Grid */}
            <SkillGrid skills={skills} onSelect={handleSelectSkill} />
          </div>
        ) : activeTab === "combinations" ? (
          <CombinationsPage allSkills={skills} />
        ) : (
          <TagManagementPage />
        )}
      </main>

      {/* Modals */}
      <AnimatePresence>
        {selectedSkill && (
          <SkillDetail
            key={selectedSkill.name}
            skill={selectedSkill}
            onClose={() => setSelectedSkill(null)}
            onDelete={(name) => deleteMutation.mutate(name)}
            onInstall={(name) => installMutation.mutate(name)}
            onAddTag={(name, tag) => addTagMutation.mutate({ name, tag })}
            onRemoveTag={(name, tag) => removeTagMutation.mutate({ name, tag })}
            onSuggestTags={(name) => suggestTagsMutation.mutateAsync(name).then((res) => res.suggested)}
            onTagsSuggested={(suggested) =>
              handleTagsSuggested(suggested, selectedSkill.name, selectedSkill.tags)
            }
          />
        )}
      </AnimatePresence>

      {showAddModal && (
        <AddSkillModal
          onClose={() => setShowAddModal(false)}
          onSubmit={(path) => addSkillMutation.mutate({ source_path: path })}
        />
      )}

      {showImportModal && (
        <ImportModal
          skills={importable}
          onClose={() => setShowImportModal(false)}
          onImport={(names) => importMutation.mutate({ names })}
        />
      )}

      {showGithubModal && (
        <GithubImportModal
          onClose={() => setShowGithubModal(false)}
          onSubmit={(repo) => githubImportMutation.mutateAsync({ repo })}
        />
      )}

      {suggestModal?.open && (
        <SuggestTagsModal
          skillName={suggestModal.skillName}
          suggested={suggestModal.suggested}
          existingTags={suggestModal.existingTags}
          onConfirm={handleConfirmTags}
          onClose={() => setSuggestModal(null)}
          isLoading={suggestModal.isAdding}
        />
      )}
    </div>
  );
}

export default App;
