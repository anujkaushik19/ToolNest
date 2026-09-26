"""BizNest PDF-tools worker.

Internal HTTP service that shells out to two battle-tested CLIs:
  - ghostscript (gs) -> shrink/compress a PDF
  - qpdf             -> add or remove a password (encrypt/decrypt)

Only reachable from the gateway on the private Docker network. Uploaded bytes
live in a per-request temp dir and are deleted the moment the request ends.
"""

import os
import subprocess
import tempfile

from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.responses import Response

app = FastAPI(title="biznest-pdf-tools-worker")

MAX_MB = int(os.environ.get("MAX_FILE_MB", "100"))
PDF_MIME = "application/pdf"

# Ghostscript quality presets -> its -dPDFSETTINGS values.
GS_PRESETS = {
    "screen": "/screen",    # smallest, 72 dpi
    "ebook": "/ebook",      # balanced, 150 dpi
    "printer": "/printer",  # light, 300 dpi
}


@app.get("/health")
def health():
    return {"status": "ok", "service": "biznest-pdf-tools-worker"}


async def _read_pdf(file: UploadFile) -> bytes:
    data = await file.read()
    if not data:
        raise HTTPException(status_code=400, detail="Empty file.")
    if len(data) > MAX_MB * 1024 * 1024:
        raise HTTPException(status_code=413, detail="File too large.")
    if not (file.filename or "").lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Please upload a PDF file.")
    return data


@app.post("/compress")
async def compress(file: UploadFile = File(...), level: str = Form("ebook")):
    data = await _read_pdf(file)
    preset = GS_PRESETS.get(level, "/ebook")

    with tempfile.TemporaryDirectory() as tmp:
        src = os.path.join(tmp, "in.pdf")
        out = os.path.join(tmp, "out.pdf")
        with open(src, "wb") as f:
            f.write(data)

        cmd = [
            "gs",
            "-sDEVICE=pdfwrite",
            "-dCompatibilityLevel=1.5",
            f"-dPDFSETTINGS={preset}",
            "-dNOPAUSE",
            "-dQUIET",
            "-dBATCH",
            "-dDetectDuplicateImages=true",
            f"-sOutputFile={out}",
            src,
        ]
        try:
            subprocess.run(cmd, check=True, timeout=180, capture_output=True)
        except subprocess.CalledProcessError as exc:
            raise HTTPException(
                status_code=422,
                detail="Could not compress this PDF (it may be corrupted).",
            ) from exc
        except subprocess.TimeoutExpired as exc:
            raise HTTPException(
                status_code=504, detail="Compression timed out."
            ) from exc

        with open(out, "rb") as f:
            result = f.read()

    return Response(content=result, media_type=PDF_MIME)


@app.post("/protect")
async def protect(file: UploadFile = File(...), password: str = Form(...)):
    if not password:
        raise HTTPException(status_code=400, detail="A password is required.")
    data = await _read_pdf(file)

    with tempfile.TemporaryDirectory() as tmp:
        src = os.path.join(tmp, "in.pdf")
        out = os.path.join(tmp, "out.pdf")
        with open(src, "wb") as f:
            f.write(data)

        # 256-bit AES; same user/owner password keeps it simple for the user.
        cmd = [
            "qpdf",
            "--encrypt",
            password,
            password,
            "256",
            "--",
            src,
            out,
        ]
        try:
            subprocess.run(cmd, check=True, timeout=120, capture_output=True)
        except subprocess.CalledProcessError as exc:
            raise HTTPException(
                status_code=422, detail="Could not protect this PDF."
            ) from exc

        with open(out, "rb") as f:
            result = f.read()

    return Response(content=result, media_type=PDF_MIME)


@app.post("/unlock")
async def unlock(file: UploadFile = File(...), password: str = Form(...)):
    data = await _read_pdf(file)

    with tempfile.TemporaryDirectory() as tmp:
        src = os.path.join(tmp, "in.pdf")
        out = os.path.join(tmp, "out.pdf")
        with open(src, "wb") as f:
            f.write(data)

        cmd = ["qpdf", f"--password={password}", "--decrypt", src, out]
        try:
            subprocess.run(cmd, check=True, timeout=120, capture_output=True)
        except subprocess.CalledProcessError as exc:
            # qpdf exit code 2 = wrong password / cannot open.
            raise HTTPException(
                status_code=422,
                detail="Wrong password, or this PDF isn't encrypted.",
            ) from exc

        with open(out, "rb") as f:
            result = f.read()

    return Response(content=result, media_type=PDF_MIME)
