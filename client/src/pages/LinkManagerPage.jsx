import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { DndContext, PointerSensor, closestCenter, useSensor, useSensors } from "@dnd-kit/core";
import { SortableContext, arrayMove, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { z } from "zod";
import toast from "react-hot-toast";
import { Pencil, Plus, Search, Trash2, X } from "lucide-react";
import GlassCard from "../components/ui/GlassCard";
import {
  useCreateLink,
  useDeleteLink,
  useLinks,
  useReorderLinks,
  useToggleLink,
  useUpdateLink,
  useUploadLinkThumbnail
} from "../hooks/useLinks";
import { useAuthStore } from "../store/authStore";
import { getPublicProfileHost } from "../lib/publicProfileUrl";

const EMOJI_OPTIONS = [
  "🔗", "🏠", "📧", "🎵", "📺", "💼", "🛒", "📸", "🐦", "💬", "📱", "🎮", "☕", "✈️", "📚", "🎨", "💡", "⭐", "🔥", "❤️",
  "🚀", "📝", "🎯", "💎", "🌐", "📌", "🎁", "🤝"
];

const linkFormSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(60, "Max 60 characters"),
  url: z.string().trim().url({ message: "Enter a valid URL (include https://)" })
});

const defaultForm = {
  title: "",
  url: "",
  icon: "🔗",
  thumbnailImage: "",
  scheduleStart: "",
  scheduleEnd: "",
  expiresAt: "",
  customSlug: "",
  utmSource: "",
  utmMedium: "",
  utmCampaign: "",
  groupLabel: ""
};

function scheduledBadge(link) {
  if (!link.scheduleStart) return false;
  return new Date(link.scheduleStart) > new Date();
}

function expiredBadge(link) {
  if (!link.expiresAt) return false;
  return new Date(link.expiresAt) < new Date();
}

