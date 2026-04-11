import { useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AnimatePresence } from "framer-motion";
import { api } from "../api/client";
import type { Agent, Combination, Skill } from "../api/types";
import { CombinationCard } from "./CombinationCard";
import { CombinationDetail } from "./CombinationDetail";
import { CreateCombinationModal } from "./CreateCombinationModal";

interface CombinationsPageProps {
  allSkills: Skill[];
  agents: Agent[];
}

export function CombinationsPage({ allSkills, agents }: CombinationsPageProps) {
  const queryClient = useQueryClient();
  const [selectedCombo, setSelectedCombo] = useState<Combination | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const { data: combosData } = useQuery({
    queryKey: ["combinations"],
    queryFn: api.listCombinations,
  });

  const createMutation = useMutation({
    mutationFn: api.createCombination,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["combinations"] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ name, data }: { name: string; data: Parameters<typeof api.updateCombination>[1] }) =>
      api.updateCombination(name, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["combinations"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: api.deleteCombination,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["combinations"] });
      setSelectedCombo(null);
    },
  });

  const installMutation = useMutation({
    mutationFn: ({ name, agent }: { name: string; agent: string }) =>
      api.installCombination(name, agent),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["skills"] });
    },
  });

  const handleSelectCombo = useCallback(async (combo: Combination) => {
    try {
      const fresh = await api.getCombination(combo.name);
      setSelectedCombo(fresh);
    } catch {
      setSelectedCombo(combo);
    }
  }, []);

  const combinations = combosData?.combinations ?? [];

  return (
    <div className="max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <div className="flex-1">
          <h2
            className="text-lg font-semibold text-[var(--color-text-primary)]"
            style={{ letterSpacing: "-0.28px", lineHeight: 1.1 }}
          >
            Combinations
          </h2>
          <p
            className="text-xs text-[var(--color-text-tertiary)] mt-1"
            style={{ letterSpacing: "-0.12px" }}
          >
            Group skills into installable suites
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="btn-primary-blue"
        >
          + New Combination
        </button>
      </div>

      {/* Grid */}
      {combinations.length === 0 ? (
        <div
          className="flex items-center justify-center h-48 text-sm"
          style={{ color: "var(--color-text-tertiary)" }}
        >
          No combinations yet. Create one to group skills.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          <AnimatePresence mode="popLayout">
            {combinations.map((combo) => (
              <CombinationCard
                key={combo.name}
                combination={combo}
                onClick={() => handleSelectCombo(combo)}
              />
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Modals */}
      <AnimatePresence>
        {selectedCombo && (
          <CombinationDetail
            key={selectedCombo.name}
            combination={selectedCombo}
            allSkills={allSkills}
            agents={agents}
            onClose={() => setSelectedCombo(null)}
            onDelete={(name) => deleteMutation.mutate(name)}
            onInstall={(name, agent) => installMutation.mutate({ name, agent })}
            onUpdate={(name, data) => updateMutation.mutate({ name, data })}
          />
        )}
      </AnimatePresence>

      {showCreateModal && (
        <CreateCombinationModal
          allSkills={allSkills}
          onClose={() => setShowCreateModal(false)}
          onSubmit={(data) => createMutation.mutate(data)}
        />
      )}
    </div>
  );
}
