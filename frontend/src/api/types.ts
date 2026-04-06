export interface Skill {
  name: string;
  description: string;
  version?: string;
  user_invocable?: boolean;
  tags: string[];
  path: string;
}

export interface SkillListResponse {
  skills: Skill[];
  total: number;
}

export interface TagsResponse {
  tags: string[];
}

export interface TagDetail {
  name: string;
  skill_count: number;
}

export interface TagDetailResponse {
  tags: TagDetail[];
}

export interface RenameTagRequest {
  new_name: string;
}

export interface ImportableSkill {
  name: string;
  path: string;
}

export interface ImportResponse {
  imported: string[];
  failed: string[];
}

export interface AddSkillRequest {
  source_path: string;
}

export interface AddTagRequest {
  tag: string;
}

export interface ImportRequest {
  names: string[];
}

export interface ParallelGroup {
  name?: string;
  skills: string[];
}

export interface Workflow {
  groups: ParallelGroup[];
}

export interface Combination {
  name: string;
  description: string;
  skills: string[];
  workflow?: Workflow;
}

export interface CombinationListResponse {
  combinations: Combination[];
  total: number;
}

export interface CreateCombinationRequest {
  name: string;
  description: string;
  skills: string[];
  workflow?: Workflow;
}

export interface UpdateCombinationRequest {
  name?: string;
  description?: string;
  skills?: string[];
  workflow?: Workflow;
}

export interface InstallCombinationResponse {
  installed: string[];
  failed: string[];
}

export interface GithubImportRequest {
  repo: string;
}

export interface GithubImportResponse {
  imported: string[];
  failed: string[];
  skipped: string[];
}

export interface SuggestTagsResponse {
  suggested: string[];
}

export interface BatchAutoTagResponse {
  results: SkillAutoTagResult[];
  total_skills: number;
  tagged_skills: number;
}

export interface SkillAutoTagResult {
  name: string;
  tags_added: string[];
}

export interface InstallSkillRequest {
  target_dir?: string;
}

export interface InstallSkillResponse {
  installed: string;
  path: string;
}
