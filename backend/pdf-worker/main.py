"""Toolnest PDF worker.

A tiny internal HTTP service that turns a PDF into an editable Word (.docx)
document using pdf2docx (PyMuPDF for parsing, python-docx for output).
It is only reachable from the gateway on the internal Docker network — the
uploaded bytes live in a temp dir for the duration of one request and are
deleted immediately after.
"""

import os
import tempfile

from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.responses import Response
from pdf2docx import Converter

app = FastAPI(title="toolnest-pdf-worker")

MAX_MB = int(os.environ.get("MAX_FILE_MB", "50"))
DOCX_MIME = (
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
)


@app.get("/health")
def health():
    return {"status": "ok", "service": "toolnest-pdf-worker"}


@app.post("/pdf-to-word")
async def pdf_to_word(file: UploadFile = File(...)):
    data = await file.read()
    if not data:
        raise HTTPException(status_code=400, detail="Empty file.")
    if len(data) > MAX_MB * 1024 * 1024:
        raise HTTPException(status_code=413, detail="File too large.")
    if not (file.filename or "").lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Please upload a PDF file.")

    with tempfile.TemporaryDirectory() as tmp:
        pdf_path = os.path.join(tmp, "in.pdf")
        docx_path = os.path.join(tmp, "out.docx")
        with open(pdf_path, "wb") as f:
            f.write(data)

        try:
            cv = Converter(pdf_path)
            cv.convert(docx_path)  # all pages
            cv.close()
        except Exception as exc:  # noqa: BLE001 - surface a clean 422 to the gateway
            raise HTTPException(
                status_code=422,
                detail="Could not convert this PDF. It may be scanned or corrupted.",
            ) from exc

        with open(docx_path, "rb") as f:
            out = f.read()

    return Response(content=out, media_type=DOCX_MIME)
