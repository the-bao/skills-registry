import type {
  Skill,
  SkillListResponse,
  TagsResponse,
  ImportableSkill,
  ImportResponse,
  AddSkillRequest,
  AddTagRequest,
  ImportRequest,
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

  addTag: (name: string, body: AddTagRequest) =>
    request<{ added: string }>(`/skills/${encodeURIComponent(name)}/tags`, {
      method: "POST",
      body: JSON.stringify(body),
    }),

  removeTag: (name: string, tag: string) =>
    request<{ removed: string }>(`/skills/${encodeURIComponent(name)}/tags/${encodeURIComponent(tag)}`, {
      method: "DELETE",
    }),

  installSkill: (name: string) =>
    request<{ installed: string }>(`/skills/${encodeURIComponent(name)}/install`, { method: "POST" }),

  listImportable: () => request<ImportableSkill[]>("/skills/importable"),

  importSkills: (body: ImportRequest) =>
    request<ImportResponse>("/skills/import", { method: "POST", body: JSON.stringify(body) }),
};
