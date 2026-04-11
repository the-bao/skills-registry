import type {
  Agent,
  Skill,
  SkillListResponse,
  TagsResponse,
  TagDetailResponse,
  RenameTagRequest,
  ImportableSkill,
  ImportResponse,
  AddSkillRequest,
  AddTagRequest,
  ImportRequest,
  Combination,
  CombinationListResponse,
  CreateCombinationRequest,
  UpdateCombinationRequest,
  InstallCombinationResponse,
  InstallSkillResponse,
  GithubImportRequest,
  GithubImportResponse,
  SuggestTagsResponse,
  BatchAutoTagResponse,
} from "./types";

const BASE = "/api";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...init,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `HTTP ${res.status}`);
  }
  return res.json();
}

export const api = {
  listAgents: () => request<Agent[]>("/agents"),

  listSkills: (q?: string, tag?: string) => {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (tag) params.set("tag", tag);
    const qs = params.toString();
    return request<SkillListResponse>(`/skills${qs ? `?${qs}` : ""}`);
  },

  getSkill: (name: string) => request<Skill>(`/skills/${encodeURIComponent(name)}`),

  addSkill: (body: AddSkillRequest) =>
    request<Skill>("/skills", { method: "POST", body: JSON.stringify(body) }),

  deleteSkill: (name: string) =>
    request<{ deleted: string }>(`/skills/${encodeURIComponent(name)}`, { method: "DELETE" }),

  listTags: () => request<TagsResponse>("/tags"),

  // Tag management
  getTagsDetail: () => request<TagDetailResponse>("/tags/detail"),

  renameTag: (name: string, body: RenameTagRequest) =>
    request<{ renamed: string }>(`/tags/${encodeURIComponent(name)}`, {
      method: "PUT",
      body: JSON.stringify(body),
    }),

  deleteTag: (name: string) =>
    request<{ deleted: string }>(`/tags/${encodeURIComponent(name)}`, { method: "DELETE" }),

  addTag: (name: string, body: AddTagRequest) =>
    request<{ added: string }>(`/skills/${encodeURIComponent(name)}/tags`, {
      method: "POST",
      body: JSON.stringify(body),
    }),

  removeTag: (name: string, tag: string) =>
    request<{ removed: string }>(`/skills/${encodeURIComponent(name)}/tags/${encodeURIComponent(tag)}`, {
      method: "DELETE",
    }),

  installSkill: (name: string, agent: string) =>
    request<InstallSkillResponse>(`/skills/${encodeURIComponent(name)}/install`, {
      method: "POST",
      body: JSON.stringify({ agent }),
    }),

  listImportable: () => request<ImportableSkill[]>("/skills/importable"),

  importSkills: (body: ImportRequest) =>
    request<ImportResponse>("/skills/import", { method: "POST", body: JSON.stringify(body) }),

  importGithub: (body: GithubImportRequest) =>
    request<GithubImportResponse>("/skills/import-github", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  // Combinations
  listCombinations: () => request<CombinationListResponse>("/combinations"),

  getCombination: (name: string) =>
    request<Combination>(`/combinations/${encodeURIComponent(name)}`),

  createCombination: (body: CreateCombinationRequest) =>
    request<Combination>("/combinations", { method: "POST", body: JSON.stringify(body) }),

  updateCombination: (name: string, body: UpdateCombinationRequest) =>
    request<Combination>(`/combinations/${encodeURIComponent(name)}`, {
      method: "PUT",
      body: JSON.stringify(body),
    }),

  deleteCombination: (name: string) =>
    request<{ deleted: string }>(`/combinations/${encodeURIComponent(name)}`, { method: "DELETE" }),

  installCombination: (name: string, agent: string) =>
    request<InstallCombinationResponse>(`/combinations/${encodeURIComponent(name)}/install`, {
      method: "POST",
      body: JSON.stringify({ agent }),
    }),

  // Suggest Tags
  suggestTags: (name: string) =>
    request<SuggestTagsResponse>(`/skills/${encodeURIComponent(name)}/suggest-tags`, {
      method: "POST",
    }),

  autoTagAll: () =>
    request<BatchAutoTagResponse>("/skills/auto-tag", { method: "POST" }),
};