function LinkCardBody({
  link,
  onEdit,
  onDelete,
  onToggle,
  dragAttributes = {},
  dragListeners = {},
  showDrag,
  style,
  setNodeRef,
  isDragging = false
}) {
  const iconChar = link.thumbnailImage ? null : link.icon || "🔗";

  return (
    <div
      ref={setNodeRef || undefined}
      style={style || undefined}
      className={`group flex flex-col gap-3 rounded-xl border border-white/10 bg-bg-elevated/50 px-3 py-3 sm:flex-row sm:items-center sm:justify-between ${
        isDragging ? "z-20 opacity-90 ring-2 ring-accent-violet/40" : ""
      }`}
    >
      <div className="flex min-w-0 flex-1 items-start gap-3">
        {showDrag ? (
          <button
            type="button"
            className="mt-1 cursor-grab touch-none text-text-muted opacity-0 transition-opacity hover:text-text-primary group-hover:opacity-100 active:cursor-grabbing"
            aria-label="Drag to reorder"
            {...dragAttributes}
            {...dragListeners}
          >
            ⠿
          </button>
        ) : (
          <span className="mt-1 w-5 shrink-0" aria-hidden />
        )}
        <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-white/10 bg-black/20 text-base">
          {link.thumbnailImage ? (
            <img alt="" className="h-full w-full object-cover" src={link.thumbnailImage} />
          ) : (
            <span className="text-base leading-none">{iconChar}</span>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="truncate font-semibold text-text-primary">{link.title}</p>
            {scheduledBadge(link) ? (
              <span className="shrink-0 rounded-full border border-accent-gold/40 bg-accent-gold/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-accent-gold">
                Scheduled
              </span>
            ) : null}
            {expiredBadge(link) ? (
              <span className="shrink-0 rounded-full border border-accent-rose/40 bg-accent-rose/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-accent-rose">
                Expired
              </span>
            ) : null}
          </div>
          <p className="mt-0.5 truncate text-sm text-text-muted">{link.url}</p>
        </div>
      </div>
      <div className="flex shrink-0 flex-wrap items-center justify-end gap-2 sm:gap-3">
        <span className="rounded-full border border-accent-cyan/35 bg-accent-cyan/10 px-2.5 py-1 text-xs font-medium tabular-nums text-accent-cyan">
          {link.clicks ?? 0} clicks
        </span>
        <button
          type="button"
          role="switch"
          aria-checked={link.isActive}
          onClick={(e) => {
            e.stopPropagation();
            onToggle(link._id);
          }}
          className={`relative h-7 w-12 shrink-0 rounded-full transition-colors ${
            link.isActive ? "bg-accent-lime" : "bg-white/20"
          }`}
        >
          <span
            className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-transform ${
              link.isActive ? "translate-x-6" : "translate-x-1"
            }`}
          />
        </button>
        <button
          type="button"
          className="rounded-lg border border-white/10 p-2 text-text-muted transition hover:bg-white/10 hover:text-text-primary"
          onClick={() => onEdit(link)}
          aria-label="Edit"
        >
          <Pencil className="h-4 w-4" />
        </button>
        <button
          type="button"
          className="rounded-lg border border-accent-rose/30 p-2 text-accent-rose transition hover:bg-accent-rose/10"
          onClick={() => onDelete(link._id)}
          aria-label="Delete"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

function SortableLinkCard({ link, onEdit, onDelete, onToggle }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: link._id });
  const style = { transform: CSS.Transform.toString(transform), transition };

  return (
    <LinkCardBody
      link={link}
      onEdit={onEdit}
      onDelete={onDelete}
      onToggle={onToggle}
      dragAttributes={attributes}
      dragListeners={listeners}
      showDrag
      style={style}
      setNodeRef={setNodeRef}
      isDragging={isDragging}
    />
  );
}

export default function LinkManagerPage() {
  const [form, setForm] = useState(defaultForm);
  const [search, setSearch] = useState("");
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const user = useAuthStore((state) => state.user);
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { data: links = [], isLoading } = useLinks();
  const createLink = useCreateLink();
  const deleteLink = useDeleteLink();
  const toggleLink = useToggleLink();
  const updateLink = useUpdateLink();
  const reorderLinks = useReorderLinks();
  const uploadThumbnail = useUploadLinkThumbnail();
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  const isPro = user?.plan === "pro" || user?.plan === "business";
  const isFreeAndMaxed = user?.plan === "free" && links.length >= 3;
  const searchOn = Boolean(search.trim());
  const filteredLinks = useMemo(
    () =>
      links.filter(
        (link) =>
          (link.title || "").toLowerCase().includes(search.toLowerCase()) ||
          (link.url || "").toLowerCase().includes(search.toLowerCase())
      ),
    [links, search]
  );

  const displayList = searchOn ? filteredLinks : links;
  const publicDisplay = `${getPublicProfileHost()}/@${user?.username || "username"}`;
  const previewPath = user?.username ? `/${encodeURIComponent(user.username)}` : "/";

  const resetDrawer = () => {
    setForm(defaultForm);
    setEditingId(null);
    setIsDrawerOpen(false);
  };

  const openNewDrawer = () => {
    if (isFreeAndMaxed) {
      setShowUpgradeModal(true);
      return;
    }
    setEditingId(null);
    setForm(defaultForm);
    setIsDrawerOpen(true);
  };

  useEffect(() => {
    if (searchParams.get("add") !== "1") return;
    openNewDrawer();
    setSearchParams({}, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run once when palette deep-links ?add=1
  }, [searchParams, setSearchParams]);

  const openEditDrawer = (link) => {
    setEditingId(link._id);
    setForm({
      title: link.title || "",
      url: link.url || "",
      icon: link.icon || "🔗",
      thumbnailImage: link.thumbnailImage || "",
      scheduleStart: link.scheduleStart ? String(link.scheduleStart).slice(0, 16) : "",
      scheduleEnd: link.scheduleEnd ? String(link.scheduleEnd).slice(0, 16) : "",
      expiresAt: link.expiresAt ? String(link.expiresAt).slice(0, 16) : "",
      customSlug: link.customSlug || "",
      utmSource: link.utmSource || "",
      utmMedium: link.utmMedium || "",
      utmCampaign: link.utmCampaign || "",
      groupLabel: link.groupLabel || ""
    });
    setIsDrawerOpen(true);
  };

  const buildPayload = () => {
    const base = {
      title: form.title.trim(),
      url: form.url.trim(),
      icon: form.icon || "🔗",
      thumbnailImage: form.thumbnailImage?.trim() || ""
    };
    if (!isPro) return base;
    const pro = { ...base };
    if (form.customSlug?.trim()) pro.customSlug = form.customSlug.trim().toLowerCase().replace(/^\//, "");
    if (form.scheduleStart) pro.scheduleStart = new Date(form.scheduleStart).toISOString();
    if (form.scheduleEnd) pro.scheduleEnd = new Date(form.scheduleEnd).toISOString();
    if (form.expiresAt) pro.expiresAt = new Date(form.expiresAt).toISOString();
    if (form.utmSource?.trim()) pro.utmSource = form.utmSource.trim();
    if (form.utmMedium?.trim()) pro.utmMedium = form.utmMedium.trim();
    if (form.utmCampaign?.trim()) pro.utmCampaign = form.utmCampaign.trim();
    if (form.groupLabel?.trim()) pro.groupLabel = form.groupLabel.trim();
    return pro;
  };

  const handleSave = async () => {
    const parsed = linkFormSchema.safeParse({ title: form.title, url: form.url });
    if (!parsed.success) {
      const msg = parsed.error.flatten().fieldErrors.title?.[0] || parsed.error.flatten().fieldErrors.url?.[0] || "Invalid form";
      toast.error(msg);
      return;
    }
    try {
      const payload = buildPayload();
      if (editingId) {
        await updateLink.mutateAsync({ id: editingId, payload });
        toast.success("Link updated");
      } else {
        await createLink.mutateAsync(payload);
        toast.success("Link created");
      }
      resetDrawer();
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to save link");
    }
  };

  const onDragEnd = async (event) => {
    const { active, over } = event;
    if (!over || active.id === over.id || searchOn) return;
    const oldIndex = links.findIndex((item) => item._id === active.id);
    const newIndex = links.findIndex((item) => item._id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;
    const reordered = arrayMove(links, oldIndex, newIndex);
    const ids = reordered.map((item) => item._id);
    try {
      await reorderLinks.mutateAsync(ids);
    } catch {
      toast.error("Could not reorder links");
    }
  };

  const copyPublicUrl = async () => {
    const url = `https://${getPublicProfileHost()}/${user?.username || ""}`;
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Copied!");
    } catch {
      toast.error("Could not copy");
    }
  };

  const onThumbFile = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const final = await uploadThumbnail.mutateAsync(reader.result);
        setForm((p) => ({ ...p, thumbnailImage: final }));
        toast.success("Thumbnail uploaded");
      } catch (error) {
        toast.error(error?.response?.data?.message || "Upload failed");
      }
    };
    reader.readAsDataURL(file);
    event.target.value = "";
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="font-display text-3xl md:text-4xl">My Links</h1>
          <p className="mt-2 text-text-muted">Curate your digital ecosystem</p>
        </div>
        <div className="flex flex-wrap items-center gap-2 lg:justify-end">
          <button
            type="button"
            onClick={() => window.open(previewPath, "_blank", "noopener,noreferrer")}
            className="rounded-xl border border-white/15 px-4 py-2.5 text-sm font-medium text-text-primary transition hover:bg-white/5"
          >
            Preview Profile →
          </button>
          <button
            type="button"
            onClick={openNewDrawer}
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-br from-accent-violet to-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-glow transition hover:brightness-110"
          >
            <Plus className="h-4 w-4" />
            Add Link
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="text-text-muted">Your public URL:</span>
          <code className="rounded-lg border border-white/10 bg-white/5 px-2 py-1 font-mono text-xs text-accent-cyan">{publicDisplay}</code>
          <button
            type="button"
            onClick={copyPublicUrl}
            className="rounded-lg border border-border px-2 py-1 text-xs font-medium text-text-primary hover:bg-hover"
          >
            Copy
          </button>
        </div>
        <div className="relative w-full max-w-md flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
          <input
            className="w-full rounded-xl border border-white/10 bg-white/5 py-3 pl-10 pr-4 text-sm outline-none focus:border-accent-violet"
            placeholder="Search by title or URL…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {searchOn ? (
        <p className="text-xs text-text-muted">Clear search to drag and reorder links.</p>
      ) : null}

      <GlassCard className="relative overflow-hidden">
        {isFreeAndMaxed ? (
          <div className="mb-4 rounded-xl border border-accent-gold/30 bg-accent-gold/10 px-4 py-3 text-sm">
            <p className="font-medium text-text-primary">Free plan: 3 link limit reached</p>
            <p className="mt-1 text-text-muted">Upgrade to Pro for unlimited links, or edit/remove an existing link.</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setShowUpgradeModal(true)}
                className="rounded-lg bg-gradient-to-br from-accent-violet to-indigo-600 px-3 py-1.5 text-xs font-semibold text-white"
              >
                Upgrade to Pro
              </button>
              <button type="button" onClick={() => navigate("/dashboard/pricing")} className="rounded-lg border border-white/15 px-3 py-1.5 text-xs">
                View pricing
              </button>
            </div>
          </div>
        ) : null}

        <h2 className="mb-4 font-display text-xl text-text-muted">Your links</h2>
        <div className={isFreeAndMaxed ? "min-h-[120px] blur-[0.5px]" : ""}>
          {isLoading ? <p className="text-text-muted">Loading links…</p> : null}
          {!isLoading && displayList.length === 0 ? (
            <div className="rounded-xl border border-dashed border-white/15 px-6 py-12 text-center">
              <p className="text-4xl">🔗</p>
              <p className="mt-2 text-lg font-medium">No links match</p>
              <p className="text-sm text-text-muted">
                {searchOn ? "Try a different search." : "Add your first link to start tracking clicks."}
              </p>
              {!searchOn ? (
                <div className="mt-4">
                  <button
                    type="button"
                    onClick={openNewDrawer}
                    className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-br from-accent-violet to-indigo-600 px-5 py-2.5 text-sm font-semibold text-white"
                  >
                    <Plus className="h-4 w-4" />
                    Add your first link
                  </button>
                </div>
              ) : null}
            </div>
          ) : !searchOn ? (
            <DndContext collisionDetection={closestCenter} onDragEnd={onDragEnd} sensors={sensors}>
              <SortableContext items={links.map((item) => item._id)} strategy={verticalListSortingStrategy}>
                <div className="space-y-3">
                  {links.map((link) => (
                    <SortableLinkCard
                      key={link._id}
                      link={link}
                      onDelete={(id) => deleteLink.mutate(id)}
                      onEdit={openEditDrawer}
                      onToggle={(id) => toggleLink.mutate(id)}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          ) : (
            <div className="space-y-3">
              {filteredLinks.map((link) => (
                <LinkCardBody
                  key={link._id}
                  link={link}
                  onDelete={(id) => deleteLink.mutate(id)}
                  onEdit={openEditDrawer}
                  onToggle={(id) => toggleLink.mutate(id)}
                  showDrag={false}
                  isDragging={false}
                />
              ))}
            </div>
          )}
        </div>
      </GlassCard>

      {showUpgradeModal ? (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/70 px-4 backdrop-blur-sm">
          <GlassCard className="w-full max-w-md space-y-4 p-6">
            <h3 className="font-display text-2xl">Upgrade to Pro</h3>
            <p className="text-sm text-text-muted">
              Free tier supports 3 links. Upgrade for unlimited links, custom slugs, scheduling, UTM tags, and more.
            </p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => {
                  setShowUpgradeModal(false);
                  navigate("/dashboard/pricing");
                }}
                className="rounded-xl bg-gradient-to-br from-accent-violet to-indigo-600 px-4 py-2 text-sm font-semibold text-white"
              >
                Upgrade
              </button>
              <button type="button" className="rounded-xl border border-white/15 px-4 py-2 text-sm" onClick={() => setShowUpgradeModal(false)}>
                Close
              </button>
            </div>
          </GlassCard>
        </div>
      ) : null}

      {isDrawerOpen ? (
        <button type="button" className="fixed inset-0 z-40 bg-black/60 backdrop-blur-[2px]" aria-label="Close drawer" onClick={resetDrawer} />
      ) : null}

      <div
        className={`fixed inset-y-0 right-0 z-50 flex w-full max-w-[400px] flex-col border-l border-white/10 bg-bg-surface shadow-2xl transition-transform duration-300 ease-out ${
          isDrawerOpen ? "translate-x-0" : "translate-x-full pointer-events-none"
        }`}
      >
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
          <h3 className="font-display text-xl">{editingId ? "Edit link" : "Add link"}</h3>
          <button type="button" className="rounded-lg border border-white/10 p-2 text-text-muted hover:text-white" onClick={resetDrawer}>
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-5 py-4">
          <div className="space-y-4">
            <label className="block">
              <span className="text-xs text-text-muted">Title *</span>
              <input
                className="mt-1 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm outline-none focus:border-accent-violet"
                maxLength={60}
                value={form.title}
                onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
              />
              <span className="mt-1 text-[10px] text-text-muted">{form.title.length}/60</span>
            </label>
            <label className="block">
              <span className="text-xs text-text-muted">URL *</span>
              <input
                className="mt-1 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm outline-none focus:border-accent-violet"
                placeholder="https://"
                value={form.url}
                onChange={(e) => setForm((p) => ({ ...p, url: e.target.value }))}
              />
            </label>

            <div>
              <span className="text-xs text-text-muted">Icon</span>
              <div className="mt-2 grid grid-cols-8 gap-1.5 sm:grid-cols-9">
                {EMOJI_OPTIONS.map((em) => (
                  <button
                    key={em}
                    type="button"
                    onClick={() => setForm((p) => ({ ...p, icon: em }))}
                    className={`flex h-9 w-9 items-center justify-center rounded-lg border text-lg transition ${
                      form.icon === em ? "border-accent-cyan bg-accent-cyan/15" : "border-white/10 hover:bg-white/5"
                    }`}
                  >
                    {em}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <span className="text-xs text-text-muted">Thumbnail (optional)</span>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <label className="cursor-pointer rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-xs font-medium hover:bg-white/10">
                  Upload image
                  <input type="file" accept="image/*" className="hidden" onChange={onThumbFile} />
                </label>
                {uploadThumbnail.isPending ? <span className="text-xs text-text-muted">Uploading…</span> : null}
              </div>
              <input
                className="mt-2 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-xs outline-none"
                placeholder="Or paste image URL"
                value={form.thumbnailImage}
                onChange={(e) => setForm((p) => ({ ...p, thumbnailImage: e.target.value }))}
              />
            </div>

            <div className={`relative rounded-xl border border-white/10 p-4 ${!isPro ? "overflow-hidden" : ""}`}>
              {!isPro ? (
                <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 bg-bg-base/85 p-4 text-center backdrop-blur-sm">
                  <p className="text-sm font-medium text-white">Pro features</p>
                  <p className="text-xs text-text-muted">Custom slugs, scheduling, UTM, and groups.</p>
                  <Link
                    to="/dashboard/pricing"
                    className="rounded-lg bg-gradient-to-br from-accent-violet to-indigo-600 px-3 py-1.5 text-xs font-semibold text-white"
                  >
                    Upgrade
                  </Link>
                </div>
              ) : null}
              <div className={`space-y-3 ${!isPro ? "pointer-events-none blur-[1px]" : ""}`}>
                <label className="block">
                  <span className="text-xs text-text-muted">Custom slug</span>
                  <input
                    className="mt-1 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm"
                    placeholder="my-link"
                    value={form.customSlug}
                    onChange={(e) => setForm((p) => ({ ...p, customSlug: e.target.value }))}
                  />
                  <span className="text-[10px] text-text-muted">{getPublicProfileHost()}/@you/{form.customSlug || "…"}</span>
                </label>
                <div className="grid gap-2 sm:grid-cols-2">
                  <label className="block">
                    <span className="text-xs text-text-muted">Schedule start</span>
                    <input
                      type="datetime-local"
                      className="mt-1 w-full rounded-xl border border-white/10 bg-white/5 px-2 py-2 text-sm"
                      value={form.scheduleStart}
                      onChange={(e) => setForm((p) => ({ ...p, scheduleStart: e.target.value }))}
                    />
                  </label>
                  <label className="block">
                    <span className="text-xs text-text-muted">Schedule end</span>
                    <input
                      type="datetime-local"
                      className="mt-1 w-full rounded-xl border border-white/10 bg-white/5 px-2 py-2 text-sm"
                      value={form.scheduleEnd}
                      onChange={(e) => setForm((p) => ({ ...p, scheduleEnd: e.target.value }))}
                    />
                  </label>
                </div>
                <label className="block">
                  <span className="text-xs text-text-muted">Expiry</span>
                  <input
                    type="datetime-local"
                    className="mt-1 w-full rounded-xl border border-white/10 bg-white/5 px-2 py-2 text-sm"
                    value={form.expiresAt}
                    onChange={(e) => setForm((p) => ({ ...p, expiresAt: e.target.value }))}
                  />
                </label>
                <label className="block">
                  <span className="text-xs text-text-muted">UTM source</span>
                  <input
                    className="mt-1 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm"
                    value={form.utmSource}
                    onChange={(e) => setForm((p) => ({ ...p, utmSource: e.target.value }))}
                  />
                </label>
                <label className="block">
                  <span className="text-xs text-text-muted">UTM medium</span>
                  <input
                    className="mt-1 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm"
                    value={form.utmMedium}
                    onChange={(e) => setForm((p) => ({ ...p, utmMedium: e.target.value }))}
                  />
                </label>
                <label className="block">
                  <span className="text-xs text-text-muted">UTM campaign</span>
                  <input
                    className="mt-1 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm"
                    value={form.utmCampaign}
                    onChange={(e) => setForm((p) => ({ ...p, utmCampaign: e.target.value }))}
                  />
                </label>
                <label className="block">
                  <span className="text-xs text-text-muted">Group label</span>
                  <input
                    className="mt-1 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm"
                    value={form.groupLabel}
                    onChange={(e) => setForm((p) => ({ ...p, groupLabel: e.target.value }))}
                  />
                </label>
              </div>
            </div>
          </div>
        </div>
        <div className="border-t border-white/10 p-4">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleSave}
              disabled={createLink.isPending || updateLink.isPending}
              className="flex-1 rounded-xl bg-gradient-to-br from-accent-violet to-indigo-600 py-3 text-sm font-semibold text-white disabled:opacity-50"
            >
              {editingId ? "Save changes" : "Create link"}
            </button>
            <button type="button" className="rounded-xl border border-white/15 px-4 py-3 text-sm" onClick={resetDrawer}>
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
