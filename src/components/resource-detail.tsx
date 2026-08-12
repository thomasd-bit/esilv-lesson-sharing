"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Bookmark, Check, ExternalLink, FileDown, Flag, Heart, LoaderCircle, MessageCircle, Pencil, Share2, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { formatDate, formatMetric, initials, wasEdited } from "@/lib/format";
import { COMMENT_PAGE_SIZE, getCommentRange, hasMoreCommentPage } from "@/lib/comments";
import { getResourceShareUrl } from "@/lib/share";
import { reportSubmissionMessage } from "@/lib/reports";
import { commentSchema, firstValidationError } from "@/lib/validation";
import { RESOURCE_KIND_LABELS, type Profile, type Resource, type ResourceComment } from "@/lib/types";

type Props = {
  resource: Resource;
  author: Profile | null;
  currentUserId: string;
};

type CommentPage = {
  comments: ResourceComment[];
  totalCount: number | null;
  nextOffset: number;
  hasMore: boolean;
};

const commentSelect = "id, resource_id, author_id, body, created_at, updated_at";

async function fetchCommentPage(resourceId: string, offset: number): Promise<CommentPage> {
  const supabase = createClient();
  const { from, to } = getCommentRange(offset);
  const { data: rawComments, error: commentsError, count: totalCount } = await supabase
    .from("resource_comments")
    .select(commentSelect, { count: "exact" })
    .eq("resource_id", resourceId)
    .order("created_at", { ascending: true })
    .range(from, to);
  if (commentsError) throw commentsError;

  const commentRows = (rawComments ?? []) as Array<Omit<ResourceComment, "author">>;
  const authorIds = [...new Set(commentRows.map((comment) => comment.author_id))];
  const { data: profiles } = authorIds.length
    ? await supabase.from("profiles").select("id, display_name, programme, study_year, bio, avatar_url, created_at").in("id", authorIds)
    : { data: [] };
  const profileRows = (profiles ?? []) as unknown as Profile[];
  const profileById = new Map(profileRows.map((profile) => [profile.id, profile]));
  const comments = commentRows.map((comment) => ({ ...comment, author: profileById.get(comment.author_id) ?? null }));

  return {
    comments,
    totalCount: totalCount ?? null,
    nextOffset: offset + comments.length,
    hasMore: totalCount === null
      ? hasMoreCommentPage(comments.length)
      : offset + comments.length < totalCount,
  };
}

