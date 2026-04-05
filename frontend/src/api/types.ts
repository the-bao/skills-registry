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

export interface Combination {
  name: string;
  description: string;
  skills: string[];
}

export interface CombinationListResponse {
  combinations: Combination[];
  total: number;
}

export interface CreateCombinationRequest {
  name: string;
  description: string;
  skills: string[];
}

export interface UpdateCombinationRequest {
  name?: string;
  description?: string;
  skills?: string[];
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

export interface AutoTagResponse {
  tags_added: string[];
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
