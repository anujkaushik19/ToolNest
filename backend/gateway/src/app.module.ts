import { Module } from "@nestjs/common";
import { ConvertModule } from "./convert/convert.module";
import { PdfToolsModule } from "./pdftools/pdftools.module";
import { HealthController } from "./health.controller";

@Module({
  imports: [ConvertModule, PdfToolsModule],
  controllers: [HealthController],
})
export class AppModule {}