export function ResourceDetail({ resource, author, currentUserId }: Props) {
  const router = useRouter();
  const [likeCount, setLikeCount] = useState(0);
  const [liked, setLiked] = useState(false);
  const [saved, setSaved] = useState(false);
  const [comments, setComments] = useState<ResourceComment[]>([]);
  const [commentCount, setCommentCount] = useState<number | null>(null);
  const [commentOffset, setCommentOffset] = useState(0);
  const [hasMoreComments, setHasMoreComments] = useState(false);
  const [loadingMoreComments, setLoadingMoreComments] = useState(false);
  const [commentsLoadError, setCommentsLoadError] = useState<string | null>(null);
  const [commentBody, setCommentBody] = useState("");
  const [commentError, setCommentError] = useState<string | null>(null);
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editingBody, setEditingBody] = useState("");
  const [editCommentError, setEditCommentError] = useState<string | null>(null);
  const [socialLoading, setSocialLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<"like" | "save" | "comment" | "file" | "delete" | "edit-comment" | "delete-comment" | null>(null);
  const [shareState, setShareState] = useState<"idle" | "sharing" | "success" | "error">("idle");
  const [shareMethod, setShareMethod] = useState<"native" | "clipboard" | null>(null);
  const [reporting, setReporting] = useState(false);
  const [reportReason, setReportReason] = useState("");
  const [reportMessage, setReportMessage] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    async function loadSocialData() {
      const supabase = createClient();
      const [{ count }, { data: ownLike }, { data: ownSave }, commentsResult] = await Promise.all([
        supabase.from("resource_likes").select("resource_id", { count: "exact", head: true }).eq("resource_id", resource.id),
        supabase.from("resource_likes").select("resource_id").eq("resource_id", resource.id).eq("user_id", currentUserId).maybeSingle(),
        supabase.from("resource_saves").select("resource_id").eq("resource_id", resource.id).eq("user_id", currentUserId).maybeSingle(),
        fetchCommentPage(resource.id, 0).catch(() => null),
      ]);
      if (!active) return;
      setLikeCount(count ?? 0);
      setLiked(Boolean(ownLike));
      setSaved(Boolean(ownSave));
      if (commentsResult) {
        setComments(commentsResult.comments);
        setCommentCount(commentsResult.totalCount);
        setCommentOffset(commentsResult.nextOffset);
        setHasMoreComments(commentsResult.hasMore);
        setCommentsLoadError(null);
      } else {
        setCommentsLoadError("Les retours ne peuvent pas être chargés pour le moment.");
      }
      setSocialLoading(false);
    }
    void loadSocialData();
    return () => { active = false; };
  }, [currentUserId, resource.id]);

  async function toggleLike() {
    setActionLoading("like");
    const supabase = createClient();
    if (liked) {
      const { error } = await supabase.from("resource_likes").delete().eq("resource_id", resource.id).eq("user_id", currentUserId);
      if (!error) { setLiked(false); setLikeCount((count) => Math.max(0, count - 1)); }
    } else {
      const { error } = await supabase.from("resource_likes").insert({ resource_id: resource.id, user_id: currentUserId });
      if (!error) { setLiked(true); setLikeCount((count) => count + 1); }
    }
    setActionLoading(null);
  }

  async function toggleSave() {
    setActionLoading("save");
    const supabase = createClient();
    if (saved) {
      const { error } = await supabase.from("resource_saves").delete().eq("resource_id", resource.id).eq("user_id", currentUserId);
      if (!error) setSaved(false);
    } else {
      const { error } = await supabase.from("resource_saves").insert({ resource_id: resource.id, user_id: currentUserId });
      if (!error) setSaved(true);
    }
    setActionLoading(null);
  }

  async function downloadFile() {
    if (!resource.file_path) return;
    setActionLoading("file");
    const { data, error } = await createClient().storage.from("resource-files").createSignedUrl(resource.file_path, 60 * 10);
    if (!error && data?.signedUrl) window.open(data.signedUrl, "_blank", "noopener,noreferrer");
    setActionLoading(null);
  }

  async function shareResource() {
    setShareState("sharing");
    setShareMethod(null);
    const url = getResourceShareUrl(window.location.origin, resource.id);
    try {
      if (navigator.share) {
        try {
          await navigator.share({ title: resource.title, text: "Une ressource utile sur Passerelle", url });
          setShareMethod("native");
          setShareState("success");
          return;
        } catch (error) {
          if (error instanceof DOMException && error.name === "AbortError") {
            setShareState("idle");
            return;
          }
        }
      }
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
        setShareMethod("clipboard");
      } else {
        throw new Error("share-unavailable");
      }
      setShareState("success");
    } catch {
      setShareMethod(null);
      setShareState("error");
    }
  }

  async function loadMoreComments() {
    if (loadingMoreComments || !hasMoreComments) return;
    setLoadingMoreComments(true);
    setCommentsLoadError(null);
    try {
      const page = await fetchCommentPage(resource.id, commentOffset);
      setComments((current) => {
        const existingIds = new Set(current.map((comment) => comment.id));
        return [...current, ...page.comments.filter((comment) => !existingIds.has(comment.id))];
      });
      setCommentCount(page.totalCount);
      setCommentOffset(page.nextOffset);
      setHasMoreComments(page.hasMore);
    } catch {
      setCommentsLoadError("Les retours supplémentaires ne peuvent pas être chargés.");
    } finally {
      setLoadingMoreComments(false);
    }
  }

  async function submitComment(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsed = commentSchema.safeParse({ body: commentBody });
    if (!parsed.success) { setCommentError(firstValidationError(parsed.error)); return; }
    setActionLoading("comment");
    setCommentError(null);
    const supabase = createClient();
    const { data, error } = await supabase.from("resource_comments").insert({ resource_id: resource.id, author_id: currentUserId, body: commentBody.trim() }).select("id, resource_id, author_id, body, created_at, updated_at").single();
    if (error || !data) {
      setCommentError("Le commentaire n’a pas pu être publié.");
      setActionLoading(null);
      return;
    }
    setComments((current) => [...current, { ...(data as Omit<ResourceComment, "author">), author: authorForCurrentUser(currentUserId) }]);
    setCommentCount((current) => current === null ? null : current + 1);
    setCommentBody("");
    setActionLoading(null);
  }

  function startEditingComment(comment: ResourceComment) {
    setEditingCommentId(comment.id);
    setEditingBody(comment.body);
    setEditCommentError(null);
  }

  function cancelEditingComment() {
    setEditingCommentId(null);
    setEditingBody("");
    setEditCommentError(null);
  }

  async function saveCommentEdit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editingCommentId) return;
    const parsed = commentSchema.safeParse({ body: editingBody });
    if (!parsed.success) { setEditCommentError(firstValidationError(parsed.error)); return; }
    setActionLoading("edit-comment");
    setEditCommentError(null);
    const { data, error } = await createClient()
      .from("resource_comments")
      .update({ body: parsed.data.body })
      .eq("id", editingCommentId)
      .eq("author_id", currentUserId)
      .select("id, resource_id, author_id, body, created_at, updated_at")
      .single();
    if (error || !data) {
      setEditCommentError("Le commentaire n’a pas pu être modifié.");
      setActionLoading(null);
      return;
    }
    setComments((current) => current.map((comment) => comment.id === editingCommentId
      ? { ...(data as Omit<ResourceComment, "author">), author: comment.author }
      : comment));
    cancelEditingComment();
    setActionLoading(null);
  }

  async function deleteComment(comment: ResourceComment) {
    if (!window.confirm("Supprimer ce commentaire ? Cette action est définitive.")) return;
    setActionLoading("delete-comment");
    const { error } = await createClient()
      .from("resource_comments")
      .delete()
      .eq("id", comment.id)
      .eq("author_id", currentUserId);
    if (error) {
      setCommentError("Le commentaire n’a pas pu être supprimé.");
      setActionLoading(null);
      return;
    }
    setComments((current) => current.filter((item) => item.id !== comment.id));
    setCommentCount((current) => current === null ? null : Math.max(0, current - 1));
    setCommentOffset((current) => Math.max(0, current - 1));
    if (editingCommentId === comment.id) cancelEditingComment();
    setActionLoading(null);
  }

  function authorForCurrentUser(id: string): Profile | null {
    if (id !== currentUserId) return null;
    return author?.id === currentUserId ? author : { id, display_name: "Vous", programme: null, study_year: null, bio: null, avatar_url: null, created_at: new Date().toISOString() };
  }

  async function submitReport(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (reportReason.trim().length < 5) { setReportMessage("Décrivez rapidement le problème à signaler."); return; }
    const { error } = await createClient().from("resource_reports").insert({ resource_id: resource.id, reporter_id: currentUserId, reason: reportReason.trim() });
    setReportMessage(error ? reportSubmissionMessage(error.code) : "Merci, le signalement a été transmis.");
    if (!error) { setReportReason(""); setReporting(false); }
  }

  async function deleteResource() {
    if (!window.confirm("Supprimer cette ressource ? Cette action est définitive.")) return;
    setActionLoading("delete");
    const supabase = createClient();
    const { error } = await supabase.from("resources").delete().eq("id", resource.id).eq("author_id", currentUserId);
    if (!error) {
      if (resource.file_path) await supabase.storage.from("resource-files").remove([resource.file_path]);
      router.replace("/");
      router.refresh();
      return;
    }
    setActionLoading(null);
  }

  return (
    <div className="detail-layout">
      <article className="detail-card">
        <div className="detail-top">
          <span className="kind-label">{RESOURCE_KIND_LABELS[resource.kind]}</span>
          <span className="field-hint">Publié le {formatDate(resource.created_at)}</span>
        </div>
        <h1>{resource.title}</h1>
        <div className="detail-meta">
          <span className="pill">{resource.subject}</span>
          <span className="pill">{resource.programme}</span>
          <span className="pill">{resource.study_year}</span>
        </div>
        <p className="detail-description">{resource.description}</p>
        <div className="detail-actions">
          {resource.link_url ? <a className="button button-primary button-small" href={resource.link_url} target="_blank" rel="noreferrer"><ExternalLink size={15} /> Ouvrir le lien</a> : null}
          {resource.file_path ? <button className="button button-primary button-small" onClick={() => void downloadFile()} disabled={actionLoading === "file"} type="button">{actionLoading === "file" ? <LoaderCircle className="spin" size={15} /> : <FileDown size={15} />} Télécharger le fichier</button> : null}
          <button className="action-button" onClick={() => void shareResource()} disabled={shareState === "sharing"} type="button">{shareState === "sharing" ? <LoaderCircle className="spin" size={15} /> : <Share2 size={15} />} {shareState === "sharing" ? "Préparation…" : "Partager"}</button>
          <button className={`action-button ${liked ? "action-button-active" : ""}`} onClick={() => void toggleLike()} disabled={actionLoading === "like"} type="button"><Heart size={15} fill={liked ? "currentColor" : "none"} /> {likeCount}</button>
          <button className={`action-button ${saved ? "action-button-active" : ""}`} onClick={() => void toggleSave()} disabled={actionLoading === "save"} type="button"><Bookmark size={15} fill={saved ? "currentColor" : "none"} /> {saved ? "Enregistré" : "Garder"}</button>
          <button className="action-button" onClick={() => setReporting((value) => !value)} type="button"><Flag size={15} /> Signaler</button>
          {resource.author_id === currentUserId ? <><Link className="action-button" href={`/resources/${resource.id}/edit`}><Pencil size={15} /> Modifier</Link><button className="action-button" onClick={() => void deleteResource()} disabled={actionLoading === "delete"} type="button"><Trash2 size={15} /> Supprimer</button></> : null}
        </div>
        {shareState === "success" ? <p className="form-success" role="status" style={{ marginTop: "12px" }}>{shareMethod === "clipboard" ? "Le lien de la ressource a été copié." : "La ressource est prête à être partagée."}</p> : null}
        {shareState === "error" ? <p className="form-error" role="alert" style={{ marginTop: "12px" }}>Le lien n’a pas pu être partagé depuis cet appareil.</p> : null}
        {reporting ? (
          <form className="comment-form" onSubmit={(event) => void submitReport(event)} style={{ marginTop: "18px" }}>
            <label className="field-hint" htmlFor="reportReason">Qu’est-ce qui pose problème ?</label>
            <textarea id="reportReason" value={reportReason} onChange={(event) => setReportReason(event.target.value)} placeholder="Lien mort, contenu inapproprié, erreur…" />
            <button className="button button-secondary button-small" type="submit">Envoyer le signalement</button>
          </form>
        ) : null}
        {reportMessage ? <p className="form-success" style={{ marginTop: "16px" }}>{reportMessage}</p> : null}

        <section className="comments-section" aria-labelledby="comments-title">
          <h2 id="comments-title"><MessageCircle size={20} style={{ verticalAlign: "-3px", marginRight: "6px" }} /> Retours de la promo ({formatMetric(commentCount)})</h2>
          <form className="comment-form" onSubmit={(event) => void submitComment(event)}>
            <textarea value={commentBody} onChange={(event) => setCommentBody(event.target.value)} placeholder="Une précision, une correction ou un conseil pour les suivants…" aria-label="Votre commentaire" />
            <div className="inline-actions" style={{ justifyContent: "space-between" }}>
              {commentError ? <span className="field-error" role="alert">{commentError}</span> : <span className="field-hint">Soyez précis et bienveillant.</span>}
              <button className="button button-secondary button-small" disabled={actionLoading === "comment"} type="submit">{actionLoading === "comment" ? <LoaderCircle className="spin" size={15} /> : <Check size={15} />} Publier</button>
            </div>
          </form>
          {socialLoading ? (
            <div className="field-hint"><LoaderCircle className="spin" size={15} /> Chargement des retours…</div>
          ) : commentsLoadError && comments.length === 0 ? (
            <p className="form-error" role="alert">{commentsLoadError}</p>
          ) : comments.length === 0 ? (
            <p className="field-hint">Pas encore de retour. Le premier commentaire peut faire gagner du temps à toute une promo.</p>
          ) : (
            <>
              {comments.map((comment) => <Comment
                key={comment.id}
                comment={comment}
                isOwner={comment.author_id === currentUserId}
                isEditing={editingCommentId === comment.id}
                editingBody={editingBody}
                editError={editingCommentId === comment.id ? editCommentError : null}
                busy={actionLoading === "edit-comment" || actionLoading === "delete-comment"}
                onStartEditing={() => startEditingComment(comment)}
                onCancelEditing={cancelEditingComment}
                onEditingBodyChange={setEditingBody}
                onSaveEdit={(event) => void saveCommentEdit(event)}
                onDelete={() => void deleteComment(comment)}
              />)}
              {commentsLoadError ? <p className="form-error" role="alert">{commentsLoadError}</p> : null}
              {hasMoreComments ? (
                <div className="load-more-wrap">
                  <button className="button button-secondary" disabled={loadingMoreComments} onClick={() => void loadMoreComments()} type="button">
                    {loadingMoreComments ? <LoaderCircle className="spin" size={16} /> : null}
                    {loadingMoreComments ? "Chargement…" : `Charger les ${COMMENT_PAGE_SIZE} suivants`}
                  </button>
                  <p className="field-hint">Les retours suivants restent disponibles en continuant le chargement.</p>
                </div>
              ) : null}
            </>
          )}
        </section>
      </article>

      <aside className="side-card">
        <h2>À propos du partage</h2>
          <div className="profile-card-top">
            <span className="avatar">{initials(author?.display_name ?? "Étudiant")}</span>
            <div><strong>{author?.display_name ?? "Étudiant"}</strong><small>{author?.programme ?? "Membre de la communauté"}</small></div>
          </div>
          {author ? <Link className="member-profile-link" href={`/members/${author.id}`}>Voir le profil de cet étudiant</Link> : null}
        <ul className="side-list">
          <li><Check size={16} /> Ce support a été déposé volontairement par un étudiant.</li>
          <li><MessageCircle size={16} /> Ajoutez un retour si vous repérez une mise à jour utile.</li>
          <li><Flag size={16} /> Signalez les liens morts ou les contenus qui n’ont rien à faire ici.</li>
        </ul>
        <Link className="button button-secondary button-small" style={{ width: "100%", marginTop: "20px" }} href="/">Voir d’autres ressources</Link>
      </aside>
    </div>
  );
}

