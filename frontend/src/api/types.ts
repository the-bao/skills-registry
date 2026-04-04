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
