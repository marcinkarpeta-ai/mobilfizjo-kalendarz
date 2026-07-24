import { create } from "zustand";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface Task {
  id: string;
  created_by: string;
  created_by_name: string | null;
  title: string;
  note: string | null;
  due_date: string | null;
  status: "open" | "done";
  done_at: string | null;
  done_by: string | null;
  done_by_name: string | null;
  created_at: string;
}

interface TasksState {
  tasks: Task[];
  loaded: boolean;
  loading: boolean;
  loadTasks: () => Promise<void>;
  addTask: (input: { title: string; note?: string | null; due_date?: string | null }) => Promise<void>;
  completeTask: (id: string) => Promise<void>;
  reopenTask: (id: string) => Promise<void>;
  updateTask: (
    id: string,
    patch: { title?: string; note?: string | null; due_date?: string | null },
  ) => Promise<void>;
}

function handleError(context: string, error: unknown) {
  console.error(`[tasks] ${context}`, error);
  const msg =
    typeof error === "object" && error && "message" in error
      ? String((error as { message?: string }).message)
      : "Nieznany błąd.";
  toast.error(`${context}: ${msg}`);
}

function mapRow(row: Record<string, unknown>, profiles: Map<string, string>): Task {
  const created_by = row.created_by as string;
  const done_by = (row.done_by as string | null) ?? null;
  return {
    id: row.id as string,
    created_by,
    created_by_name: profiles.get(created_by) ?? null,
    title: row.title as string,
    note: (row.note as string | null) ?? null,
    due_date: (row.due_date as string | null) ?? null,
    status: row.status as "open" | "done",
    done_at: (row.done_at as string | null) ?? null,
    done_by,
    done_by_name: done_by ? profiles.get(done_by) ?? null : null,
    created_at: row.created_at as string,
  };
}

export const useTasksStore = create<TasksState>()((set, get) => ({
  tasks: [],
  loaded: false,
  loading: false,

  loadTasks: async () => {
    if (get().loading) return;
    set({ loading: true });
    const { data, error } = await supabase
      .from("tasks")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) {
      set({ loading: false });
      handleError("Nie udało się pobrać spraw", error);
      return;
    }
    const ids = new Set<string>();
    for (const r of data ?? []) {
      if (r.created_by) ids.add(r.created_by);
      if (r.done_by) ids.add(r.done_by);
    }
    const profiles = new Map<string, string>();
    if (ids.size > 0) {
      const { data: pdata } = await supabase
        .from("profiles")
        .select("user_id, display_name")
        .in("user_id", Array.from(ids));
      for (const p of pdata ?? []) {
        if (p.display_name) profiles.set(p.user_id, p.display_name);
      }
    }
    set({
      tasks: (data ?? []).map((r) => mapRow(r, profiles)),
      loaded: true,
      loading: false,
    });
  },

  addTask: async ({ title, note, due_date }) => {
    const t = title.trim();
    if (!t) {
      toast.error("Tytuł jest wymagany.");
      return;
    }
    const { data: userData } = await supabase.auth.getUser();
    const uid = userData.user?.id;
    if (!uid) {
      toast.error("Brak sesji.");
      return;
    }
    const { data, error } = await supabase
      .from("tasks")
      .insert({
        title: t,
        note: note?.trim() ? note.trim() : null,
        due_date: due_date || null,
        created_by: uid,
      })
      .select("*")
      .single();
    if (error) {
      handleError("Dodanie sprawy nie powiodło się", error);
      return;
    }
    const { data: pdata } = await supabase
      .from("profiles")
      .select("user_id, display_name")
      .eq("user_id", uid)
      .maybeSingle();
    const profiles = new Map<string, string>();
    if (pdata?.display_name) profiles.set(uid, pdata.display_name);
    const mapped = mapRow(data, profiles);
    set((s) => ({ tasks: [mapped, ...s.tasks] }));
  },

  completeTask: async (id) => {
    const prev = get().tasks.find((t) => t.id === id);
    if (!prev) return;
    const { data: userData } = await supabase.auth.getUser();
    const uid = userData.user?.id ?? null;
    const now = new Date().toISOString();
    const uname = get().tasks.find((t) => t.created_by === uid)?.created_by_name ?? prev.done_by_name;
    set((s) => ({
      tasks: s.tasks.map((t) =>
        t.id === id ? { ...t, status: "done", done_at: now, done_by: uid, done_by_name: uname } : t,
      ),
    }));
    const { error } = await supabase
      .from("tasks")
      .update({ status: "done", done_at: now, done_by: uid })
      .eq("id", id);
    if (error) {
      set((s) => ({ tasks: s.tasks.map((t) => (t.id === id ? prev : t)) }));
      handleError("Nie udało się oznaczyć jako wykonane", error);
    } else if (uid) {
      // ensure name is fresh
      const { data: pdata } = await supabase
        .from("profiles")
        .select("display_name")
        .eq("user_id", uid)
        .maybeSingle();
      const nm = pdata?.display_name ?? null;
      set((s) => ({
        tasks: s.tasks.map((t) => (t.id === id ? { ...t, done_by_name: nm } : t)),
      }));
    }
  },

  reopenTask: async (id) => {
    const prev = get().tasks.find((t) => t.id === id);
    if (!prev) return;
    set((s) => ({
      tasks: s.tasks.map((t) =>
        t.id === id ? { ...t, status: "open", done_at: null, done_by: null, done_by_name: null } : t,
      ),
    }));
    const { error } = await supabase
      .from("tasks")
      .update({ status: "open", done_at: null, done_by: null })
      .eq("id", id);
    if (error) {
      set((s) => ({ tasks: s.tasks.map((t) => (t.id === id ? prev : t)) }));
      handleError("Nie udało się przywrócić sprawy", error);
    }
  },

  updateTask: async (id, patch) => {
    const prev = get().tasks.find((t) => t.id === id);
    if (!prev) return;
    const newTitle = patch.title !== undefined ? patch.title.trim() : prev.title;
    if (!newTitle) {
      toast.error("Tytuł jest wymagany.");
      return;
    }
    const dbPatch: { title?: string; note?: string | null; due_date?: string | null } = {};
    if (patch.title !== undefined) dbPatch.title = newTitle;
    if (patch.note !== undefined) dbPatch.note = patch.note?.trim() ? patch.note.trim() : null;
    if (patch.due_date !== undefined) dbPatch.due_date = patch.due_date || null;
    set((s) => ({
      tasks: s.tasks.map((t) => (t.id === id ? { ...t, ...dbPatch } : t)),
    }));
    const { error } = await supabase.from("tasks").update(dbPatch).eq("id", id);
    if (error) {
      set((s) => ({ tasks: s.tasks.map((t) => (t.id === id ? prev : t)) }));
      handleError("Zapis sprawy nie powiódł się", error);
    }
  },
}));
