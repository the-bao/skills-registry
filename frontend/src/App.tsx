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
    mutationFn: ({ name, targetDir }: { name: string; targetDir?: string }) =>
      api.installSkill(name, targetDir),
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
    <div className="flex min-h-screen" style={{ background: "var(--color-light-gray)" }}>
      <Sidebar
        tags={tags}
        selectedTag={selectedTag}
        onSelectTag={setSelectedTag}
        skillCount={skillsData?.total ?? 0}
        comboCount={combosData?.total ?? 0}
      />

      <main className="flex-1">
        {/* Hero Section - Black */}
        <section
          className="px-8 pt-10 pb-8"
          style={{ background: "var(--color-black)" }}
        >
          {/* Tab Switcher - Apple style */}
          <div className="max-w-5xl mx-auto mb-8">
            <div
              className="inline-flex rounded-full p-1 gap-1"
              style={{ background: "rgba(255,255,255,0.1)" }}
            >
              {(["skills", "combinations", "tags"] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-5 py-1.5 rounded-full text-sm font-medium transition-all cursor-pointer capitalize ${
                    activeTab === tab
                      ? "bg-white text-black"
                      : "text-white/70 hover:text-white"
                  }`}
                  style={{
                    letterSpacing: "-0.224px",
                    lineHeight: 1.43
                  }}
                >
                  {tab}
                </button>
              ))}
            </div>
          </div>

          {/* Header & Actions */}
          <div className="max-w-5xl mx-auto">
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <SearchBar value={search} onChange={setSearch} />
              </div>
              <button
                onClick={() => setShowImportModal(true)}
                className="shrink-0 text-sm px-5 py-2.5 rounded-full border border-white/20 text-white hover:bg-white/10 transition-colors cursor-pointer"
                style={{
                  letterSpacing: "-0.224px",
                  fontWeight: 400
                }}
              >
                Import
              </button>
              <button
                onClick={() => setShowGithubModal(true)}
                className="shrink-0 text-sm px-5 py-2.5 rounded-full border border-white/20 text-white hover:bg-white/10 transition-colors cursor-pointer"
                style={{
                  letterSpacing: "-0.224px",
                  fontWeight: 400
                }}
              >
                GitHub
              </button>
              <button
                onClick={() => setShowAddModal(true)}
                className="shrink-0 text-sm px-5 py-2.5 rounded-full bg-[var(--color-apple-blue)] text-white hover:bg-[var(--color-apple-blue-hover)] transition-colors cursor-pointer font-medium"
                style={{
                  letterSpacing: "-0.224px"
                }}
              >
                + Add Skill
              </button>
            </div>
          </div>
        </section>

        {/* Content Section - Light Gray */}
        <section
          className="px-8 py-8"
          style={{ background: "var(--color-light-gray)" }}
        >
          {activeTab === "skills" ? (
            <div className="max-w-5xl mx-auto">
              <SkillGrid skills={skills} onSelect={handleSelectSkill} />
            </div>
          ) : activeTab === "combinations" ? (
            <CombinationsPage allSkills={skills} />
          ) : (
            <TagManagementPage />
          )}
        </section>
      </main>

      {/* Modals */}
      <AnimatePresence>
        {selectedSkill && (
          <SkillDetail
            key={selectedSkill.name}
            skill={selectedSkill}
            allTags={tags}
            onClose={() => setSelectedSkill(null)}
            onDelete={(name) => deleteMutation.mutate(name)}
            onInstall={(name, targetDir) => installMutation.mutate({ name, targetDir })}
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
