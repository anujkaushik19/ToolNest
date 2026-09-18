import { Module } from "@nestjs/common";
import { PdfToolsController } from "./pdftools.controller";
import { PdfToolsService } from "./pdftools.service";

@Module({
  controllers: [PdfToolsController],
  providers: [PdfToolsService],
})
export class PdfToolsModule {}
