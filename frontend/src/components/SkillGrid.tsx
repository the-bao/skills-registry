import { AnimatePresence } from "framer-motion";
import type { Skill } from "../api/types";
import { SkillCard } from "./SkillCard";

interface SkillGridProps {
  skills: Skill[];
  onSelect: (skill: Skill) => void;
}

export function SkillGrid({ skills, onSelect }: SkillGridProps) {
  if (skills.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-text-tertiary text-sm">
        No skills found
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
      <AnimatePresence mode="popLayout">
        {skills.map((skill) => (
          <SkillCard
            key={skill.name}
            skill={skill}
            onClick={() => onSelect(skill)}
          />
        ))}
      </AnimatePresence>
    </div>
  );
}
