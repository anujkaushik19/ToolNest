import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
} from "@nestjs/common";

const PDF_TOOLS_URL = process.env.PDF_TOOLS_URL || "http://pdf-tools:8000";

@Injectable()
export class PdfToolsService {
  private readonly logger = new Logger(PdfToolsService.name);

  // Forward a multipart request to the ghostscript/qpdf worker and stream the
  // resulting PDF back. `fields` become extra form fields (level, password).
  async run(
    endpoint: "compress" | "protect" | "unlock",
    buffer: Buffer,
    filename: string,
    fields: Record<string, string> = {}
  ): Promise<Buffer> {
    const form = new FormData();
    form.append("file", new Blob([new Uint8Array(buffer)]), filename);
    for (const [k, v] of Object.entries(fields)) form.append(k, v);

    let resp: Response;
    try {
      resp = await fetch(`${PDF_TOOLS_URL}/${endpoint}`, {
        method: "POST",
        body: form,
      });
    } catch (err) {
      this.logger.error(`PDF-tools worker unreachable: ${String(err)}`);
      throw new InternalServerErrorException(
        "PDF service is unavailable."
      );
    }

    if (!resp.ok) {
      let detail = `Operation failed (${resp.status}).`;
      try {
        const j = (await resp.json()) as { detail?: string };
        if (j?.detail) detail = j.detail;
      } catch {
        /* non-JSON error body */
      }
      this.logger.error(`PDF-tools worker ${endpoint} -> ${resp.status}: ${detail}`);
      if (resp.status >= 400 && resp.status < 500) {
        throw new BadRequestException(detail);
      }
      throw new InternalServerErrorException(detail);
    }

    return Buffer.from(await resp.arrayBuffer());
  }
}
