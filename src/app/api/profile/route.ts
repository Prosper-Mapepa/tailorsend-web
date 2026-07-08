import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAuthUser, isAuthUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getProfile } from "@/lib/profile";

export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await requireAuthUser();
  if (!isAuthUser(auth)) return auth;
  const profile = await getProfile(auth.id);
  return NextResponse.json(profile);
}

const targetRoleSchema = z.object({
  title: z.string(),
  locations: z.array(z.string()).default([]),
  remote: z.boolean().default(false),
  keywords: z.array(z.string()).default([]),
  minSalary: z.number().optional(),
});

const projectSchema = z.object({
  name: z.string().default(""),
  role: z.string().default(""),
  description: z.string().default(""),
  links: z.array(z.string()).optional(),
  link: z.string().default(""),
  appStoreLink: z.string().optional(),
  playStoreLink: z.string().optional(),
  tech: z.array(z.string()).default([]),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

const workExperienceSchema = z.object({
  company: z.string().default(""),
  title: z.string().default(""),
  location: z.string().default(""),
  startDate: z.string().default(""),
  endDate: z.string().default(""),
  current: z.boolean().default(false),
  highlights: z.array(z.string()).default([]),
});

const educationSchema = z.object({
  school: z.string().default(""),
  degree: z.string().default(""),
  field: z.string().default(""),
  location: z.string().default(""),
  startDate: z.string().default(""),
  endDate: z.string().default(""),
  gpa: z.string().default(""),
  honors: z.string().default(""),
});

const certificationSchema = z.object({
  name: z.string().default(""),
  issuer: z.string().default(""),
  date: z.string().default(""),
  url: z.string().optional(),
});

const updateSchema = z.object({
  fullName: z.string().optional(),
  email: z.string().optional(),
  phone: z.string().optional(),
  location: z.string().optional(),
  linkedin: z.string().optional(),
  github: z.string().optional(),
  website: z.string().optional(),
  baseResume: z.string().optional(),
  summary: z.string().optional(),
  skills: z.array(z.string()).optional(),
  projects: z.array(projectSchema).optional(),
  workExperience: z.array(workExperienceSchema).optional(),
  education: z.array(educationSchema).optional(),
  certifications: z.array(certificationSchema).optional(),
  targetRoles: z.array(targetRoleSchema).optional(),
  visaStatus: z.string().optional(),
  needsSponsorship: z.boolean().optional(),
  gender: z.string().optional(),
  raceEthnicity: z.string().optional(),
  veteranStatus: z.string().optional(),
  disabilityStatus: z.string().optional(),
  hearAboutSource: z.string().optional(),
  usState: z.string().optional(),
  authorizedToWork: z.string().optional(),
  sponsorshipDetails: z.string().optional(),
});

export async function PUT(req: Request) {
  const auth = await requireAuthUser();
  if (!isAuthUser(auth)) return auth;

  const body = await req.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid profile", details: parsed.error.flatten() },
      { status: 400 },
    );
  }
  const { skills, projects, workExperience, education, certifications, targetRoles, ...rest } =
    parsed.data;
  const jsonFields = {
    ...(skills ? { skills: JSON.stringify(skills) } : {}),
    ...(projects ? { projects: JSON.stringify(projects) } : {}),
    ...(workExperience ? { workExperience: JSON.stringify(workExperience) } : {}),
    ...(education ? { education: JSON.stringify(education) } : {}),
    ...(certifications ? { certifications: JSON.stringify(certifications) } : {}),
    ...(targetRoles ? { targetRoles: JSON.stringify(targetRoles) } : {}),
  };
  await prisma.profile.upsert({
    where: { userId: auth.id },
    create: { userId: auth.id, ...rest, ...jsonFields },
    update: { ...rest, ...jsonFields },
  });
  return NextResponse.json(await getProfile(auth.id));
}