type CommentProps = {
  comment: ResourceComment;
  isOwner: boolean;
  isEditing: boolean;
  editingBody: string;
  editError: string | null;
  busy: boolean;
  onStartEditing: () => void;
  onCancelEditing: () => void;
  onEditingBodyChange: (value: string) => void;
  onSaveEdit: (event: React.FormEvent<HTMLFormElement>) => void;
  onDelete: () => void;
};

function Comment({ comment, isOwner, isEditing, editingBody, editError, busy, onStartEditing, onCancelEditing, onEditingBodyChange, onSaveEdit, onDelete }: CommentProps) {
  const name = comment.author?.display_name ?? "Étudiant";
  return (
    <article className="comment">
      <div className="comment-top"><span className="avatar">{initials(name)}</span><strong>{name}</strong><time dateTime={comment.updated_at}>{formatDate(comment.created_at)}{wasEdited(comment.created_at, comment.updated_at) ? " · modifié" : ""}</time></div>
      {isEditing ? (
        <form className="comment-edit-form" onSubmit={onSaveEdit}>
          <textarea value={editingBody} onChange={(event) => onEditingBodyChange(event.target.value)} aria-label="Modifier votre commentaire" autoFocus />
          <div className="inline-actions">
            {editError ? <span className="field-error" role="alert">{editError}</span> : null}
            <button className="button button-quiet button-small" onClick={onCancelEditing} type="button">Annuler</button>
            <button className="button button-secondary button-small" disabled={busy} type="submit">{busy ? <LoaderCircle className="spin" size={15} /> : <Check size={15} />} Enregistrer</button>
          </div>
        </form>
      ) : (
        <>
          <p>{comment.body}</p>
          {isOwner ? <div className="comment-actions"><button className="text-button" onClick={onStartEditing} disabled={busy} type="button">Modifier</button><button className="text-button comment-delete-button" onClick={onDelete} disabled={busy} type="button">Supprimer</button></div> : null}
        </>
      )}
    </article>
  );
}
