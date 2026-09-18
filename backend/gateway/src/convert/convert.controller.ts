import {
  BadRequestException,
  Controller,
  Post,
  Res,
  UploadedFile,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import type { Response } from "express";
import { ConvertService } from "./convert.service";

const MAX_MB = Number(process.env.MAX_FILE_MB) || 50;
// Office / OpenDocument formats LibreOffice can render to PDF.
const ALLOWED = /\.(docx?|xlsx?|pptx?|odt|ods|odp|rtf|txt|csv)$/i;
const ALLOWED_PDF = /\.pdf$/i;
const DOCX_MIME =
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

@Controller("api/convert")
export class ConvertController {
  constructor(private readonly convert: ConvertService) {}

  @Post("office")
  @UseInterceptors(
    FileInterceptor("file", {
      limits: { fileSize: MAX_MB * 1024 * 1024 },
    })
  )
  async office(
    @UploadedFile() file: Express.Multer.File | undefined,
    @Res() res: Response
  ) {
    if (!file) throw new BadRequestException("No file uploaded.");
    if (!ALLOWED.test(file.originalname)) {
      throw new BadRequestException("Unsupported file type.");
    }

    const pdf = await this.convert.officeToPdf(file.buffer, file.originalname);
    const base = file.originalname.replace(/\.[^.]+$/, "") || "document";

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${base}.pdf"`);
    res.send(pdf);
  }

  @Post("pdf-to-word")
  @UseInterceptors(
    FileInterceptor("file", {
      limits: { fileSize: MAX_MB * 1024 * 1024 },
    })
  )
  async pdfToWord(
    @UploadedFile() file: Express.Multer.File | undefined,
    @Res() res: Response
  ) {
    if (!file) throw new BadRequestException("No file uploaded.");
    if (!ALLOWED_PDF.test(file.originalname)) {
      throw new BadRequestException("Please upload a PDF file.");
    }

    const docx = await this.convert.pdfToWord(file.buffer, file.originalname);
    const base = file.originalname.replace(/\.[^.]+$/, "") || "document";

    res.setHeader("Content-Type", DOCX_MIME);
    res.setHeader("Content-Disposition", `attachment; filename="${base}.docx"`);
    res.send(docx);
  }
}
