import { logger, safeStringify } from "@/utils/logger";
import { handleErrorToast } from "@/utils/helpers";

const generateRandomFilename = () => {
  const now = new Date();
  const timestamp = now.toISOString().replace(/[-:T]/g, "").slice(0, 15); // YYYYMMDDHHMMSS

  const random = Math.floor(Math.random() * 100000)
    .toString()
    .padStart(5, "0");

  return `${timestamp}-${random}`;
};

const triggerFileDownload = async (
  res: Response
): Promise<{ filename: string; fullPath: string }> => {
  const fs = await import("@tauri-apps/plugin-fs");

  const blob = await res.blob();
  const arrayBuffer = await blob.arrayBuffer();

  const disposition = res.headers.get("Content-Disposition");
  let filename = generateRandomFilename();

  if (disposition && disposition.includes("filename=")) {
    const match = disposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
    if (match && match[1]) {
      filename = match[1].replace(/['"]/g, "");
    }
  }

  await fs.writeFile(filename, new Uint8Array(arrayBuffer), {
    baseDir: fs.BaseDirectory.Download,
  });

  // Return filename - fullPath will be resolved in openDownloadsFolder
  const fullPath = filename;

  return { filename, fullPath };
};

const openDownloadsFolder = async (
  downloadedFilename?: string
): Promise<void> => {
  try {
    const { revealItemInDir } = await import("@tauri-apps/plugin-opener");
    const fs = await import("@tauri-apps/plugin-fs");

    // Get a file in Downloads to use for revealing the folder
    let fileToUse = downloadedFilename;

    if (!fileToUse) {
      const files = await fs.readDir(".", {
        baseDir: fs.BaseDirectory.Download,
      });
      if (files.length > 0 && files[0].name) {
        fileToUse = files[0].name;
      }
    }

    if (!fileToUse) {
      throw new Error("No files found in Downloads folder");
    }

    try {
      // revealItemInDir may handle base directories directly
      await revealItemInDir(fileToUse);
    } catch {
      // Fall back to a hand-built absolute path
      const { homeDir } = await import("@tauri-apps/api/path");
      const home = await homeDir();

      const isWindows = navigator.platform.toLowerCase().includes("win");
      const separator = isWindows ? "\\" : "/";
      const downloadsDir = isWindows ? `${home}Downloads` : `${home}/Downloads`;
      const fullPath = `${downloadsDir}${separator}${fileToUse}`;

      await revealItemInDir(fullPath);
    }
  } catch (error) {
    void logger.error(`Failed to open Downloads folder: ${safeStringify(error)}`);
    handleErrorToast("Failed to open Downloads folder");
  }
};

export { triggerFileDownload, openDownloadsFolder };
