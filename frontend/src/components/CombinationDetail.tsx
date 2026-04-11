import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
} from "@dnd-kit/core";
import type { DragEndEvent } from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  horizontalListSortingStrategy,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { Agent, Combination, ParallelGroup, Skill } from "../api/types";

interface CombinationDetailProps {
  combination: Combination;
  allSkills: Skill[];
  agents: Agent[];
  onClose: () => void;
  onDelete: (name: string) => void;
  onInstall: (name: string, agent: string) => void;
  onUpdate: (name: string, data: { description?: string; skills?: string[]; workflow?: { groups: ParallelGroup[] } }) => void;
}

// Draggable skill item
function DraggableSkill({
  skillName,
  groupIndex,
  skillIndex,
  onRemove,
  isDragOverlay = false,
}: {
  skillName: string;
  groupIndex: number;
  skillIndex: number;
  onRemove: (groupIndex: number, skillName: string) => void;
  isDragOverlay?: boolean;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: `skill-${groupIndex}-${skillIndex}` });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging && !isDragOverlay ? 0.3 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full tag-apple-blue ${isDragOverlay ? "shadow-lg" : ""}`}
    >
      <button
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing"
      >
        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
        </svg>
      </button>
      <span>{skillName}</span>
      {!isDragOverlay && (
        <button
          onClick={() => onRemove(groupIndex, skillName)}
          className="ml-1 hover:text-[var(--color-danger)] cursor-pointer"
        >
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}
    </div>
  );
}

// Draggable group item
function DraggableGroup({
  group,
  groupIndex,
  editSkills,
  onUpdateGroupName,
  onRemoveGroup,
  onAddSkillToGroup,
  onRemoveSkillFromGroup,
}: {
  group: ParallelGroup;
  groupIndex: number;
  editSkills: string[];
  onUpdateGroupName: (index: number, name: string) => void;
  onRemoveGroup: (index: number) => void;
  onAddSkillToGroup: (groupIndex: number, skillName: string) => void;
  onRemoveSkillFromGroup: (groupIndex: number, skillName: string) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: `group-${groupIndex}` });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const availableSkills = editSkills.filter((s) => !group.skills.includes(s));

  return (
    <div
      ref={setNodeRef}
      style={{ ...style, border: "1px solid rgba(0,0,0,0.08)", background: "rgba(0,0,0,0.02)" }}
      className="rounded-xl p-4"
    >
      {/* Group header with drag handle */}
      <div className="flex items-center gap-2 mb-3">
        <button
          {...attributes}
          {...listeners}
          className="p-1.5 rounded-lg transition-colors cursor-grab active:cursor-grabbing"
          style={{ background: "rgba(0,0,0,0.04)" }}
        >
          <svg className="w-4 h-4 text-[var(--color-text-tertiary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
          </svg>
        </button>
        <span
          className="w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-semibold shrink-0"
          style={{ background: "rgba(0,113,227,0.15)", color: "var(--color-apple-blue)" }}
        >
          {groupIndex + 1}
        </span>
        <input
          type="text"
          value={group.name ?? ""}
          onChange={(e) => onUpdateGroupName(groupIndex, e.target.value)}
          placeholder="Group name (optional)"
          className="flex-1 text-xs px-3 py-1.5 rounded-lg outline-none"
          style={{
            background: "rgba(0,0,0,0.04)",
            border: "1px solid rgba(0,0,0,0.06)",
            letterSpacing: "-0.374px"
          }}
        />
        <button
          onClick={() => onRemoveGroup(groupIndex)}
          className="p-1.5 rounded-lg transition-colors cursor-pointer hover:bg-[var(--color-danger)]/10"
          style={{ color: "var(--color-text-tertiary)" }}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Skills in group */}
      <SortableContext
        items={group.skills.map((_, i) => `skill-${groupIndex}-${i}`)}
        strategy={horizontalListSortingStrategy}
      >
        <div className="flex flex-wrap gap-2 mb-3">
          {group.skills.map((skillName, skillIndex) => (
            <DraggableSkill
              key={`skill-${groupIndex}-${skillIndex}`}
              skillName={skillName}
              groupIndex={groupIndex}
              skillIndex={skillIndex}
              onRemove={onRemoveSkillFromGroup}
            />
          ))}
        </div>
      </SortableContext>

      {/* Add skill dropdown */}
      <select
        value=""
        onChange={(e) => {
          if (e.target.value) onAddSkillToGroup(groupIndex, e.target.value);
          e.target.value = "";
        }}
        disabled={availableSkills.length === 0}
        className="w-full text-xs px-3 py-2 rounded-lg outline-none disabled:opacity-50 disabled:cursor-not-allowed"
        style={{
          background: "rgba(0,0,0,0.04)",
          border: "1px solid rgba(0,0,0,0.06)",
          letterSpacing: "-0.374px",
          color: "var(--color-text-secondary)"
        }}
      >
        <option value="">
          {availableSkills.length === 0 ? "All skills added" : "+ Add skill to group (parallel)..."}
        </option>
        {availableSkills.map((s) => (
          <option key={s} value={s}>{s}</option>
        ))}
      </select>
    </div>
  );
}

export function CombinationDetail({
  combination,
  allSkills,
  agents,
  onClose,
  onDelete,
  onInstall,
  onUpdate,
}: CombinationDetailProps) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [editing, setEditing] = useState(false);
  const [showAgentSelect, setShowAgentSelect] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState(agents[0]?.id ?? "");
  const [editSkills, setEditSkills] = useState(combination.skills);
  const [editDescription, setEditDescription] = useState(combination.description);
  const [editGroups, setEditGroups] = useState<ParallelGroup[]>(
    combination.workflow?.groups ?? []
  );
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDelete = () => {
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    onDelete(combination.name);
  };

  const handleSave = () => {
    const workflow = editGroups.length > 0 ? { groups: editGroups } : undefined;
    onUpdate(combination.name, {
      description: editDescription,
      skills: editSkills,
      workflow,
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

  // Group operations
  const addGroup = () => {
    setEditGroups((prev) => [...prev, { name: undefined, skills: [] }]);
  };

  const removeGroup = (groupIndex: number) => {
    setEditGroups((prev) => prev.filter((_, i) => i !== groupIndex));
  };

  const updateGroupName = (groupIndex: number, name: string) => {
    setEditGroups((prev) =>
      prev.map((g, i) => (i === groupIndex ? { ...g, name: name || undefined } : g))
    );
  };

  // Skill operations within groups
  const addSkillToGroup = (groupIndex: number, skillName: string) => {
    setEditGroups((prev) =>
      prev.map((g, i) =>
        i === groupIndex && !g.skills.includes(skillName)
          ? { ...g, skills: [...g.skills, skillName] }
          : g
      )
    );
  };

  const removeSkillFromGroup = (groupIndex: number, skillName: string) => {
    setEditGroups((prev) =>
      prev.map((g, i) =>
        i === groupIndex ? { ...g, skills: g.skills.filter((s) => s !== skillName) } : g
      )
    );
  };

  // Find what skill is being dragged for the overlay
  const getActiveSkill = () => {
    if (!activeId || !activeId.startsWith("skill-")) return null;
    const [, groupIdx, skillIdx] = activeId.split("-").map(Number);
    if (isNaN(groupIdx) || isNaN(skillIdx)) return null;
    if (groupIdx < 0 || groupIdx >= editGroups.length) return null;
    if (skillIdx < 0 || skillIdx >= editGroups[groupIdx].skills.length) return null;
    return {
      skillName: editGroups[groupIdx].skills[skillIdx],
      groupIndex: groupIdx,
      skillIndex: skillIdx,
    };
  };

  // Drag and drop handler
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over || active.id === over.id) return;

    const activeIdStr = String(active.id);
    const overIdStr = String(over.id);

    // Group reordering
    if (activeIdStr.startsWith("group-") && overIdStr.startsWith("group-")) {
      const oldIndex = parseInt(activeIdStr.replace("group-", ""));
      const newIndex = parseInt(overIdStr.replace("group-", ""));
      if (!isNaN(oldIndex) && !isNaN(newIndex)) {
        setEditGroups((prev) => arrayMove(prev, oldIndex, newIndex));
      }
      return;
    }

    // Skill reordering within a group
    if (activeIdStr.startsWith("skill-") && overIdStr.startsWith("skill-")) {
      const [, oldGroupIdx, oldSkillIdx] = activeIdStr.split("-").map(Number);
      const [, newGroupIdx, newSkillIdx] = overIdStr.split("-").map(Number);

      if (
        !isNaN(oldGroupIdx) && !isNaN(oldSkillIdx) &&
        !isNaN(newGroupIdx) && !isNaN(newSkillIdx) &&
        oldGroupIdx === newGroupIdx
      ) {
        setEditGroups((prev) =>
          prev.map((g, gi) =>
            gi === oldGroupIdx ? { ...g, skills: arrayMove(g.skills, oldSkillIdx, newSkillIdx) } : g
          )
        );
      }
    }
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
            className="px-6 pt-6 pb-5 flex items-start justify-between"
            style={{ background: "var(--color-light-gray)" }}
          >
            <div>
              <h2
                className="text-xl font-semibold text-[var(--color-text-primary)]"
                style={{ letterSpacing: "-0.28px", lineHeight: 1.1 }}
              >
                {combination.name}
              </h2>
              <p
                className="text-xs text-[var(--color-text-tertiary)] mt-1"
                style={{ letterSpacing: "-0.12px" }}
              >
                {combination.skills.length} skills
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setEditing(!editing)}
                className="text-xs px-4 py-2 rounded-full border transition-colors cursor-pointer"
                style={{
                  borderColor: "rgba(0,0,0,0.12)",
                  color: "var(--color-text-secondary)",
                  letterSpacing: "-0.224px"
                }}
              >
                {editing ? "Cancel" : "Edit"}
              </button>
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
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6">
            {editing ? (
              <div className="space-y-6">
                {/* Description */}
                <div>
                  <p
                    className="text-xs font-medium text-[var(--color-text-tertiary)] uppercase tracking-wider mb-2"
                    style={{ letterSpacing: "0.1em" }}
                  >
                    Description
                  </p>
                  <textarea
                    value={editDescription}
                    onChange={(e) => setEditDescription(e.target.value)}
                    className="w-full text-sm px-3 py-2 rounded-lg outline-none resize-none"
                    style={{
                      background: "rgba(0,0,0,0.04)",
                      border: "1px solid rgba(0,0,0,0.06)",
                      letterSpacing: "-0.374px"
                    }}
                    rows={2}
                  />
                </div>

                {/* Skills Selection */}
                <div>
                  <p
                    className="text-xs font-medium text-[var(--color-text-tertiary)] uppercase tracking-wider mb-2"
                    style={{ letterSpacing: "0.1em" }}
                  >
                    Skills ({editSkills.length} selected)
                  </p>
                  <div
                    className="flex flex-col gap-1 max-h-32 overflow-y-auto rounded-lg p-1"
                    style={{ background: "rgba(0,0,0,0.02)" }}
                  >
                    {allSkills.map((skill) => {
                      const isSelected = editSkills.includes(skill.name);
                      return (
                        <button
                          key={skill.name}
                          onClick={() => toggleSkill(skill.name)}
                          className={`flex items-center gap-3 text-left px-3 py-2 rounded-lg text-sm transition-colors cursor-pointer ${
                            isSelected
                              ? "tag-apple-blue"
                              : "hover:bg-black/[0.02]"
                          }`}
                        >
                          <span
                            className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-colors ${
                              isSelected ? "bg-[var(--color-apple-blue)] border-[var(--color-apple-blue)]" : "border-[rgba(0,0,0,0.15)]"
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

                {/* Workflow Orchestration */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <p
                      className="text-xs font-medium text-[var(--color-text-tertiary)] uppercase tracking-wider"
                      style={{ letterSpacing: "0.1em" }}
                    >
                      Workflow ({editGroups.length} groups)
                    </p>
                    <button
                      onClick={addGroup}
                      className="btn-pill-link text-xs py-1"
                    >
                      + Add Group
                    </button>
                  </div>

                  {editGroups.length === 0 ? (
                    <p
                      className="text-sm text-center py-6"
                      style={{ color: "var(--color-text-tertiary)" }}
                    >
                      No workflow defined. Add groups to orchestrate skill execution order.
                    </p>
                  ) : (
                    <DndContext
                      sensors={sensors}
                      collisionDetection={closestCenter}
                      onDragStart={({ active }) => setActiveId(String(active.id))}
                      onDragEnd={handleDragEnd}
                    >
                      <SortableContext
                        items={editGroups.map((_, i) => `group-${i}`)}
                        strategy={verticalListSortingStrategy}
                      >
                        <div className="space-y-3">
                          {editGroups.map((group, groupIndex) => (
                            <DraggableGroup
                              key={`group-${groupIndex}`}
                              group={group}
                              groupIndex={groupIndex}
                              editSkills={editSkills}
                              onUpdateGroupName={updateGroupName}
                              onRemoveGroup={removeGroup}
                              onAddSkillToGroup={addSkillToGroup}
                              onRemoveSkillFromGroup={removeSkillFromGroup}
                            />
                          ))}
                        </div>
                      </SortableContext>

                      <DragOverlay>
                        {activeId?.startsWith("skill-") && getActiveSkill() && (
                          <DraggableSkill
                            skillName={getActiveSkill()!.skillName}
                            groupIndex={getActiveSkill()!.groupIndex}
                            skillIndex={getActiveSkill()!.skillIndex}
                            onRemove={() => {}}
                            isDragOverlay
                          />
                        )}
                      </DragOverlay>
                    </DndContext>
                  )}
                </div>
              </div>
            ) : (
              <div>
                <p
                  className="text-sm text-[var(--color-text-secondary)] mb-5"
                  style={{ letterSpacing: "-0.374px", lineHeight: 1.47 }}
                >
                  {combination.description}
                </p>

                {/* Included Skills */}
                <div className="mb-5">
                  <p
                    className="text-xs font-medium text-[var(--color-text-tertiary)] uppercase tracking-wider mb-2"
                    style={{ letterSpacing: "0.1em" }}
                  >
                    Included Skills
                  </p>
                  <div className="flex flex-col gap-1">
                    {combination.skills.map((skillName) => {
                      const exists = allSkills.some((s) => s.name === skillName);
                      return (
                        <div
                          key={skillName}
                          className="flex items-center gap-2 text-sm px-3 py-2.5 rounded-lg"
                          style={{ background: "var(--color-light-gray)" }}
                        >
                          <span
                            className="w-2 h-2 rounded-full shrink-0"
                            style={{ background: exists ? "#34c759" : "#8e8e93" }}
                          />
                          <span
                            className={exists ? "text-[var(--color-text-primary)]" : "text-[var(--color-text-tertiary)] line-through"}
                            style={{ letterSpacing: "-0.224px" }}
                          >
                            {skillName}
                          </span>
                          {!exists && (
                            <span
                              className="text-[10px] ml-auto"
                              style={{ color: "var(--color-text-tertiary)" }}
                            >
                              missing
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {missingSkills.length > 0 && (
                  <p
                    className="text-xs mb-5"
                    style={{ color: "var(--color-danger)" }}
                  >
                    {missingSkills.length} skill(s) no longer exist and will be skipped during install
                  </p>
                )}

                {/* Workflow Display */}
                {combination.workflow && combination.workflow.groups.length > 0 && (
                  <div>
                    <p
                      className="text-xs font-medium text-[var(--color-text-tertiary)] uppercase tracking-wider mb-3"
                      style={{ letterSpacing: "0.1em" }}
                    >
                      Workflow
                    </p>
                    <div className="space-y-3">
                      {combination.workflow.groups.map((group, groupIndex) => (
                        <div key={groupIndex} className="flex items-start gap-3">
                          {/* Sequential indicator */}
                          <div className="flex flex-col items-center shrink-0 mt-1">
                            <span
                              className="w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-semibold text-white"
                              style={{ background: "var(--color-apple-blue)" }}
                            >
                              {groupIndex + 1}
                            </span>
                            {groupIndex < combination.workflow!.groups.length - 1 && (
                              <div
                                className="w-0.5 h-4 mt-1"
                                style={{ background: "rgba(0,113,227,0.2)" }}
                              />
                            )}
                          </div>
                          <div
                            className="flex-1 rounded-xl p-4"
                            style={{
                              border: "1px solid rgba(0,0,0,0.08)",
                              background: "rgba(0,0,0,0.02)"
                            }}
                          >
                            {group.name && (
                              <p
                                className="text-xs font-medium mb-2"
                                style={{ color: "var(--color-apple-blue)", letterSpacing: "-0.224px" }}
                              >
                                {group.name}
                              </p>
                            )}
                            <div className="flex flex-wrap gap-2">
                              {group.skills.map((skillName, skillIndex) => (
                                <span
                                  key={skillName}
                                  className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full tag-apple-blue"
                                >
                                  {skillName}
                                  {skillIndex < group.skills.length - 1 && (
                                    <span style={{ color: "var(--color-apple-blue)", opacity: 0.4 }}>||</span>
                                  )}
                                </span>
                              ))}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Actions */}
          <div
            className="flex gap-3 p-6"
            style={{ borderTop: "1px solid rgba(0,0,0,0.08)" }}
          >
            {editing ? (
              <button
                onClick={handleSave}
                className="btn-primary-blue flex-1"
              >
                Save Changes
              </button>
            ) : (
              <>
                {showAgentSelect ? (
                  <div className="flex-1 space-y-3">
                    <div className="space-y-2">
                      {agents.map((agent) => (
                        <label
                          key={agent.id}
                          className="flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer transition-colors text-sm"
                          style={{
                            background: selectedAgent === agent.id ? "rgba(0,113,227,0.08)" : "rgba(0,0,0,0.02)",
                            border: selectedAgent === agent.id ? "1px solid var(--color-apple-blue)" : "1px solid rgba(0,0,0,0.06)",
                          }}
                        >
                          <input
                            type="radio"
                            name="combo-agent"
                            value={agent.id}
                            checked={selectedAgent === agent.id}
                            onChange={() => setSelectedAgent(agent.id)}
                            className="accent-[var(--color-apple-blue)]"
                          />
                          <span>{agent.name}</span>
                        </label>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setShowAgentSelect(false)}
                        className="flex-1 text-sm px-4 py-2.5 rounded-full border transition-colors cursor-pointer"
                        style={{ borderColor: "rgba(0,0,0,0.12)", color: "var(--color-text-secondary)", letterSpacing: "-0.224px" }}
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => {
                          if (!selectedAgent) return;
                          onInstall(combination.name, selectedAgent);
                          setShowAgentSelect(false);
                        }}
                        disabled={!selectedAgent}
                        className="flex-1 btn-primary-blue disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        Install All ({combination.skills.length})
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <button
                      onClick={() => setShowAgentSelect(true)}
                      className="btn-primary-blue flex-1"
                    >
                      Install All ({combination.skills.length})
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
                  </>
                )}
              </>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
