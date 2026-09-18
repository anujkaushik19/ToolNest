import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
} from "@nestjs/common";

const GOTENBERG_URL = process.env.GOTENBERG_URL || "http://gotenberg:3000";
const PDF_WORKER_URL = process.env.PDF_WORKER_URL || "http://pdf-worker:8000";

@Injectable()
export class ConvertService {
  private readonly logger = new Logger(ConvertService.name);

  // Convert an Office/OpenDocument file to PDF via headless LibreOffice
  // (Gotenberg). Nothing is written to disk — the buffer is streamed through.
  async officeToPdf(buffer: Buffer, filename: string): Promise<Buffer> {
    const form = new FormData();
    form.append("files", new Blob([new Uint8Array(buffer)]), filename);

    let resp: Response;
    try {
      resp = await fetch(`${GOTENBERG_URL}/forms/libreoffice/convert`, {
        method: "POST",
        body: form,
      });
    } catch (err) {
      this.logger.error(`Gotenberg unreachable: ${String(err)}`);
      throw new InternalServerErrorException(
        "Conversion service is unavailable."
      );
    }

    if (!resp.ok) {
      this.logger.error(`Gotenberg returned ${resp.status}`);
      throw new InternalServerErrorException(
        `Conversion failed (${resp.status}).`
      );
    }

    const arr = await resp.arrayBuffer();
    return Buffer.from(arr);
  }

  // Convert a PDF into an editable Word (.docx) via the Python pdf2docx worker.
  async pdfToWord(buffer: Buffer, filename: string): Promise<Buffer> {
    const form = new FormData();
    form.append("file", new Blob([new Uint8Array(buffer)]), filename);

    let resp: Response;
    try {
      resp = await fetch(`${PDF_WORKER_URL}/pdf-to-word`, {
        method: "POST",
        body: form,
      });
    } catch (err) {
      this.logger.error(`PDF worker unreachable: ${String(err)}`);
      throw new InternalServerErrorException(
        "Conversion service is unavailable."
      );
    }

    if (!resp.ok) {
      // The worker returns a helpful message (e.g. scanned/corrupt PDF).
      let detail = `Conversion failed (${resp.status}).`;
      try {
        const j = (await resp.json()) as { detail?: string };
        if (j?.detail) detail = j.detail;
      } catch {
        /* non-JSON error body */
      }
      this.logger.error(`PDF worker returned ${resp.status}: ${detail}`);
      if (resp.status === 400 || resp.status === 413 || resp.status === 422) {
        throw new BadRequestException(detail);
      }
      throw new InternalServerErrorException(detail);
    }

    const arr = await resp.arrayBuffer();
    return Buffer.from(arr);
  }
}
