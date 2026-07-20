"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  Button,
  Card,
  Label,
  PageHeader,
  PageLoader,
  SectionTitle,
  UploadZone,
  inputClass,
  selectClass,
} from "@/components/ui";
import { ProfileJumpNav } from "@/components/ProfileJumpNav";
import { ProfileImportSummary } from "@/components/ProfileImportSummary";
import { ProfileProgress } from "@/components/ProfileProgress";
import { ProfileSection, PROFILE_SECTION_SCROLL, PROFILE_SECTION_HIGHLIGHT } from "@/components/ProfileSection";
import { apiFetch } from "@/lib/auth-client";
import { readApiJson } from "@/lib/read-api-json";
import { uploadAndParseResume } from "@/lib/profile-upload-client";
import { getProjectLinks, withProjectLinks } from "@/lib/project-links";
import {
  DISABILITY_OPTIONS,
  GENDER_OPTIONS,
  HEAR_ABOUT_OPTIONS,
  RACE_ETHNICITY_OPTIONS,
  VETERAN_OPTIONS,
  YES_NO_OPTIONS,
} from "@/lib/application-defaults";
import { US_STATES } from "@/lib/us-states";
import type {
  Certification,
  Education,
  Project,
  TargetRole,
  WorkExperience,
} from "@/lib/types";

interface ProfileForm {
  fullName: string;
  email: string;
  phone: string;
  location: string;
  linkedin: string;
  github: string;
  website: string;
  summary: string;
  baseResume: string;
  skills: string[];
  workExperience: WorkExperience[];
  education: Education[];
  certifications: Certification[];
  projects: Project[];
  targetRoles: TargetRole[];
  visaStatus: string;
  needsSponsorship: boolean;
  gender: string;
  raceEthnicity: string;
  veteranStatus: string;
  disabilityStatus: string;
  hearAboutSource: string;
  usState: string;
  authorizedToWork: string;
  sponsorshipDetails: string;
}

interface ImportSummary {
  workExperience: number;
  education: number;
  projects: number;
  certifications: number;
  skills: number;
}

const EMPTY: ProfileForm = {
  fullName: "",
  email: "",
  phone: "",
  location: "",
  linkedin: "",
  github: "",
  website: "",
  summary: "",
  baseResume: "",
  skills: [],
  workExperience: [],
  education: [],
  certifications: [],
  projects: [],
  targetRoles: [],
  visaStatus: "",
  needsSponsorship: false,
  gender: "",
  raceEthnicity: "",
  veteranStatus: "",
  disabilityStatus: "",
  hearAboutSource: "",
  usState: "",
  authorizedToWork: "",
  sponsorshipDetails: "",
};

function highlightsText(highlights: string[]) {
  return highlights.join("\n");
}

function parseHighlights(text: string) {
  return text
    .split("\n")
    .map((s) => s.replace(/^[-•]\s*/, "").trim())
    .filter(Boolean);
}

function emptyWork(): WorkExperience {
  return {
    company: "",
    title: "",
    location: "",
    startDate: "",
    endDate: "",
    current: false,
    highlights: [],
  };
}

function emptyEducation(): Education {
  return {
    school: "",
    degree: "",
    field: "",
    location: "",
    startDate: "",
    endDate: "",
    gpa: "",
    honors: "",
  };
}

function emptyCert(): Certification {
  return { name: "", issuer: "", date: "", url: "" };
}

function emptyProject(): Project {
  return {
    name: "",
    role: "",
    description: "",
    links: [],
    link: "",
    tech: [],
    startDate: "",
    endDate: "",
  };
}

function ItemCard({
  children,
  onRemove,
}: {
  children: ReactNode;
  onRemove: () => void;
}) {
  return (
    <div className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-sm">
      {children}
      <div className="mt-4 flex justify-end border-t border-slate-100 pt-3">
        <Button variant="ghost" className="text-red-600" onClick={onRemove}>
          Remove
        </Button>
      </div>
    </div>
  );
}

