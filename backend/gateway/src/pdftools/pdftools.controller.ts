import {
  BadRequestException,
  Body,
  Controller,
  Post,
  Res,
  UploadedFile,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import type { Response } from "express";
import { PdfToolsService } from "./pdftools.service";

const MAX_MB = Number(process.env.MAX_FILE_MB) || 100;
const ALLOWED_PDF = /\.pdf$/i;
const LEVELS = new Set(["screen", "ebook", "printer"]);

function fileOpts() {
  return { limits: { fileSize: MAX_MB * 1024 * 1024 } };
}

function baseName(name: string): string {
  return name.replace(/\.[^.]+$/, "") || "document";
}

@Controller("api/pdf")
export class PdfToolsController {
  constructor(private readonly pdf: PdfToolsService) {}

  @Post("compress")
  @UseInterceptors(FileInterceptor("file", fileOpts()))
  async compress(
    @UploadedFile() file: Express.Multer.File | undefined,
    @Body("level") level: string | undefined,
    @Res() res: Response
  ) {
    if (!file) throw new BadRequestException("No file uploaded.");
    if (!ALLOWED_PDF.test(file.originalname))
      throw new BadRequestException("Please upload a PDF file.");
    const lvl = LEVELS.has(level ?? "") ? (level as string) : "ebook";

    const out = await this.pdf.run("compress", file.buffer, file.originalname, {
      level: lvl,
    });
    send(res, out, `${baseName(file.originalname)}-compressed.pdf`);
  }

  @Post("protect")
  @UseInterceptors(FileInterceptor("file", fileOpts()))
  async protect(
    @UploadedFile() file: Express.Multer.File | undefined,
    @Body("password") password: string | undefined,
    @Res() res: Response
  ) {
    if (!file) throw new BadRequestException("No file uploaded.");
    if (!ALLOWED_PDF.test(file.originalname))
      throw new BadRequestException("Please upload a PDF file.");
    if (!password) throw new BadRequestException("A password is required.");

    const out = await this.pdf.run("protect", file.buffer, file.originalname, {
      password,
    });
    send(res, out, `${baseName(file.originalname)}-protected.pdf`);
  }

  @Post("unlock")
  @UseInterceptors(FileInterceptor("file", fileOpts()))
  async unlock(
    @UploadedFile() file: Express.Multer.File | undefined,
    @Body("password") password: string | undefined,
    @Res() res: Response
  ) {
    if (!file) throw new BadRequestException("No file uploaded.");
    if (!ALLOWED_PDF.test(file.originalname))
      throw new BadRequestException("Please upload a PDF file.");

    const out = await this.pdf.run("unlock", file.buffer, file.originalname, {
      password: password ?? "",
    });
    send(res, out, `${baseName(file.originalname)}-unlocked.pdf`);
  }
}

function send(res: Response, pdf: Buffer, filename: string) {
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
  res.send(pdf);
}
