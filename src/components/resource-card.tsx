import Link from "next/link";
import { ExternalLink, FileText } from "lucide-react";
import { formatDate, initials } from "@/lib/format";
import { RESOURCE_KIND_LABELS, type ResourceWithAuthor } from "@/lib/types";

export function ResourceCard({ resource }: { resource: ResourceWithAuthor }) {
  const authorName = resource.author?.display_name ?? "Étudiant";

  return (
    <Link className="resource-card" href={`/resources/${resource.id}`}>
      <div className="resource-card-top">
        <span className="kind-label">{RESOURCE_KIND_LABELS[resource.kind]}</span>
        <span className="source-indicator">
          {resource.file_path ? <FileText size={14} /> : <ExternalLink size={14} />}
          {resource.file_path ? "Fichier" : "Lien"}
        </span>
      </div>
      <h3>{resource.title}</h3>
      <p>{resource.description}</p>
      <div className="resource-card-footer">
        <span>{resource.subject} · {resource.study_year}</span>
        <span title={authorName}>{initials(authorName)} · {formatDate(resource.created_at)}</span>
      </div>
    </Link>
  );
}