export default function ProfilePage() {
  const [form, setForm] = useState<ProfileForm>(EMPTY);
  const [skillsText, setSkillsText] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [showStickySave, setShowStickySave] = useState(false);
  const [expandSectionId, setExpandSectionId] = useState<string | null>(null);
  const headerSaveRef = useRef<HTMLDivElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadMsg, setUploadMsg] = useState<string | null>(null);
  const [importSummary, setImportSummary] = useState<ImportSummary | null>(
    null,
  );
  const [extractedChars, setExtractedChars] = useState<number | null>(null);
  const [outlining, setOutlining] = useState(false);
  const [uploadExpanded, setUploadExpanded] = useState(false);

  function hydrate(data: Partial<ProfileForm>) {
    setForm({ ...EMPTY, ...data });
    setSkillsText((data.skills ?? []).join(", "));
  }

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("parse") !== "partial") return;
    const msg = params.get("msg");
    if (msg) {
      setUploadMsg(decodeURIComponent(msg));
      setUploadExpanded(true);
    }
  }, []);

  useEffect(() => {
    apiFetch("/api/profile")
      .then((r) => r.json())
      .then((data: ProfileForm) => hydrate(data))
      .finally(() => setLoading(false));
  }, []);

  function set<K extends keyof ProfileForm>(key: K, value: ProfileForm[K]) {
    setForm((f) => ({ ...f, [key]: value }));
    setSaved(false);
  }

  function updateRole(i: number, patch: Partial<TargetRole>) {
    setForm((f) => ({
      ...f,
      targetRoles: f.targetRoles.map((r, idx) =>
        idx === i ? { ...r, ...patch } : r,
      ),
    }));
    setSaved(false);
  }

  function addRole() {
    set("targetRoles", [
      ...form.targetRoles,
      { title: "", locations: ["United States"], remote: true, keywords: [] },
    ]);
  }

  function removeRole(i: number) {
    set(
      "targetRoles",
      form.targetRoles.filter((_, idx) => idx !== i),
    );
  }

  function updateWork(i: number, patch: Partial<WorkExperience>) {
    setForm((f) => ({
      ...f,
      workExperience: f.workExperience.map((w, idx) =>
        idx === i ? { ...w, ...patch } : w,
      ),
    }));
    setSaved(false);
  }

  function addWork() {
    set("workExperience", [emptyWork(), ...form.workExperience]);
  }

  function removeWork(i: number) {
    set(
      "workExperience",
      form.workExperience.filter((_, idx) => idx !== i),
    );
  }

  function updateEducation(i: number, patch: Partial<Education>) {
    setForm((f) => ({
      ...f,
      education: f.education.map((e, idx) =>
        idx === i ? { ...e, ...patch } : e,
      ),
    }));
    setSaved(false);
  }

  function addEducation() {
    set("education", [emptyEducation(), ...form.education]);
  }

  function removeEducation(i: number) {
    set(
      "education",
      form.education.filter((_, idx) => idx !== i),
    );
  }

  function updateCert(i: number, patch: Partial<Certification>) {
    setForm((f) => ({
      ...f,
      certifications: f.certifications.map((c, idx) =>
        idx === i ? { ...c, ...patch } : c,
      ),
    }));
    setSaved(false);
  }

  function addCert() {
    set("certifications", [emptyCert(), ...form.certifications]);
  }

  function removeCert(i: number) {
    set(
      "certifications",
      form.certifications.filter((_, idx) => idx !== i),
    );
  }

  function updateProject(i: number, patch: Partial<Project>) {
    setForm((f) => ({
      ...f,
      projects: f.projects.map((p, idx) =>
        idx === i ? { ...p, ...patch } : p,
      ),
    }));
    setSaved(false);
  }

  function setProjectLinks(i: number, links: string[]) {
    setForm((f) => ({
      ...f,
      projects: f.projects.map((p, idx) =>
        idx === i ? withProjectLinks(p, links) : p,
      ),
    }));
    setSaved(false);
  }

  function projectLinkRows(p: Project): string[] {
    if (p.links && p.links.length > 0) return p.links;
    const filled = getProjectLinks(p);
    return filled.length > 0 ? filled : [""];
  }

  function addProjectLink(i: number) {
    setProjectLinks(i, [...projectLinkRows(form.projects[i]!), ""]);
  }

  function updateProjectLink(i: number, linkIdx: number, value: string) {
    const next = [...projectLinkRows(form.projects[i]!)];
    while (next.length <= linkIdx) next.push("");
    next[linkIdx] = value;
    setProjectLinks(i, next);
  }

  function removeProjectLink(i: number, linkIdx: number) {
    const next = projectLinkRows(form.projects[i]!).filter(
      (_, idx) => idx !== linkIdx,
    );
    setProjectLinks(i, next.length ? next : [""]);
  }

  function addProject() {
    set("projects", [emptyProject(), ...form.projects]);
  }

  function removeProject(i: number) {
    set(
      "projects",
      form.projects.filter((_, idx) => idx !== i),
    );
  }

  async function save() {
    setSaving(true);
    setSaved(false);
    const payload = {
      ...form,
      projects: form.projects.map((p) =>
        withProjectLinks(
          p,
          (p.links ?? getProjectLinks(p)).filter((u) => u.trim()),
        ),
      ),
      skills: skillsText
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
    };
    const res = await apiFetch("/api/profile", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    setSaving(false);
    if (res.ok) setSaved(true);
  }

  async function uploadResume(file: File) {
    setUploading(true);
    setUploadMsg(null);
    setImportSummary(null);
    setExtractedChars(null);
    try {
      const result = await uploadAndParseResume(file);
      hydrate(result.profile as Partial<ProfileForm>);
      setImportSummary(result.imported ?? null);
      setExtractedChars(result.extractedChars ?? null);
      if (result.parseFailed) {
        setUploadMsg(result.parseError ?? "Resume saved; parsing timed out.");
      } else {
        setUploadMsg(null);
        setUploadExpanded(false);
      }
      setSaved(false);
    } catch (e) {
      setUploadMsg((e as Error).message);
      setImportSummary(null);
      setExtractedChars(null);
    } finally {
      setUploading(false);
    }
  }

  async function generateOutline() {
    setOutlining(true);
    try {
      await save();
      const res = await apiFetch("/api/profile/outline", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Generation failed");
      set("baseResume", data.outline);
    } catch (e) {
      setUploadMsg((e as Error).message);
    } finally {
      setOutlining(false);
    }
  }

  const completion = useMemo(
    () => ({
      contact: Boolean(form.fullName.trim() && form.email.trim()),
      experience: form.workExperience.some(
        (w) => w.company.trim() && w.title.trim(),
      ),
      education: form.education.some((e) => e.school.trim() && e.degree.trim()),
      projects: form.projects.some((p) => p.name.trim()),
      skills: skillsText.trim().length > 0,
      summary: form.summary.trim().length > 0,
      resume: form.baseResume.trim().length > 50,
    }),
    [form, skillsText],
  );

  const hasProfileData =
    completion.experience ||
    completion.education ||
    completion.skills ||
    completion.resume ||
    form.projects.length > 0;

  const navCounts = useMemo(
    () => ({
      experience: form.workExperience.length,
      education: form.education.length,
      projects: form.projects.length,
      certifications: form.certifications.length,
      roles: form.targetRoles.length,
      skills: skillsText
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean).length,
    }),
    [
      form.workExperience.length,
      form.education.length,
      form.projects.length,
      form.certifications.length,
      form.targetRoles.length,
      skillsText,
    ],
  );

  useEffect(() => {
    if (loading) return;
    const hash = window.location.hash.slice(1);
    if (hash) setExpandSectionId(hash);
  }, [loading]);

  useEffect(() => {
    if (loading) return;

    const update = () => {
      const el = headerSaveRef.current;
      if (!el) return;
      // Show fixed save once the header button scrolls under the nav (~64px).
      setShowStickySave(el.getBoundingClientRect().bottom < 64);
    };

    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, [loading]);

  if (loading) return <PageLoader label="Loading profile…" />;

  const saveButton = (
    <Button
      onClick={save}
      disabled={saving || saved}
      variant={saved ? "secondary" : "primary"}
      size="lg"
    >
      {saving ? "Saving…" : saved ? "Saved" : "Save profile"}
    </Button>
  );

  return (
    <div className="space-y-5">
      <PageHeader
        title="Your profile"
        description="Resume data the AI uses for tailoring and autofill."
        actions={
          <div ref={headerSaveRef} className="flex items-center gap-3">
            {hasProfileData && !uploadExpanded && (
              <Button
                variant="ghost"
                onClick={() => {
                  setUploadExpanded(true);
                  requestAnimationFrame(() =>
                    document
                      .getElementById("upload")
                      ?.scrollIntoView({ behavior: "smooth" }),
                  );
                }}
              >
                Re-upload resume
              </Button>
            )}
            {saveButton}
          </div>
        }
      />

      {showStickySave && (
        <div className="fixed bottom-5 right-4 z-40 sm:bottom-6 sm:right-6">
          <Button
            onClick={save}
            disabled={saving || saved}
            variant={saved ? "secondary" : "primary"}
            size="md"
            className="shadow-lg shadow-emerald-900/15 ring-1 ring-black/5"
          >
            {saving ? "Saving…" : saved ? "Saved" : "Save"}
          </Button>
        </div>
      )}

      <ProfileProgress completion={completion} />

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[11.5rem_minmax(0,1fr)] lg:gap-10">
        <ProfileJumpNav
          counts={navCounts}
          onNavigate={(id) => {
            // Clear then set so re-clicking a collapsed section re-opens it.
            setExpandSectionId(null);
            queueMicrotask(() => setExpandSectionId(id));
            if (id === "upload" && hasProfileData && !uploadExpanded) {
              setUploadExpanded(true);
              requestAnimationFrame(() =>
                document
                  .getElementById("upload")
                  ?.scrollIntoView({ behavior: "smooth" }),
              );
            }
          }}
        />

        <div className="min-w-0 space-y-4">
          {(uploading || importSummary || uploadMsg) && (
            <ProfileImportSummary
              summary={importSummary}
              extractedChars={extractedChars ?? undefined}
              loading={uploading}
              error={
                uploadMsg &&
                (uploadMsg.toLowerCase().includes("fail") ||
                  uploadMsg.includes("Couldn't"))
                  ? uploadMsg
                  : null
              }
              onDismiss={
                importSummary && !uploading
                  ? () => {
                      setImportSummary(null);
                      setExtractedChars(null);
                    }
                  : undefined
              }
            />
          )}

          {(!hasProfileData || uploadExpanded) && (
          <section id="upload" className={PROFILE_SECTION_SCROLL}>
            <div
              className={`rounded-2xl transition-[box-shadow,border-color] duration-200 ${
                expandSectionId === "upload"
                  ? `border ${PROFILE_SECTION_HIGHLIGHT}`
                  : ""
              }`}
            >
              <Card
                padding="default"
                className={
                  expandSectionId === "upload"
                    ? "border-transparent shadow-none"
                    : "border-slate-200/60"
                }
              >
                {hasProfileData && (
                  <div className="mb-4 flex justify-end">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setUploadExpanded(false)}
                    >
                      Cancel
                    </Button>
                  </div>
                )}
                {!hasProfileData && (
                  <SectionTitle
                    title="Upload your resume"
                    description="We parse contact, experience, education, and skills into the sections below."
                  />
                )}
                <UploadZone
                    accept=".pdf,.docx,.txt,.md"
                    loading={uploading}
                    label={
                      uploading
                        ? "Reading your resume…"
                        : "Drop your resume here or click to browse"
                    }
                    hint="PDF, DOCX, TXT, or Markdown · text-based PDFs work best"
                    onFile={uploadResume}
                  />
              </Card>
            </div>
          </section>
          )}

          {hasProfileData && !uploadExpanded && (
            <span id="upload" className="sr-only" aria-hidden />
          )}

          <ProfileSection
            id="contact"
            expandOnId={expandSectionId}
            title="Contact"
            description="Used to autofill application forms."
            defaultOpen={!completion.contact}
          >
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <Label>Full name</Label>
                <input
                  className={inputClass}
                  value={form.fullName}
                  onChange={(e) => set("fullName", e.target.value)}
                />
              </div>
              <div>
                <Label>Email</Label>
                <input
                  className={inputClass}
                  type="email"
                  value={form.email}
                  onChange={(e) => set("email", e.target.value)}
                />
              </div>
              <div>
                <Label>Phone</Label>
                <input
                  className={inputClass}
                  value={form.phone}
                  onChange={(e) => set("phone", e.target.value)}
                />
              </div>
              <div>
                <Label>Location</Label>
                <input
                  className={inputClass}
                  placeholder="City, State (open to relocate)"
                  value={form.location}
                  onChange={(e) => set("location", e.target.value)}
                />
              </div>
              <div>
                <Label>LinkedIn URL</Label>
                <input
                  className={inputClass}
                  placeholder="https://linkedin.com/in/you"
                  value={form.linkedin}
                  onChange={(e) => set("linkedin", e.target.value)}
                />
              </div>
              <div>
                <Label>GitHub URL</Label>
                <input
                  className={inputClass}
                  placeholder="https://github.com/you"
                  value={form.github}
                  onChange={(e) => set("github", e.target.value)}
                />
              </div>
              <div className="sm:col-span-2">
                <Label>Website / portfolio</Label>
                <input
                  className={inputClass}
                  placeholder="https://yoursite.com"
                  value={form.website}
                  onChange={(e) => set("website", e.target.value)}
                />
              </div>
            </div>
          </ProfileSection>

          <ProfileSection
            id="experience"
            expandOnId={expandSectionId}
            title="Work experience"
            description="Jobs and internships — most recent first. One bullet per line under achievements."
            count={form.workExperience.length}
            defaultOpen={form.workExperience.length === 0}
            action={
              <Button variant="secondary" size="sm" onClick={addWork}>
                + Add role
              </Button>
            }
          >
            {form.workExperience.length === 0 ? (
              <p className="text-sm text-slate-400">
                No roles yet — upload a resume or add one manually.
              </p>
            ) : (
              <div className="space-y-4">
                {form.workExperience.map((w, i) => (
                  <ItemCard key={i} onRemove={() => removeWork(i)}>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <div>
                        <Label>Job title</Label>
                        <input
                          className={inputClass}
                          placeholder="Software Engineer"
                          value={w.title}
                          onChange={(e) =>
                            updateWork(i, { title: e.target.value })
                          }
                        />
                      </div>
                      <div>
                        <Label>Company</Label>
                        <input
                          className={inputClass}
                          placeholder="Acme Inc."
                          value={w.company}
                          onChange={(e) =>
                            updateWork(i, { company: e.target.value })
                          }
                        />
                      </div>
                      <div>
                        <Label>Location</Label>
                        <input
                          className={inputClass}
                          placeholder="Remote · San Francisco, CA"
                          value={w.location}
                          onChange={(e) =>
                            updateWork(i, { location: e.target.value })
                          }
                        />
                      </div>
                      <div className="flex items-end pb-1">
                        <label className="flex items-center gap-2 text-sm text-slate-700">
                          <input
                            type="checkbox"
                            checked={w.current}
                            onChange={(e) =>
                              updateWork(i, {
                                current: e.target.checked,
                                endDate: e.target.checked ? "" : w.endDate,
                              })
                            }
                          />
                          I currently work here
                        </label>
                      </div>
                      <div>
                        <Label>Start date</Label>
                        <input
                          className={inputClass}
                          placeholder="Jan 2022"
                          value={w.startDate}
                          onChange={(e) =>
                            updateWork(i, { startDate: e.target.value })
                          }
                        />
                      </div>
                      <div>
                        <Label>End date</Label>
                        <input
                          className={inputClass}
                          placeholder={w.current ? "Present" : "Dec 2024"}
                          value={w.current ? "Present" : w.endDate}
                          disabled={w.current}
                          onChange={(e) =>
                            updateWork(i, { endDate: e.target.value })
                          }
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <Label>Achievements (one per line)</Label>
                        <textarea
                          className={`${inputClass} min-h-28 font-mono text-xs leading-relaxed`}
                          placeholder={
                            "Built X using Y, improving Z by 40%\nLed migration to AWS for 3 services"
                          }
                          value={highlightsText(w.highlights)}
                          onChange={(e) =>
                            updateWork(i, {
                              highlights: parseHighlights(e.target.value),
                            })
                          }
                        />
                      </div>
                    </div>
                  </ItemCard>
                ))}
              </div>
            )}
          </ProfileSection>

          <ProfileSection
            id="education"
            expandOnId={expandSectionId}
            title="Education"
            description="Degrees, bootcamps, and formal training."
            count={form.education.length}
            defaultOpen={form.education.length === 0}
            action={
              <Button variant="secondary" size="sm" onClick={addEducation}>
                + Add education
              </Button>
            }
          >
            {form.education.length === 0 ? (
              <p className="text-sm text-slate-400">
                No education entries yet.
              </p>
            ) : (
              <div className="space-y-4">
                {form.education.map((e, i) => (
                  <ItemCard key={i} onRemove={() => removeEducation(i)}>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <div>
                        <Label>School</Label>
                        <input
                          className={inputClass}
                          value={e.school}
                          onChange={(ev) =>
                            updateEducation(i, { school: ev.target.value })
                          }
                        />
                      </div>
                      <div>
                        <Label>Degree</Label>
                        <input
                          className={inputClass}
                          placeholder="B.S. Computer Science"
                          value={e.degree}
                          onChange={(ev) =>
                            updateEducation(i, { degree: ev.target.value })
                          }
                        />
                      </div>
                      <div>
                        <Label>Field of study</Label>
                        <input
                          className={inputClass}
                          value={e.field}
                          onChange={(ev) =>
                            updateEducation(i, { field: ev.target.value })
                          }
                        />
                      </div>
                      <div>
                        <Label>Location</Label>
                        <input
                          className={inputClass}
                          value={e.location}
                          onChange={(ev) =>
                            updateEducation(i, { location: ev.target.value })
                          }
                        />
                      </div>
                      <div>
                        <Label>Start</Label>
                        <input
                          className={inputClass}
                          placeholder="Aug 2018"
                          value={e.startDate}
                          onChange={(ev) =>
                            updateEducation(i, { startDate: ev.target.value })
                          }
                        />
                      </div>
                      <div>
                        <Label>End / expected</Label>
                        <input
                          className={inputClass}
                          placeholder="May 2022"
                          value={e.endDate}
                          onChange={(ev) =>
                            updateEducation(i, { endDate: ev.target.value })
                          }
                        />
                      </div>
                      <div>
                        <Label>GPA (optional)</Label>
                        <input
                          className={inputClass}
                          placeholder="3.8"
                          value={e.gpa}
                          onChange={(ev) =>
                            updateEducation(i, { gpa: ev.target.value })
                          }
                        />
                      </div>
                      <div>
                        <Label>Honors (optional)</Label>
                        <input
                          className={inputClass}
                          placeholder="Dean's List, cum laude"
                          value={e.honors}
                          onChange={(ev) =>
                            updateEducation(i, { honors: ev.target.value })
                          }
                        />
                      </div>
                    </div>
                  </ItemCard>
                ))}
              </div>
            )}
          </ProfileSection>

          <ProfileSection
            id="projects"
            expandOnId={expandSectionId}
            title="Projects"
            description="Website, App Store, and Play Store links per project — used when tailoring."
            count={form.projects.length}
            defaultOpen={form.projects.length === 0}
            action={
              <Button variant="secondary" size="sm" onClick={addProject}>
                + Add project
              </Button>
            }
          >
            {form.projects.length === 0 ? (
              <p className="text-sm text-slate-400">No projects yet.</p>
            ) : (
              <div className="space-y-4">
                {form.projects.map((p, i) => (
                  <ItemCard key={i} onRemove={() => removeProject(i)}>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <div>
                        <Label>Project name</Label>
                        <input
                          className={inputClass}
                          value={p.name}
                          onChange={(e) =>
                            updateProject(i, { name: e.target.value })
                          }
                        />
                      </div>
                      <div>
                        <Label>Your role</Label>
                        <input
                          className={inputClass}
                          value={p.role}
                          onChange={(e) =>
                            updateProject(i, { role: e.target.value })
                          }
                        />
                      </div>
                      <div>
                        <Label>Start</Label>
                        <input
                          className={inputClass}
                          placeholder="Jan 2023"
                          value={p.startDate ?? ""}
                          onChange={(e) =>
                            updateProject(i, { startDate: e.target.value })
                          }
                        />
                      </div>
                      <div>
                        <Label>End</Label>
                        <input
                          className={inputClass}
                          placeholder="Present"
                          value={p.endDate ?? ""}
                          onChange={(e) =>
                            updateProject(i, { endDate: e.target.value })
                          }
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <Label>Description</Label>
                        <textarea
                          className={`${inputClass} min-h-16`}
                          value={p.description}
                          onChange={(e) =>
                            updateProject(i, { description: e.target.value })
                          }
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <div className="mb-2 flex items-center justify-between gap-2">
                          <Label className="!mb-0">Links</Label>
                          <button
                            type="button"
                            onClick={() => addProjectLink(i)}
                            className="text-xs font-medium text-emerald-600 hover:text-emerald-700"
                          >
                            + Add link
                          </button>
                        </div>
                        {(() => {
                          const rows = projectLinkRows(p);
                          return (
                            <div className="space-y-2">
                              {rows.map((url, li) => (
                                <div key={li} className="flex gap-2">
                                  <input
                                    className={inputClass}
                                    placeholder="https://…"
                                    value={url}
                                    onChange={(e) =>
                                      updateProjectLink(i, li, e.target.value)
                                    }
                                  />
                                  {(rows.length > 1 || url.trim()) && (
                                    <button
                                      type="button"
                                      onClick={() => removeProjectLink(i, li)}
                                      className="shrink-0 rounded-lg px-2.5 text-sm text-slate-400 hover:bg-slate-100 hover:text-red-600"
                                      aria-label="Remove link"
                                    >
                                      ✕
                                    </button>
                                  )}
                                </div>
                              ))}
                            </div>
                          );
                        })()}
                      </div>
                      <div className="sm:col-span-2">
                        <Label>Tech (comma-separated)</Label>
                        <input
                          className={inputClass}
                          value={p.tech.join(", ")}
                          onChange={(e) =>
                            updateProject(i, {
                              tech: e.target.value
                                .split(",")
                                .map((s) => s.trim())
                                .filter(Boolean),
                            })
                          }
                        />
                      </div>
                    </div>
                  </ItemCard>
                ))}
              </div>
            )}
          </ProfileSection>

          <ProfileSection
            id="skills"
            expandOnId={expandSectionId}
            title="Skills"
            description="Comma-separated — used for ATS keyword matching."
            count={navCounts.skills}
            defaultOpen={!completion.skills}
          >
            <input
              className={inputClass}
              placeholder="React, TypeScript, Node.js, AWS, Python"
              value={skillsText}
              onChange={(e) => {
                setSkillsText(e.target.value);
                setSaved(false);
              }}
            />
          </ProfileSection>

          <ProfileSection
            id="certifications"
            expandOnId={expandSectionId}
            title="Certifications"
            description="Professional licenses and credentials."
            count={form.certifications.length}
            defaultOpen={form.certifications.length === 0}
            action={
              <Button variant="secondary" size="sm" onClick={addCert}>
                + Add certification
              </Button>
            }
          >
            {form.certifications.length === 0 ? (
              <p className="text-sm text-slate-400">No certifications yet.</p>
            ) : (
              <div className="space-y-4">
                {form.certifications.map((c, i) => (
                  <ItemCard key={i} onRemove={() => removeCert(i)}>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <div>
                        <Label>Name</Label>
                        <input
                          className={inputClass}
                          value={c.name}
                          onChange={(e) =>
                            updateCert(i, { name: e.target.value })
                          }
                        />
                      </div>
                      <div>
                        <Label>Issuer</Label>
                        <input
                          className={inputClass}
                          value={c.issuer}
                          onChange={(e) =>
                            updateCert(i, { issuer: e.target.value })
                          }
                        />
                      </div>
                      <div>
                        <Label>Date</Label>
                        <input
                          className={inputClass}
                          placeholder="2023"
                          value={c.date}
                          onChange={(e) =>
                            updateCert(i, { date: e.target.value })
                          }
                        />
                      </div>
                      <div>
                        <Label>Credential URL</Label>
                        <input
                          className={inputClass}
                          value={c.url ?? ""}
                          onChange={(e) =>
                            updateCert(i, { url: e.target.value })
                          }
                        />
                      </div>
                    </div>
                  </ItemCard>
                ))}
              </div>
            )}
          </ProfileSection>

          <ProfileSection
            id="summary"
            expandOnId={expandSectionId}
            title="Professional summary"
            description="2–3 sentences that guide tailoring."
            defaultOpen={!completion.summary}
          >
            <textarea
              className={`${inputClass} min-h-24`}
              value={form.summary}
              onChange={(e) => set("summary", e.target.value)}
            />
          </ProfileSection>

          <ProfileSection
            id="resume"
            expandOnId={expandSectionId}
            title="Base resume"
            description="Full master resume text — auto-filled from upload."
            defaultOpen={!completion.resume}
            action={
              <Button
                variant="secondary"
                size="sm"
                onClick={generateOutline}
                disabled={outlining}
              >
                {outlining ? "Generating…" : "✨ Generate outline"}
              </Button>
            }
          >
            <textarea
              className={`${inputClass} min-h-72 font-mono text-xs leading-relaxed`}
              value={form.baseResume}
              onChange={(e) => set("baseResume", e.target.value)}
            />
          </ProfileSection>

          <ProfileSection
            id="roles"
            expandOnId={expandSectionId}
            title="Target roles"
            description="What the job scanner searches for."
            count={form.targetRoles.length}
            defaultOpen={form.targetRoles.length === 0}
            action={
              <Button variant="secondary" size="sm" onClick={addRole}>
                + Add role
              </Button>
            }
          >
            {form.targetRoles.length === 0 ? (
              <p className="text-sm text-slate-400">No target roles yet.</p>
            ) : (
              <div className="space-y-4">
                {form.targetRoles.map((role, i) => (
                  <ItemCard key={i} onRemove={() => removeRole(i)}>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <div>
                        <Label>Job title</Label>
                        <input
                          className={inputClass}
                          value={role.title}
                          onChange={(e) =>
                            updateRole(i, { title: e.target.value })
                          }
                        />
                      </div>
                      <div>
                        <Label>Locations</Label>
                        <input
                          className={inputClass}
                          value={role.locations.join(", ")}
                          onChange={(e) =>
                            updateRole(i, {
                              locations: e.target.value
                                .split(",")
                                .map((s) => s.trim())
                                .filter(Boolean),
                            })
                          }
                        />
                      </div>
                      <div>
                        <Label>Keywords</Label>
                        <input
                          className={inputClass}
                          value={role.keywords.join(", ")}
                          onChange={(e) =>
                            updateRole(i, {
                              keywords: e.target.value
                                .split(",")
                                .map((s) => s.trim())
                                .filter(Boolean),
                            })
                          }
                        />
                      </div>
                      <label className="flex items-end gap-2 pb-2 text-sm text-slate-700">
                        <input
                          type="checkbox"
                          checked={role.remote}
                          onChange={(e) =>
                            updateRole(i, { remote: e.target.checked })
                          }
                        />
                        Remote OK
                      </label>
                    </div>
                  </ItemCard>
                ))}
              </div>
            )}
          </ProfileSection>

          <ProfileSection
            id="visa"
            expandOnId={expandSectionId}
            title="Work authorization"
            defaultOpen={false}
          >
            <p className="mb-3 text-sm text-slate-500">
              Hides jobs that require citizenship or refuse sponsorship when
              enabled.
            </p>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <Label>Visa status</Label>
                <input
                  className={inputClass}
                  placeholder="F1 student (OPT/CPT eligible)"
                  value={form.visaStatus}
                  onChange={(e) => set("visaStatus", e.target.value)}
                />
              </div>
              <label className="flex items-end gap-2 pb-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={form.needsSponsorship}
                  onChange={(e) =>
                    set("needsSponsorship", e.target.checked)
                  }
                />
                I will need visa sponsorship
              </label>
            </div>
          </ProfileSection>

          <ProfileSection
            id="application"
            expandOnId={expandSectionId}
            title="Application defaults"
            defaultOpen={false}
          >
            <p className="mb-3 text-sm text-slate-500">
              Saved answers for common screening questions on job applications.
              Autofill uses these when a form asks for them.
            </p>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <Label>How did you hear about opportunities?</Label>
                <select
                  className={selectClass}
                  value={form.hearAboutSource}
                  onChange={(e) => set("hearAboutSource", e.target.value)}
                >
                  {HEAR_ABOUT_OPTIONS.map((opt) => (
                    <option key={opt || "empty"} value={opt}>
                      {opt || "Select…"}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label>U.S. state of residence</Label>
                <select
                  className={selectClass}
                  value={form.usState}
                  onChange={(e) => set("usState", e.target.value)}
                >
                  <option value="">Select…</option>
                  {US_STATES.map((state) => (
                    <option key={state} value={state}>
                      {state}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label>Legally authorized to work?</Label>
                <select
                  className={selectClass}
                  value={form.authorizedToWork}
                  onChange={(e) => set("authorizedToWork", e.target.value)}
                >
                  {YES_NO_OPTIONS.map((opt) => (
                    <option key={opt || "empty"} value={opt}>
                      {opt || "Select…"}
                    </option>
                  ))}
                </select>
              </div>
              <div className="sm:col-span-2">
                <Label>Sponsorship details (if required)</Label>
                <textarea
                  className={`${inputClass} min-h-[88px] resize-y`}
                  placeholder="e.g. H-1B transfer, OPT STEM extension"
                  value={form.sponsorshipDetails}
                  onChange={(e) =>
                    set("sponsorshipDetails", e.target.value)
                  }
                />
              </div>
            </div>
          </ProfileSection>

          <ProfileSection
            id="eeo"
            expandOnId={expandSectionId}
            title="Voluntary disclosures (EEO)"
            defaultOpen={false}
          >
            <p className="mb-3 text-sm text-slate-500">
              Optional demographic answers for OFCCP-style questions. Autofill
              uses your choices when applications require them.
            </p>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <Label>Gender</Label>
                <select
                  className={selectClass}
                  value={form.gender}
                  onChange={(e) => set("gender", e.target.value)}
                >
                  {GENDER_OPTIONS.map((opt) => (
                    <option key={opt || "empty"} value={opt}>
                      {opt || "Select…"}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label>Race / ethnicity</Label>
                <select
                  className={selectClass}
                  value={form.raceEthnicity}
                  onChange={(e) => set("raceEthnicity", e.target.value)}
                >
                  {RACE_ETHNICITY_OPTIONS.map((opt) => (
                    <option key={opt || "empty"} value={opt}>
                      {opt || "Select…"}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label>Veteran status</Label>
                <select
                  className={selectClass}
                  value={form.veteranStatus}
                  onChange={(e) => set("veteranStatus", e.target.value)}
                >
                  {VETERAN_OPTIONS.map((opt) => (
                    <option key={opt || "empty"} value={opt}>
                      {opt || "Select…"}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label>Disability status</Label>
                <select
                  className={selectClass}
                  value={form.disabilityStatus}
                  onChange={(e) => set("disabilityStatus", e.target.value)}
                >
                  {DISABILITY_OPTIONS.map((opt) => (
                    <option key={opt || "empty"} value={opt}>
                      {opt || "Select…"}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </ProfileSection>

        </div>
      </div>
    </div>
  );
}
