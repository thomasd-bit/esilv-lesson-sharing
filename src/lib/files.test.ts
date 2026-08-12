import { describe, expect, it } from "vitest";
import { resourceFileError, resourceFilePath } from "@/lib/files";

describe("validation des fichiers partagés", () => {
  it("construit un chemin de fichier stable et lisible", () => {
    expect(resourceFilePath("user-1", "file-1", "fiche résumé final.pdf")).toBe("user-1/file-1-fiche-resume-final.pdf");
  });

  it("accepte un PDF connu sous la limite", () => {
    expect(resourceFileError({ name: "annale.pdf", size: 200_000, type: "application/pdf" })).toBeNull();
  });

  it("accepte un type vide si l’extension est reconnue", () => {
    expect(resourceFileError({ name: "support.docx", size: 200_000, type: "" })).toBeNull();
  });

  it("refuse un fichier trop volumineux ou un format incohérent", () => {
    expect(resourceFileError({ name: "archive.zip", size: 10 * 1024 * 1024 + 1, type: "application/zip" })).toContain("10 Mo");
    expect(resourceFileError({ name: "script.exe", size: 200_000, type: "application/octet-stream" })).toContain("format");
    expect(resourceFileError({ name: "notes.pdf", size: 200_000, type: "text/plain" })).toContain("format");
  });
});
